"""Validate BE-00 immutable demo and contract-edge fixture artifacts."""

from __future__ import annotations

import hashlib
import json
from datetime import datetime
from pathlib import Path
from uuid import UUID

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / "app/seed/demo_manifest.json"
EDGE = ROOT / "tests/fixtures/contract_edge_cases.json"
FINISHED = {"FINISHED"}
SCORELESS = {"SCHEDULED", "POSTPONED", "CANCELLED", "SUSPENDED", "UNKNOWN"}
REQUIRED_CASES = {
    "FAVORITE_AWAY",
    "NEUTRAL_VENUE",
    "MIXED_FINISHED",
    "MIXED_LIVE",
    "LONDON_DST_AUTUMN_BEFORE_FALLBACK",
    "LONDON_DST_AUTUMN_AFTER_FALLBACK",
    "EMPTY_ROOM_BURST",
    "HIDDEN_OLD_MESSAGE",
    "CLOCK_CUTOFF",
    "PREDICTION_SCORE_CONSTRAINT",
    "MAP_NO_FAVORITE",
}


def as_uuid(value: str) -> None:
    UUID(value)


def parse_utc(value: str) -> datetime:
    return datetime.fromisoformat(value.replace("Z", "+00:00"))


def validate() -> tuple[str, str]:
    data = json.loads(MANIFEST.read_text())
    edge = json.loads(EDGE.read_text())
    errors: list[str] = []
    for collection in (
        data["teams"],
        data["venues"],
        data["fixtures"],
        data["users"],
        data["rooms"],
        data["snapshots"],
    ):
        ids = [item["id"] for item in collection]
        if len(ids) != len(set(ids)):
            errors.append("duplicate IDs")
        for value in ids:
            try:
                as_uuid(value)
            except ValueError:
                errors.append(f"not UUID: {value}")
    teams, venues = {x["id"] for x in data["teams"]}, {x["id"] for x in data["venues"]}
    seen: set[tuple[int, str]] = set()
    for fixture in data["fixtures"]:
        if (
            fixture["home_team_id"] not in teams
            or fixture["away_team_id"] not in teams
            or fixture["home_team_id"] == fixture["away_team_id"]
        ):
            errors.append(f"bad team reference: {fixture['key']}")
        if fixture["venue_id"] is not None and fixture["venue_id"] not in venues:
            errors.append(f"bad venue: {fixture['key']}")
        parse_utc(fixture["kickoff_at"])
        score = fixture["score"]
        if fixture["status"] in FINISHED and (
            score["home"] is None or score["away"] is None
        ):
            errors.append(f"finished missing score: {fixture['key']}")
        if fixture["status"] in SCORELESS and (
            score["home"] is not None or score["away"] is not None
        ):
            errors.append(f"scoreless state has score: {fixture['key']}")
        if fixture["status"] != "CANCELLED":
            for team in (fixture["home_team_id"], fixture["away_team_id"]):
                pair = fixture["matchday"], team
                if pair in seen:
                    errors.append(f"duplicate matchday team: {pair}")
                seen.add(pair)
    if data["demo_clock"] != data["scenarios"]["baseline"]["server_now_utc"]:
        errors.append("baseline clock mismatch")
    fixture_keys = {item["key"] for item in data["fixtures"]}
    if (
        not {
            "match_upcoming",
            "match_live",
            "match_finished",
            "match_halftime",
            "match_postponed",
            "match_cancelled",
            "match_event_poor_finished",
            "match_non_relevant",
        }
        <= fixture_keys
    ):
        errors.append("missing G0 fixture coverage")
    if set(edge["cases"]) != REQUIRED_CASES:
        errors.append("edge case names differ")
    if not all(v["coord_verified"] and v["coord_source"] for v in edge["venues"]):
        errors.append("edge coordinate provenance missing")
    for name in (
        "FAVORITE_AWAY",
        "NEUTRAL_VENUE",
        "MIXED_FINISHED",
        "MIXED_LIVE",
        "LONDON_DST_AUTUMN_BEFORE_FALLBACK",
        "LONDON_DST_AUTUMN_AFTER_FALLBACK",
    ):
        as_uuid(edge["cases"][name]["id"])
    if errors:
        raise ValueError("; ".join(errors))
    return hashlib.sha256(MANIFEST.read_bytes()).hexdigest(), hashlib.sha256(
        EDGE.read_bytes()
    ).hexdigest()


if __name__ == "__main__":
    manifest_hash, edge_hash = validate()
    print(f"demo_manifest.json SHA-256 {manifest_hash}")
    print(f"contract_edge_cases.json SHA-256 {edge_hash}")
