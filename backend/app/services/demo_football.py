"""Deterministic read projections from the frozen synthetic manifest.

The helpers in this module deliberately take data rather than HTTP objects. That
makes the London-date and map-state rules testable without relying on the wall
clock or mutating the immutable demo manifest.
"""
from __future__ import annotations

from datetime import UTC, date, datetime
from typing import Any
from uuid import UUID
from zoneinfo import ZoneInfo

from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.football_models import Competition, Match, MatchEventRecord, Season, SeasonTeamHomeVenue, Team, Venue
from app.schemas.contract import (
    CompetitionSummary,
    MatchFeatures,
    MatchScore,
    MatchStatus,
    MatchSummary,
    SourceView,
    StadiumFixture,
    StadiumMapResponse,
    StadiumVenue,
    TeamSummary,
    UnmappedMatch,
    VenueSummary,
)
from app.seed.loader import load_demo_manifest

LONDON = ZoneInfo("Europe/London")


def source() -> SourceView:
    return SourceView(
        kind="DEMO_SYNTHETIC",
        is_stale=False,
        last_synced_at=None,
        data_version="demo-manifest-v1",
    )


def utc(value: str) -> datetime:
    return datetime.fromisoformat(value.replace("Z", "+00:00")).astimezone(UTC)


def manifest() -> dict[str, Any]:
    """Return the canonical manifest with a local typed boundary."""
    return load_demo_manifest()


def iso_z(value: datetime) -> str:
    if value.tzinfo is None:
        value = value.replace(tzinfo=UTC)
    return value.astimezone(UTC).isoformat().replace("+00:00", "Z")


async def persisted_manifest(session: AsyncSession, competition_code: str = "PL") -> dict[str, Any] | None:
    """Load the normalized demo projection in fixed-size queries, never per marker.

    A missing/unmigrated local database intentionally returns ``None`` so the
    contract-only application harness can still serve the frozen manifest. A
    seeded runtime always reads rows written by the scenario CLI.
    """
    try:
        competition = await session.scalar(select(Competition).where(Competition.code == competition_code))
        if competition is None:
            return None
        season = await session.scalar(
            select(Season).where(Season.competition_id == competition.id).order_by(Season.start_year.desc())
        )
        if season is None:
            return None
        teams = list((await session.scalars(select(Team).order_by(Team.name))).all())
        venues = list((await session.scalars(select(Venue).order_by(Venue.name))).all())
        associations = list(
            (await session.scalars(select(SeasonTeamHomeVenue).where(SeasonTeamHomeVenue.season_id == season.id))).all()
        )
        matches = list(
            (
                await session.scalars(
                    select(Match)
                    .where(Match.competition_id == competition.id, Match.season_id == season.id)
                    .order_by(Match.kickoff_at, Match.id)
                )
            ).all()
        )
        events = list(
            (await session.scalars(select(MatchEventRecord).where(MatchEventRecord.match_id.in_([item.id for item in matches])))).all()
        ) if matches else []
    except SQLAlchemyError:
        return None

    home_team_ids: dict[str, list[str]] = {venue.id: [] for venue in venues}
    for association in associations:
        home_team_ids.setdefault(association.venue_id, []).append(association.team_id)
    events_by_match: dict[str, list[dict[str, Any]]] = {}
    for event in events:
        events_by_match.setdefault(event.match_id, []).append(
            {
                "id": event.id,
                "kind": event.kind,
                "minute": event.minute,
                "team_id": event.team_id,
                "player_name": event.player_name,
                "related_player_name": event.related_player_name,
                "description": event.description,
                "source_ref": event.source_ref,
            }
        )
    return {
        "competition": {
            "id": competition.id,
            "code": competition.code,
            "season_start_year": season.start_year,
            "name": competition.name,
            "brand_key": competition.brand_key,
            "country_code": competition.country_code,
        },
        "demo_clock": "1970-01-01T00:00:00Z",
        "teams": [
            {"id": item.id, "name": item.name, "short_name": item.short_name}
            for item in teams
        ],
        "venues": [
            {
                "id": item.id,
                "name": item.name,
                "lat": item.lat,
                "lng": item.lng,
                "coord_verified": item.coord_verified,
                "coord_source": item.coord_source,
                "home_team_ids": sorted(home_team_ids.get(item.id, [])),
            }
            for item in venues
        ],
        "fixtures": [
            {
                "id": item.id,
                "matchday": item.matchday,
                "kickoff_at": iso_z(item.kickoff_at),
                "home_team_id": item.home_team_id,
                "away_team_id": item.away_team_id,
                "venue_id": item.venue_id,
                "status": item.status,
                "score": {"home": item.home_score, "away": item.away_score},
                "events": events_by_match.get(item.id, []),
                "capabilities": item.capabilities,
            }
            for item in matches
        ],
    }


def fixture_by_id(data: dict[str, Any], match_id: str) -> dict[str, Any] | None:
    return next((item for item in data["fixtures"] if item["id"] == match_id), None)


