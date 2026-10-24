from __future__ import annotations

import asyncio
from copy import deepcopy
from datetime import UTC, date, datetime
from pathlib import Path

from fastapi.testclient import TestClient

from app.core.config import Settings
from app.db.models import Base
from app.jobs.demo_transition import apply_scenario_to_session
from app.main import create_app
from app.seed.service import seed_demo
from app.services.demo_football import (
    illumination_state,
    manifest,
    select_fixtures,
    stadium_map,
)


def client() -> TestClient:
    return TestClient(create_app(Settings(database_url="sqlite+aiosqlite:///:memory:")))


def test_journey_map_and_detail_share_the_manifest_match_id() -> None:
    match_id = "30000000-0000-4000-8000-000000000001"
    team_id = "20000000-0000-4000-8000-000000000001"
    with client() as api:
        journey = api.get(f"/api/v1/journey?team_id={team_id}&season=2026")
        detail = api.get(f"/api/v1/matches/{match_id}")
        stadiums = api.get("/api/v1/map/stadiums?competition=PL&season=2026&matchday=11")
    assert journey.status_code == detail.status_code == stadiums.status_code == 200
    assert match_id in {item["id"] for item in journey.json()["items"]}
    assert detail.json()["id"] == match_id
    assert match_id in {item["match"]["id"] for venue in stadiums.json()["stadiums"] for item in venue["fixtures"]}


def test_map_requires_exactly_one_selector() -> None:
    with client() as api:
        neither = api.get("/api/v1/map/stadiums?competition=PL&season=2026")
        both = api.get("/api/v1/map/stadiums?competition=PL&season=2026&matchday=11&date=2026-11-01")
    assert neither.status_code == both.status_code == 422


def test_matches_have_stable_cursor_pagination() -> None:
    with client() as api:
        first = api.get("/api/v1/matches?competition=PL&limit=2")
        second = api.get(f"/api/v1/matches?competition=PL&limit=2&cursor={first.json()['next_cursor']}")
        invalid = api.get("/api/v1/matches?competition=PL&cursor=not-a-cursor")
    assert first.status_code == second.status_code == 200
    assert first.json()["next_cursor"] is not None
    assert {item["id"] for item in first.json()["items"]}.isdisjoint(
        {item["id"] for item in second.json()["items"]}
    )
    assert invalid.status_code == 422


def test_future_scheduled_fixture_is_upcoming_not_live() -> None:
    with client() as api:
        response = api.get("/api/v1/map/stadiums?competition=PL&season=2026&matchday=11")
    assert response.status_code == 200
    venue = next(item for item in response.json()["stadiums"] if item["fixtures"])
    assert venue["illumination_state"] == "UPCOMING_ROUND"


def test_london_date_selection_is_dst_safe_at_both_sides_of_fallback() -> None:
    fixtures = [
        {"id": "before", "matchday": 1, "kickoff_at": "2026-10-24T23:30:00Z"},
        {"id": "after", "matchday": 2, "kickoff_at": "2026-10-25T23:30:00Z"},
    ]
    selected = select_fixtures(fixtures, matchday=None, london_date=date(2026, 10, 25))
    assert [fixture["id"] for fixture in selected] == ["before", "after"]


def test_unverified_or_missing_coordinates_are_list_only_unmapped_matches() -> None:
    data = deepcopy(manifest())
    data["venues"][0]["coord_verified"] = False
    data["venues"][0]["lat"] = None
    result = stadium_map(data, matchday=11, london_date=None)
    assert result.stadiums
    assert [(str(item.match.id), item.reason) for item in result.unmapped_matches] == [
        ("30000000-0000-4000-8000-000000000001", "VENUE_COORDINATES_UNVERIFIED")
    ]


def test_clock_never_promotes_a_scheduled_fixture_to_live() -> None:
    fixture = {"status": "SCHEDULED", "kickoff_at": "2026-10-24T11:00:00Z"}
    now = datetime(2026, 10, 24, 12, tzinfo=UTC)
    assert illumination_state([fixture], server_now_utc=now) == "UNKNOWN"


def test_map_keeps_inactive_home_venues_and_neutral_and_mixed_venue_semantics() -> None:
    data = deepcopy(manifest())
    neutral_id = "60000000-0000-4000-8000-000000000001"
    shared_id = "60000000-0000-4000-8000-000000000002"
    data["venues"].extend(
        [
            {
                "id": neutral_id,
                "name": "Verified Neutral Test Ground",
                "lat": 51.5,
                "lng": -0.12,
                "coord_verified": True,
                "home_team_ids": [],
            },
            {
                "id": shared_id,
                "name": "Verified Shared Test Ground",
                "lat": 51.51,
                "lng": -0.13,
                "coord_verified": True,
                "home_team_ids": [],
            },
        ]
    )
    finished = deepcopy(data["fixtures"][2])
    finished.update({"id": "50000000-0000-4000-8000-000000000003", "matchday": 20, "venue_id": shared_id})
    live = deepcopy(data["fixtures"][1])
    live.update({"id": "50000000-0000-4000-8000-000000000004", "matchday": 20, "venue_id": shared_id})
    neutral = deepcopy(data["fixtures"][0])
    neutral.update({"id": "50000000-0000-4000-8000-000000000002", "matchday": 19, "venue_id": neutral_id})
    data["fixtures"].extend([finished, live, neutral])

    mixed = stadium_map(data, matchday=20, london_date=None)
    shared = next(item for item in mixed.stadiums if str(item.venue_id) == shared_id)
    assert shared.illumination_state == "LIVE"
    assert {str(item.match.id) for item in shared.fixtures} == {str(finished["id"]), str(live["id"])}

    neutral_result = stadium_map(data, matchday=19, london_date=None)
    neutral_venue = next(item for item in neutral_result.stadiums if str(item.venue_id) == neutral_id)
    assert neutral_venue.home_team_ids == []
    assert any(item.illumination_state == "INACTIVE" for item in neutral_result.stadiums)


def test_http_reads_reflect_persisted_transition_and_runtime_state(tmp_path: Path) -> None:
    database_url = f"sqlite+aiosqlite:///{(tmp_path / 'scenario.db').as_posix()}"
    app = create_app(Settings(database_url=database_url))

    async def prepare() -> None:
        async with app.state.db_engine.begin() as connection:
            await connection.run_sync(Base.metadata.create_all)
        async with app.state.session_factory() as session:
            await seed_demo(session)
            await apply_scenario_to_session(session, "upcoming_live")
            await session.commit()

    asyncio.run(prepare())
    with TestClient(app) as api:
        detail = api.get("/api/v1/matches/30000000-0000-4000-8000-000000000001")
        map_response = api.get("/api/v1/map/stadiums?competition=PL&season=2026&matchday=11")
        meta = api.get("/api/v1/meta")
    asyncio.run(app.state.db_engine.dispose())

    assert detail.json()["status"] == "LIVE"
    selected_venue = next(item for item in map_response.json()["stadiums"] if item["fixtures"])
    assert selected_venue["illumination_state"] == "LIVE"
    assert meta.json()["server_now_utc"] == "2026-11-01T15:15:00Z"
    assert meta.json()["scenario_revision"] == 2
