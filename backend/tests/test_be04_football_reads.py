from __future__ import annotations

from fastapi.testclient import TestClient

from app.core.config import Settings
from app.main import create_app


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


def test_future_scheduled_fixture_is_upcoming_not_live() -> None:
    with client() as api:
        response = api.get("/api/v1/map/stadiums?competition=PL&season=2026&matchday=11")
    assert response.status_code == 200
    assert response.json()["stadiums"][0]["illumination_state"] == "UPCOMING_ROUND"