def select_fixtures(
    fixtures: list[dict[str, Any]], *, matchday: int | None, london_date: date | None
) -> list[dict[str, Any]]:
    """Select exactly one map subset using a DST-safe Europe/London date."""
    if (matchday is None) == (london_date is None):
        raise ValueError("provide exactly one selector")
    if matchday is not None:
        return [item for item in fixtures if item["matchday"] == matchday]
    assert london_date is not None
    return [item for item in fixtures if utc(item["kickoff_at"]).astimezone(LONDON).date() == london_date]


def summary(fixture: dict[str, Any], data: dict[str, Any] | None = None) -> MatchSummary:
    data = manifest() if data is None else data
    competition = data["competition"]
    teams = {item["id"]: item for item in data["teams"]}
    venues = {item["id"]: item for item in data["venues"]}
    home, away = teams[fixture["home_team_id"]], teams[fixture["away_team_id"]]
    venue_data = venues.get(fixture.get("venue_id"))
    venue = None
    if venue_data is not None:
        venue = VenueSummary(
            id=UUID(venue_data["id"]),
            name=venue_data["name"],
            lat=venue_data.get("lat"),
            lng=venue_data.get("lng"),
            coord_verified=venue_data["coord_verified"],
        )
    score = fixture.get("score") or {"home": None, "away": None}
    return MatchSummary(
        id=UUID(fixture["id"]),
        competition=CompetitionSummary(
            id=UUID(competition["id"]),
            code=competition["code"],
            name=competition["name"],
            brand_key=competition["brand_key"],
            country_code=competition["country_code"],
        ),
        season_start_year=competition["season_start_year"],
        matchday=fixture["matchday"],
        kickoff_at=fixture["kickoff_at"],
        status=MatchStatus(fixture["status"]),
        home_team=TeamSummary(id=UUID(home["id"]), name=home["name"], short_name=home["short_name"], crest_url=None),
        away_team=TeamSummary(id=UUID(away["id"]), name=away["name"], short_name=away["short_name"], crest_url=None),
        score=MatchScore(home=score.get("home"), away=score.get("away")),
        venue=venue,
        source=source(),
        features=MatchFeatures(
            pre_match_room=fixture["status"] == "SCHEDULED",
            predictions_open=fixture["status"] == "SCHEDULED",
            whatif_available=fixture["status"] == "FINISHED",
            post_match_room=fixture["status"] == "FINISHED",
        ),
    )


def illumination_state(fixtures: list[dict[str, Any]], *, server_now_utc: datetime) -> str:
    """Return a venue state from explicit fixture states, never from the clock alone."""
    if not fixtures:
        return "INACTIVE"
    statuses = {item["status"] for item in fixtures}
    if statuses & {"LIVE", "HALFTIME"}:
        return "LIVE"
    if any(item["status"] == "SCHEDULED" and utc(item["kickoff_at"]) > server_now_utc for item in fixtures):
        return "UPCOMING_ROUND"
    if "FINISHED" in statuses:
        return "COMPLETED"
    if statuses & {"POSTPONED", "CANCELLED"}:
        return "POSTPONED_OR_CANCELLED"
    return "UNKNOWN"


def stadium_map(
    data: dict[str, Any], *, matchday: int | None, london_date: date | None, server_now_utc: datetime | None = None
) -> StadiumMapResponse:
    """Build all mapped venues plus list-only fixtures with absent/unverified coordinates."""
    competition = data["competition"]
    selected = select_fixtures(data["fixtures"], matchday=matchday, london_date=london_date)
    now = utc(data["demo_clock"]) if server_now_utc is None else server_now_utc.astimezone(UTC)
    venues = {item["id"]: item for item in data["venues"]}
    unmapped: list[UnmappedMatch] = []
    for fixture in selected:
        venue = venues.get(fixture.get("venue_id"))
        if venue is None:
            unmapped.append(UnmappedMatch(match=summary(fixture, data), reason="VENUE_MISSING"))
        elif not venue.get("coord_verified") or venue.get("lat") is None or venue.get("lng") is None:
            unmapped.append(UnmappedMatch(match=summary(fixture, data), reason="VENUE_COORDINATES_UNVERIFIED"))

    stadiums: list[StadiumVenue] = []
    for venue in sorted(venues.values(), key=lambda item: item["name"]):
        # Only verified coordinate records are map pins. A non-selected unverified
        # venue has no fixture to represent in the list-only fallback.
        if not venue.get("coord_verified") or venue.get("lat") is None or venue.get("lng") is None:
            continue
        venue_fixtures = [item for item in selected if item.get("venue_id") == venue["id"]]
        stadiums.append(
            StadiumVenue(
                venue_id=venue["id"],
                name=venue["name"],
                lat=venue["lat"],
                lng=venue["lng"],
                coord_verified=True,
                home_team_ids=sorted(venue.get("home_team_ids", [])),
                illumination_state=illumination_state(venue_fixtures, server_now_utc=now),
                fixtures=[StadiumFixture(match=summary(item, data)) for item in venue_fixtures],
            )
        )
    return StadiumMapResponse(
        competition=competition["code"],
        season_start_year=competition["season_start_year"],
        selected={"matchday": matchday, "date": str(london_date) if london_date else None},
        stadiums=stadiums,
        unmapped_matches=unmapped,
        source=source(),
    )
