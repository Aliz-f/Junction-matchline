"""Validation used immediately before deterministic demo persistence."""
from __future__ import annotations

from typing import Any

_SCORED = {"LIVE", "HALFTIME", "FINISHED"}
_SCORELESS = {"SCHEDULED", "POSTPONED", "CANCELLED", "SUSPENDED", "UNKNOWN"}


def validate_demo_manifest(data: dict[str, Any]) -> None:
    """Reject inconsistent fixture references/statuses before a seed transaction starts."""
    team_ids = {item["id"] for item in data["teams"]}
    venue_ids = {item["id"] for item in data["venues"]}
    seen_participation: set[tuple[int | None, str]] = set()
    for fixture in data["fixtures"]:
        status = fixture["status"]
        score = fixture["score"]
        if fixture["home_team_id"] == fixture["away_team_id"]:
            raise ValueError(f"fixture {fixture['id']} uses the same home and away team")
        if fixture["home_team_id"] not in team_ids or fixture["away_team_id"] not in team_ids:
            raise ValueError(f"fixture {fixture['id']} references an unknown team")
        if fixture["venue_id"] is not None and fixture["venue_id"] not in venue_ids:
            raise ValueError(f"fixture {fixture['id']} references an unknown venue")
        score_pair = (score["home"], score["away"])
        if status in _SCORED and (
            score_pair[0] is None
            or score_pair[1] is None
            or score_pair[0] < 0
            or score_pair[1] < 0
        ):
            raise ValueError(f"fixture {fixture['id']} requires nonnegative paired scores")
        if status in _SCORELESS and score_pair != (None, None):
            raise ValueError(f"fixture {fixture['id']} must not have a score in {status}")
        if status not in _SCORED | _SCORELESS:
            raise ValueError(f"fixture {fixture['id']} has unknown status {status}")
        if status != "CANCELLED":
            for team_id in (fixture["home_team_id"], fixture["away_team_id"]):
                participant = fixture["matchday"], team_id
                if participant in seen_participation:
                    raise ValueError(f"duplicate team participation in matchday: {participant}")
                seen_participation.add(participant)
