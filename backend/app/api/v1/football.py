"""Journey, match detail, and stadium map reads over canonical demo data."""
from __future__ import annotations

from datetime import date
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Query

from app.core.errors import ApiError
from app.schemas.contract import JourneyResponse, MatchDetail, MatchEvent, Page, StadiumFixture, StadiumMapResponse, StadiumVenue, UnmappedMatch
from app.services.demo_football import summary
from app.seed.loader import load_demo_manifest

router = APIRouter(prefix="/api/v1", tags=["football"])
LONDON = ZoneInfo("Europe/London")


def data() -> dict[str, object]:
    return load_demo_manifest()


def fixture_by_id(match_id: str) -> dict[str, object]:
    for fixture in data()["fixtures"]:
        if fixture["id"] == match_id:
            return fixture
    raise ApiError(404, "NOT_FOUND", "Match was not found")


@router.get("/journey", response_model=JourneyResponse)
async def journey(team_id: str = Query(...), season: int = Query(...)) -> JourneyResponse:
    manifest = data(); competition = manifest["competition"]
    if season != competition["season_start_year"] or team_id not in {team["id"] for team in manifest["teams"]}:
        raise ApiError(422, "INVALID_INPUT", "Unknown team or season")
    fixtures = [fixture for fixture in manifest["fixtures"] if team_id in (fixture["home_team_id"], fixture["away_team_id"])]
    return JourneyResponse(items=[summary(item) for item in sorted(fixtures, key=lambda item: item["kickoff_at"])], team_id=team_id, season_start_year=season)


@router.get("/matches", response_model=Page)
async def matches(competition: str = Query(...), status: str | None = Query(None)) -> Page:
    manifest = data()
    if competition != manifest["competition"]["code"]:
        raise ApiError(422, "INVALID_INPUT", "Unsupported competition")
    fixtures = [item for item in manifest["fixtures"] if status is None or item["status"] == status]
    return Page(items=[summary(item) for item in sorted(fixtures, key=lambda item: item["kickoff_at"])], next_cursor=None)


@router.get("/matches/{match_id}", response_model=MatchDetail)
async def match_detail(match_id: str) -> MatchDetail:
    fixture = fixture_by_id(match_id); base = summary(fixture)
    events = [MatchEvent(id=item["id"], kind=item["kind"], minute=item["minute"], team_id=item["team_id"], player_name=item["player_name"], related_player_name=item["related_player_name"], description="", source_ref=item["source_ref"]) for item in fixture["events"]]
    return MatchDetail(**base.model_dump(), events=events, statistics=None, lineups=None, data_capabilities=fixture["capabilities"])


@router.get("/map/stadiums", response_model=StadiumMapResponse)
async def stadiums(competition: str = Query(...), season: int = Query(...), matchday: int | None = Query(None), date_value: date | None = Query(None, alias="date")) -> StadiumMapResponse:
    manifest = data(); comp = manifest["competition"]
    if competition != comp["code"] or season != comp["season_start_year"] or (matchday is None) == (date_value is None):
        raise ApiError(422, "INVALID_INPUT", "Provide exactly one of matchday or date for the configured season")
    selected = [item for item in manifest["fixtures"] if (item["matchday"] == matchday if matchday is not None else item["kickoff_at"] and __import__("datetime").datetime.fromisoformat(item["kickoff_at"].replace("Z", "+00:00")).astimezone(LONDON).date() == date_value)]
    venues = {item["id"]: item for item in manifest["venues"]}; now = __import__("datetime").datetime.fromisoformat(manifest["demo_clock"].replace("Z", "+00:00"))
    result: list[StadiumVenue] = []; unmapped: list[UnmappedMatch] = []
    for venue in venues.values():
        fixtures = [item for item in selected if item["venue_id"] == venue["id"]]
        states = {item["status"] for item in fixtures}
        scheduled_future = any(item["status"] == "SCHEDULED" and __import__("datetime").datetime.fromisoformat(item["kickoff_at"].replace("Z", "+00:00")) > now for item in fixtures)
        illumination = "INACTIVE" if not fixtures else "LIVE" if states & {"LIVE", "HALFTIME"} else "UPCOMING_ROUND" if scheduled_future else "COMPLETED" if "FINISHED" in states else "POSTPONED_OR_CANCELLED" if states & {"POSTPONED", "CANCELLED"} else "UNKNOWN"
        result.append(StadiumVenue(venue_id=venue["id"], name=venue["name"], lat=venue["lat"], lng=venue["lng"], coord_verified=True, home_team_ids=sorted(venue["home_team_ids"]), illumination_state=illumination, fixtures=[StadiumFixture(match=summary(item)) for item in fixtures]))
    for item in selected:
        if item["venue_id"] is None:
            unmapped.append(UnmappedMatch(match=summary(item), reason="VENUE_MISSING"))
    return StadiumMapResponse(competition=competition, season_start_year=season, selected={"matchday": matchday, "date": str(date_value) if date_value else None}, stadiums=result, unmapped_matches=unmapped, source=summary(manifest["fixtures"][0]).source)
