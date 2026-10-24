"""Deterministic read projections from the frozen synthetic manifest."""
from __future__ import annotations

from datetime import UTC, datetime
from uuid import UUID

from app.schemas.contract import CompetitionSummary, MatchFeatures, MatchScore, MatchStatus, MatchSummary, SourceView, TeamSummary, VenueSummary
from app.seed.loader import load_demo_manifest


def _utc(value: str) -> datetime:
    return datetime.fromisoformat(value.replace("Z", "+00:00")).astimezone(UTC)


def _source() -> SourceView:
    return SourceView(kind="DEMO_SYNTHETIC", is_stale=False, last_synced_at=None, data_version="demo-manifest-v1")


def summary(fixture: dict[str, object]) -> MatchSummary:
    data = load_demo_manifest(); competition = data["competition"]
    teams = {item["id"]: item for item in data["teams"]}; venues = {item["id"]: item for item in data["venues"]}
    home, away = teams[fixture["home_team_id"]], teams[fixture["away_team_id"]]
    venue_data = venues.get(fixture["venue_id"])
    venue = None if venue_data is None else VenueSummary(id=UUID(venue_data["id"]), name=venue_data["name"], lat=venue_data["lat"], lng=venue_data["lng"], coord_verified=venue_data["coord_verified"])
    return MatchSummary(id=UUID(fixture["id"]), competition=CompetitionSummary(id=UUID(competition["id"]), code=competition["code"], name=competition["name"], brand_key=competition["brand_key"], country_code=competition["country_code"]), season_start_year=competition["season_start_year"], matchday=fixture["matchday"], kickoff_at=fixture["kickoff_at"], status=MatchStatus(fixture["status"]), home_team=TeamSummary(id=UUID(home["id"]), name=home["name"], short_name=home["short_name"], crest_url=None), away_team=TeamSummary(id=UUID(away["id"]), name=away["name"], short_name=away["short_name"], crest_url=None), score=MatchScore(**fixture["score"]), venue=venue, source=_source(), features=MatchFeatures(pre_match_room=fixture["status"] == "SCHEDULED", predictions_open=fixture["status"] == "SCHEDULED", whatif_available=fixture["status"] == "FINISHED", post_match_room=fixture["status"] == "FINISHED"))
