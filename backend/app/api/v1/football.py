"""Journey, match-detail, and stadium-map routes over canonical demo data."""
from __future__ import annotations

from datetime import date
from typing import Any

from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import ApiError
from app.db.session import get_session
from app.schemas.contract import JourneyResponse, MatchDetail, MatchEvent, Page, StadiumMapResponse
from app.services.demo_football import fixture_by_id, manifest, persisted_manifest, stadium_map, summary
from app.services.runtime import runtime_state

router = APIRouter(prefix="/api/v1", tags=["football"])


async def read_data(session: AsyncSession) -> dict[str, Any]:
    """Use scenario-controlled persistence when seeded, otherwise the frozen test fixture."""
    return await persisted_manifest(session) or manifest()


@router.get("/journey", response_model=JourneyResponse)
async def journey(
    team_id: str = Query(...), season: int = Query(...), session: AsyncSession = Depends(get_session)
) -> JourneyResponse:
    data = await read_data(session)
    competition = data["competition"]
    team_ids = {team["id"] for team in data["teams"]}
    if season != competition["season_start_year"] or team_id not in team_ids:
        raise ApiError(422, "INVALID_INPUT", "Unknown team or season")
    fixtures = [item for item in data["fixtures"] if team_id in (item["home_team_id"], item["away_team_id"])]
    return JourneyResponse(
        items=[summary(item, data) for item in sorted(fixtures, key=lambda item: item["kickoff_at"])],
        team_id=team_id,
        season_start_year=season,
    )


@router.get("/matches", response_model=Page)
async def matches(
    competition: str = Query(...), status: str | None = Query(None), session: AsyncSession = Depends(get_session)
) -> Page:
    data = await read_data(session)
    if competition != data["competition"]["code"]:
        raise ApiError(422, "INVALID_INPUT", "Unsupported competition")
    fixtures: list[dict[str, Any]] = [item for item in data["fixtures"] if status is None or item["status"] == status]
    return Page(items=[summary(item, data) for item in sorted(fixtures, key=lambda item: item["kickoff_at"])], next_cursor=None)


@router.get("/matches/{match_id}", response_model=MatchDetail)
async def match_detail(match_id: str, session: AsyncSession = Depends(get_session)) -> MatchDetail:
    data = await read_data(session)
    fixture = fixture_by_id(data, match_id)
    if fixture is None:
        raise ApiError(404, "NOT_FOUND", "Match was not found")
    base = summary(fixture, data)
    events = [
        MatchEvent(
            id=item["id"],
            kind=item["kind"],
            minute=item.get("minute"),
            team_id=item.get("team_id"),
            player_name=item.get("player_name"),
            related_player_name=item.get("related_player_name"),
            description=item.get("description", ""),
            source_ref=item["source_ref"],
        )
        for item in fixture.get("events", [])
    ]
    return MatchDetail(
        **base.model_dump(),
        events=events,
        statistics=None,
        lineups=None,
        data_capabilities=fixture["capabilities"],
    )


@router.get("/map/stadiums", response_model=StadiumMapResponse)
async def stadiums(
    request: Request,
    competition: str = Query(...),
    season: int = Query(...),
    matchday: int | None = Query(None),
    date_value: date | None = Query(None, alias="date"),
    session: AsyncSession = Depends(get_session),
) -> StadiumMapResponse:
    data = await read_data(session)
    configured = data["competition"]
    if competition != configured["code"] or season != configured["season_start_year"]:
        raise ApiError(422, "INVALID_INPUT", "Unsupported competition or season")
    if (matchday is None) == (date_value is None):
        raise ApiError(422, "INVALID_INPUT", "Provide exactly one of matchday or date")
    now, _, _ = await runtime_state(session, request.app.state.settings.demo_clock_iso)
    return stadium_map(data, matchday=matchday, london_date=date_value, server_now_utc=now)
