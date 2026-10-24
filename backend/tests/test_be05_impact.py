from __future__ import annotations

from copy import deepcopy
from datetime import UTC, datetime
from typing import Any

import pytest
from fastapi.testclient import TestClient

from app.api.v1.impact import cursor_value, parse_cursor
from app.core.config import Settings
from app.core.errors import ApiError
from app.main import create_app
from app.services.demo_football import manifest
from app.services.impact import impact_insight


def row(team_id: str, points: int, position: int | None = None) -> dict[str, object]:
    return {
        "team_id": team_id,
        "position": position,
        "played": 10,
        "won": 0,
        "drawn": 0,
        "lost": 0,
        "goals_for": 0,
        "goals_against": 0,
        "goal_difference": 0,
        "points": points,
    }


def fixture_and_data() -> tuple[dict[str, Any], dict[str, Any], str]:
    data = deepcopy(manifest())
    fixture = deepcopy(data["fixtures"][0])
    favorite = data["teams"][2]["id"]
    fixture["home_team_id"] = data["teams"][0]["id"]
    fixture["away_team_id"] = data["teams"][1]["id"]
    return fixture, data, favorite


def test_gap_math_and_other_team_scenarios_are_deterministic() -> None:
    fixture, data, favorite = fixture_and_data()
    rows = [
        row(favorite, 20, 3),
        row(fixture["home_team_id"], 15, 4),
        row(fixture["away_team_id"], 17, 2),
    ]
    insight = impact_insight(fixture, data, favorite, rows)
    assert insight.relevance == "HIGH"
    away_win = next(item for item in insight.scenarios if item.outcome == "AWAY")
    # The home rival wins no points, so its gap moves in the favourite's favour by 0;
    # the away rival gains three and produces the required -3 change.
    assert [effect.gap_delta for effect in away_win.effects] == [0, -3]
    draw = next(item for item in insight.scenarios if item.outcome == "DRAW")
    assert [effect.gap_delta for effect in draw.effects] == [-1, -1]


def test_relevance_boundaries_and_none_keeps_calculable_effects() -> None:
    fixture, data, favorite = fixture_and_data()
    rows = [
        row(favorite, 20),
        row(fixture["home_team_id"], 11),
        row(fixture["away_team_id"], 10),
    ]
    low = impact_insight(fixture, data, favorite, rows)
    assert low.relevance == "LOW"
    rows = [
        row(favorite, 20),
        row(fixture["home_team_id"], 10),
        row(fixture["away_team_id"], 9),
    ]
    none = impact_insight(fixture, data, favorite, rows)
    assert none.relevance == "NONE"
    assert none.basis == "NONE"
    assert any(
        effect.gap_delta != 0
        for scenario in none.scenarios
        for effect in scenario.effects
    )


def test_own_match_has_one_effect_and_updates_both_points() -> None:
    fixture, data, favorite = fixture_and_data()
    fixture["home_team_id"] = favorite
    opponent = fixture["away_team_id"]
    insight = impact_insight(
        fixture, data, favorite, [row(favorite, 20), row(opponent, 15)]
    )
    assert insight.relevance == "HIGH"
    home = next(item for item in insight.scenarios if item.outcome == "HOME")
    assert len(home.effects) == 1
    assert home.effects[0].gap_delta == 3


def test_finished_verified_result_is_preserved_without_standings_evidence() -> None:
    fixture, data, favorite = fixture_and_data()
    fixture["status"] = "FINISHED"
    fixture["score"] = {"home": 2, "away": 1}
    insight = impact_insight(fixture, data, favorite, None)
    assert insight.actual_outcome == "HOME"
    assert insight.relevance == "UNKNOWN"
    assert insight.basis == "INSUFFICIENT_DATA"
    assert insight.scenarios == []


def test_finished_has_one_confirmed_and_two_hypothetical_scenarios() -> None:
    fixture, data, favorite = fixture_and_data()
    fixture["status"] = "FINISHED"
    fixture["score"] = {"home": 2, "away": 1}
    rows = [
        row(favorite, 20, 2),
        row(fixture["home_team_id"], 17, 3),
        row(fixture["away_team_id"], 14, 4),
    ]
    insight = impact_insight(
        fixture,
        data,
        favorite,
        rows,
        snapshot_id="a0000000-0000-4000-8000-000000000001",
        effective_at=datetime(2026, 10, 23, tzinfo=UTC),
        post_raw_rows=rows,
    )
    assert len(insight.scenarios) == 3
    assert sum(not scenario.is_hypothetical for scenario in insight.scenarios) == 1


def test_finished_score_without_post_snapshot_has_no_confirmed_scenario() -> None:
    fixture, data, favorite = fixture_and_data()
    fixture["status"] = "FINISHED"
    fixture["score"] = {"home": 2, "away": 1}
    rows = [
        row(favorite, 20, 2),
        row(fixture["home_team_id"], 17, 3),
        row(fixture["away_team_id"], 14, 4),
    ]
    insight = impact_insight(fixture, data, favorite, rows)
    assert insight.actual_outcome == "HOME"
    assert insight.relevance == "UNKNOWN"
    assert insight.scenarios == []


def test_confirmed_effect_uses_observed_post_match_standings() -> None:
    fixture, data, favorite = fixture_and_data()
    fixture["status"] = "FINISHED"
    fixture["score"] = {"home": 2, "away": 1}
    pre = [row(favorite, 20, 2), row(fixture["home_team_id"], 17, 3), row(fixture["away_team_id"], 14, 4)]
    post = [row(favorite, 20, 2), row(fixture["home_team_id"], 20, 3), row(fixture["away_team_id"], 14, 4)]
    insight = impact_insight(fixture, data, favorite, pre, post_raw_rows=post)
    confirmed = next(item for item in insight.scenarios if not item.is_hypothetical)
    assert [effect.gap_after for effect in confirmed.effects] == [0, 6]


def test_impact_cursor_rejects_changed_snapshot_version() -> None:
    fixture, _, favorite = fixture_and_data()
    cursor = cursor_value(favorite, "PL", 2026, 11, None, "a:baseline", fixture)
    with pytest.raises(ApiError):
        parse_cursor(cursor, favorite, "PL", 2026, 11, None, "a:changed")


def test_http_impact_is_truthful_when_the_frozen_demo_has_no_standings_rows() -> None:
    with TestClient(
        create_app(Settings(database_url="sqlite+aiosqlite:///:memory:"))
    ) as client:
        impact = client.get(
            "/api/v1/matches/30000000-0000-4000-8000-000000000003/impact"
            "?favorite_team_id=20000000-0000-4000-8000-000000000001"
        )
        standings = client.get("/api/v1/standings?competition=PL&season=2026")
    assert impact.status_code == 200
    assert impact.json()["relevance"] == "UNKNOWN"
    assert impact.json()["actual_outcome"] == "HOME"
    assert impact.json()["scenarios"] == []
    assert standings.status_code == 502
