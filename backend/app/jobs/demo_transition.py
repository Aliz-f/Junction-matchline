"""Apply explicit, manifest-defined demo scenarios; never infer results from time."""
from __future__ import annotations

import argparse
import asyncio
from datetime import datetime
from types import SimpleNamespace

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.db.football_models import Match, RoomRecord, RuntimeState
from app.db.session import configure_database
from app.seed.demo_accounts import seed_demo_accounts
from app.seed.loader import load_demo_manifest, scenario_data
from app.seed.service import seed_demo
from app.services.demo_transition_hooks import (
    DemoTransitionHook,
    PredictionSettlementHook,
)

_PREDECESSORS = {
    "upcoming_live": {"baseline", "upcoming_live"},
    "upcoming_finished": {"upcoming_live", "upcoming_finished"},
}


async def apply_scenario_to_session(
    session: AsyncSession, name: str, hook: DemoTransitionHook | None = None
) -> None:
    """Apply a scenario within the caller transaction for CLI and integration tests."""
    scenario = scenario_data(name)
    hook = hook or PredictionSettlementHook()
    if name == "baseline":
        await seed_demo(session, commit=False)
        return

    state = await session.scalar(select(RuntimeState).where(RuntimeState.id == 1).with_for_update())
    if state is None:
        raise RuntimeError("demo state is not seeded")
    if state.scenario_name not in _PREDECESSORS[name]:
        raise RuntimeError(f"cannot transition from {state.scenario_name} to {name}; reset baseline first")

    state.demo_clock_utc = datetime.fromisoformat(scenario["server_now_utc"].replace("Z", "+00:00"))
    state.scenario_name = name
    state.scenario_revision += 1
    fixtures_by_key = {item["key"]: item["id"] for item in load_demo_manifest()["fixtures"]}
    transitioned_match_ids: list[str] = []
    for key, change in scenario["fixture_states"].items():
        fixture_id = fixtures_by_key[key]
        match = await session.get(Match, fixture_id)
        if match is None:
            raise RuntimeError(f"seeded fixture missing: {key}")
        match.status = change["status"]
        match.home_score, match.away_score = change["score"]["home"], change["score"]["away"]
        transitioned_match_ids.append(fixture_id)
        if change["status"] == "FINISHED":
            templates = await session.scalars(
                select(RoomRecord).where(
                    RoomRecord.match_id == fixture_id,
                    RoomRecord.kind == "POST_MATCH",
                    RoomRecord.status == "HIDDEN",
                )
            )
            for room in templates:
                room.status = "OPEN"
    await hook.after_transition(session, name, transitioned_match_ids)


async def apply_scenario(name: str, hook: DemoTransitionHook | None = None) -> None:
    settings = get_settings()
    if settings.app_env not in {"development", "test"} or settings.sports_provider != "demo":
        raise RuntimeError("demo transitions are permitted only in development/test demo mode")
    holder = SimpleNamespace(state=SimpleNamespace())
    configure_database(holder, settings.database_url)
    async with holder.state.session_factory() as session:
        await apply_scenario_to_session(session, name, hook=hook or PredictionSettlementHook())
        if name == "baseline":
            await seed_demo_accounts(session, settings)
        await session.commit()


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--scenario", choices=("baseline", "upcoming_live", "upcoming_finished"), required=True)
    asyncio.run(apply_scenario(parser.parse_args().scenario))
