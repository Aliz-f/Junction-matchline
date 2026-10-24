"""Apply explicit, manifest-defined demo scenarios; never infer results from time."""
from __future__ import annotations

import argparse
import asyncio
from datetime import datetime
from types import SimpleNamespace

from sqlalchemy import select

from app.core.config import get_settings
from app.db.football_models import Match, RuntimeState
from app.db.session import configure_database
from app.seed.loader import scenario_data


async def apply_scenario(name: str) -> None:
    settings = get_settings()
    if settings.app_env not in {"development", "test"} or settings.sports_provider != "demo":
        raise RuntimeError("demo transitions are permitted only in development/test demo mode")
    holder = SimpleNamespace(state=SimpleNamespace())
    configure_database(holder, settings.database_url)
    scenario = scenario_data(name)
    async with holder.state.session_factory() as session:
        state = await session.scalar(select(RuntimeState).where(RuntimeState.id == 1).with_for_update())
        if state is None:
            raise RuntimeError("demo state is not seeded")
        state.demo_clock_utc = datetime.fromisoformat(scenario["server_now_utc"].replace("Z", "+00:00"))
        state.scenario_name = name
        state.scenario_revision += 1
        for key, change in scenario["fixture_states"].items():
            fixture_id = next(item["id"] for item in __import__("app.seed.loader", fromlist=["load_demo_manifest"]).load_demo_manifest()["fixtures"] if item["key"] == key)
            match = await session.get(Match, fixture_id)
            if match is None: raise RuntimeError(f"seeded fixture missing: {key}")
            match.status = change["status"]
            match.home_score, match.away_score = change["score"]["home"], change["score"]["away"]
        await session.commit()


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--scenario", choices=("baseline", "upcoming_live", "upcoming_finished"), required=True)
    asyncio.run(apply_scenario(parser.parse_args().scenario))
