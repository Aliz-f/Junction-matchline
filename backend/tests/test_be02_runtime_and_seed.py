"""BE-02 persistence tests against a real async SQL database harness.

CI also runs the Alembic/PostgreSQL path; SQLite here keeps the deterministic
seed and state invariants cheap to exercise for every backend test run.
"""
from __future__ import annotations

from collections.abc import AsyncIterator, Sequence
from copy import deepcopy

import pytest
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.db.football_models import Match, PredictionRecord, RuntimeState
from app.db.models import Base, SessionRecord, UserRecord
from app.jobs.demo_transition import apply_scenario_to_session
from app.seed.loader import load_demo_manifest
from app.seed.service import seed_demo
from app.seed.validation import validate_demo_manifest
from app.services.demo_football import persisted_manifest
from app.services.demo_transition_hooks import DemoTransitionHook


@pytest.fixture
async def database_session() -> AsyncIterator[AsyncSession]:
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)
    factory = async_sessionmaker(engine, expire_on_commit=False)
    async with factory() as session:
        yield session
    await engine.dispose()


class Recorder(DemoTransitionHook):
    calls: list[tuple[str, tuple[str, ...]]]

    def __init__(self) -> None:
        self.calls = []

    async def after_transition(
        self, session: AsyncSession, scenario_name: str, transitioned_match_ids: Sequence[str]
    ) -> None:
        del session
        self.calls.append((scenario_name, tuple(transitioned_match_ids)))


@pytest.mark.asyncio
async def test_seed_transition_and_runtime_state_are_persisted(database_session: AsyncSession) -> None:
    await seed_demo(database_session)
    baseline = await database_session.get(RuntimeState, 1)
    assert baseline is not None
    assert baseline.scenario_name == "baseline"
    assert baseline.demo_clock_utc.isoformat().startswith("2026-10-24T12:00:00")
    baseline_revision = baseline.scenario_revision

    hook = Recorder()
    await apply_scenario_to_session(database_session, "upcoming_live", hook=hook)
    await database_session.commit()
    state = await database_session.get(RuntimeState, 1)
    upcoming = await database_session.get(Match, "30000000-0000-4000-8000-000000000001")
    projection = await persisted_manifest(database_session)

    assert state is not None and state.scenario_name == "upcoming_live"
    assert state.scenario_revision == baseline_revision + 1
    assert upcoming is not None and upcoming.status == "LIVE"
    assert hook.calls == [("upcoming_live", ("30000000-0000-4000-8000-000000000002", "30000000-0000-4000-8000-000000000001", "30000000-0000-4000-8000-000000000003"))]
    assert projection is not None
    assert next(item for item in projection["fixtures"] if item["id"] == upcoming.id)["status"] == "LIVE"


@pytest.mark.asyncio
async def test_clock_change_never_changes_match_status(database_session: AsyncSession) -> None:
    await seed_demo(database_session)
    fixture = await database_session.get(Match, "30000000-0000-4000-8000-000000000001")
    state = await database_session.get(RuntimeState, 1)
    assert fixture is not None and state is not None
    before = fixture.status
    state.demo_clock_utc = fixture.kickoff_at
    await database_session.commit()
    await database_session.refresh(fixture)
    assert before == fixture.status == "SCHEDULED"


@pytest.mark.asyncio
async def test_baseline_reset_removes_sessions_and_user_bound_audit_rows(database_session: AsyncSession) -> None:
    await seed_demo(database_session)
    user = UserRecord(email="reset@example.test", password_hash="test", display_name="Reset")
    database_session.add(user)
    await database_session.flush()
    state = await database_session.get(RuntimeState, 1)
    assert state is not None
    database_session.add(
        SessionRecord(user_id=user.id, token_sha256="a" * 64, expires_at=state.demo_clock_utc)
    )
    await database_session.commit()

    await seed_demo(database_session)
    assert (await database_session.scalar(select(UserRecord).where(UserRecord.email == "reset@example.test"))) is None
    assert (await database_session.scalar(select(SessionRecord).where(SessionRecord.user_id == user.id))) is None


@pytest.mark.asyncio
async def test_prediction_direction_constraint_is_enforced_by_database(database_session: AsyncSession) -> None:
    await seed_demo(database_session)
    user = UserRecord(email="prediction@example.test", password_hash="test", display_name="Prediction")
    database_session.add(user)
    await database_session.flush()
    database_session.add(
        PredictionRecord(
            user_id=user.id,
            match_id="30000000-0000-4000-8000-000000000001",
            outcome="HOME",
            home_score=0,
            away_score=2,
            status="PENDING",
            points=None,
        )
    )
    with pytest.raises(IntegrityError):
        await database_session.commit()
    await database_session.rollback()


@pytest.mark.asyncio
async def test_match_status_score_constraint_is_enforced_by_database(database_session: AsyncSession) -> None:
    await seed_demo(database_session)
    fixture = await database_session.get(Match, "30000000-0000-4000-8000-000000000001")
    assert fixture is not None
    fixture.status = "FINISHED"
    with pytest.raises(IntegrityError):
        await database_session.commit()
    await database_session.rollback()


def test_seed_validation_rejects_duplicate_team_participation() -> None:
    data = deepcopy(load_demo_manifest())
    duplicate = deepcopy(data["fixtures"][0])
    duplicate["id"] = "30000000-0000-4000-8000-000000000099"
    duplicate["away_team_id"] = "20000000-0000-4000-8000-000000000004"
    data["fixtures"].append(duplicate)
    with pytest.raises(ValueError, match="duplicate team participation"):
        validate_demo_manifest(data)
