"""BE-07 prediction lifecycle checks over the real persistence models."""
from __future__ import annotations

from collections.abc import AsyncIterator
from datetime import UTC, datetime
from uuid import UUID

import pytest
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.errors import ApiError
from app.db.football_models import PredictionRecord, PredictionRevision, RuntimeState
from app.db.models import Base, UserRecord
from app.jobs.demo_transition import apply_scenario_to_session
from app.schemas.contract import Outcome
from app.seed.service import seed_demo
from app.services.predictions import upsert_prediction

MATCH_ID = "30000000-0000-4000-8000-000000000001"


@pytest.fixture
async def database_session() -> AsyncIterator[AsyncSession]:
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)
    factory = async_sessionmaker(engine, expire_on_commit=False)
    async with factory() as session:
        yield session
    await engine.dispose()


async def user(session: AsyncSession) -> UserRecord:
    record = UserRecord(email="predictor@example.test", password_hash="test", display_name="Predictor")
    session.add(record)
    await session.commit()
    return record


@pytest.mark.asyncio
async def test_prediction_replay_edit_and_cutoff_are_authoritative(database_session: AsyncSession) -> None:
    await seed_demo(database_session)
    predictor = await user(database_session)
    key_one = UUID("80000000-0000-4000-8000-000000000001")
    first, status = await upsert_prediction(database_session, user=predictor, match_id=MATCH_ID, key=key_one,
        outcome=Outcome.HOME, home_score=2, away_score=1, fallback_now=datetime.now(UTC))
    replay, replay_status = await upsert_prediction(database_session, user=predictor, match_id=MATCH_ID, key=key_one,
        outcome=Outcome.HOME, home_score=2, away_score=1, fallback_now=datetime.now(UTC))
    edited, edit_status = await upsert_prediction(database_session, user=predictor, match_id=MATCH_ID,
        key=UUID("80000000-0000-4000-8000-000000000002"), outcome=Outcome.HOME, home_score=3, away_score=1,
        fallback_now=datetime.now(UTC))
    assert (status, replay_status, edit_status) == (201, 201, 200)
    assert replay == first
    assert edited.submitted_at >= first.submitted_at
    assert await database_session.scalar(select(func.count()).select_from(PredictionRevision)) == 2

    state = await database_session.get(RuntimeState, 1)
    assert state is not None
    state.demo_clock_utc = datetime(2026, 11, 1, 15, 0, tzinfo=UTC)
    await database_session.commit()
    with pytest.raises(ApiError, match="Predictions are closed"):
        await upsert_prediction(database_session, user=predictor, match_id=MATCH_ID,
            key=UUID("80000000-0000-4000-8000-000000000003"), outcome=Outcome.HOME, home_score=None, away_score=None,
            fallback_now=datetime.now(UTC))


@pytest.mark.asyncio
async def test_finished_transition_settles_once(database_session: AsyncSession) -> None:
    await seed_demo(database_session)
    predictor = await user(database_session)
    await upsert_prediction(database_session, user=predictor, match_id=MATCH_ID,
        key=UUID("80000000-0000-4000-8000-000000000004"), outcome=Outcome.HOME, home_score=2, away_score=1,
        fallback_now=datetime.now(UTC))
    await apply_scenario_to_session(database_session, "upcoming_live")
    await apply_scenario_to_session(database_session, "upcoming_finished")
    await database_session.commit()
    prediction = await database_session.scalar(select(PredictionRecord).where(PredictionRecord.user_id == predictor.id))
    assert prediction is not None
    assert (prediction.status, prediction.points, prediction.scored_at is not None) == ("SCORED", 5, True)
    await apply_scenario_to_session(database_session, "upcoming_finished")
    await database_session.commit()
    assert prediction.points == 5
