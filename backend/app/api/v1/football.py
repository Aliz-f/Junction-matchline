"""Journey, match-detail, and stadium-map routes over canonical demo data."""
from __future__ import annotations

import base64
import binascii
from datetime import UTC, date, datetime
from typing import Any
from uuid import UUID

from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import ApiError
from app.db.session import get_session
from app.schemas.contract import (
    JourneyResponse,
    MatchDetail,
    MatchEvent,
    Page,
    StadiumMapResponse,
)
from app.services.demo_football import (
    fixture_by_id,
    manifest,
    persisted_manifest,
    stadium_map,
    summary,
)
from app.services.runtime import runtime_state

router = APIRouter(prefix="/api/v1", tags=["football"])


async def read_data(session: AsyncSession) -> dict[str, Any]:
    """Use scenario-controlled persistence when seeded, otherwise the frozen test fixture."""
    return await persisted_manifest(session) or manifest()


def require_utc(value: datetime | None, field: str) -> datetime | None:
    if value is None:
        return None
    if value.tzinfo is None or value.utcoffset() != UTC.utcoffset(value):
        raise ApiError(422, "INVALID_INPUT", f"{field} must be a UTC timestamp")
    return value.astimezone(UTC)


def match_cursor(fixture: dict[str, Any]) -> str:
    value = f"{fixture['kickoff_at']}|{fixture['id']}".encode("utf-8")
    return base64.urlsafe_b64encode(value).decode("ascii").rstrip("=")


def parse_match_cursor(cursor: str) -> tuple[str, str]:
    try:
        padded = cursor + "=" * (-len(cursor) % 4)
        kickoff_at, match_id = base64.urlsafe_b64decode(padded).decode("utf-8").split("|", maxsplit=1)
        UUID(match_id)
        return kickoff_at, match_id
    except (binascii.Error, UnicodeDecodeError, ValueError):
        raise ApiError(422, "INVALID_INPUT", "Invalid match cursor") from None


@router.get("/journey", response_model=JourneyResponse)
async def journey(
    request: Request, team_id: str = Query(...), season: int = Query(...), session: AsyncSession = Depends(get_session)
) -> JourneyResponse:
    data = await read_data(session)
    competition = data["competition"]
    team_ids = {team["id"] for team in data["teams"]}
    if season != competition["season_start_year"] or team_id not in team_ids:
        raise ApiError(422, "INVALID_INPUT", "Unknown team or season")
    fixtures = [item for item in data["fixtures"] if team_id in (item["home_team_id"], item["away_team_id"])]
    now, _, _ = await runtime_state(session, request.app.state.settings.demo_clock_iso)
    return JourneyResponse(
        items=[summary(item, data, server_now_utc=now) for item in sorted(fixtures, key=lambda item: item["kickoff_at"])],
        team_id=UUID(team_id),
        season_start_year=season,
    )


@router.get("/matches", response_model=Page)
async def matches(
    request: Request,
    competition: str = Query(...),
    from_value: datetime | None = Query(None, alias="from"),
    to_value: datetime | None = Query(None, alias="to"),
    status: str | None = Query(None),
    limit: int = Query(20, ge=1, le=100),
    cursor: str | None = Query(None),
    session: AsyncSession = Depends(get_session),
) -> Page:
    data = await read_data(session)
    if competition != data["competition"]["code"]:
        raise ApiError(422, "INVALID_INPUT", "Unsupported competition")
    from_utc = require_utc(from_value, "from")
    to_utc = require_utc(to_value, "to")
    if from_utc is not None and to_utc is not None and from_utc > to_utc:
        raise ApiError(422, "INVALID_INPUT", "from must not be after to")
    fixtures: list[dict[str, Any]] = [
        item
        for item in data["fixtures"]
        if (status is None or item["status"] == status)
        and (from_utc is None or datetime.fromisoformat(item["kickoff_at"].replace("Z", "+00:00")) >= from_utc)
        and (to_utc is None or datetime.fromisoformat(item["kickoff_at"].replace("Z", "+00:00")) <= to_utc)
    ]
    ordered = sorted(fixtures, key=lambda item: (item["kickoff_at"], item["id"]))
    if cursor is not None:
        cursor_key = parse_match_cursor(cursor)
        ordered = [item for item in ordered if (item["kickoff_at"], item["id"]) > cursor_key]
    page = ordered[:limit]
    next_cursor = match_cursor(page[-1]) if len(ordered) > len(page) else None
    now, _, _ = await runtime_state(session, request.app.state.settings.demo_clock_iso)
    return Page(items=[summary(item, data, server_now_utc=now) for item in page], next_cursor=next_cursor)


@router.get("/matches/{match_id}", response_model=MatchDetail)
async def match_detail(request: Request, match_id: str, session: AsyncSession = Depends(get_session)) -> MatchDetail:
    data = await read_data(session)
    fixture = fixture_by_id(data, match_id)
    if fixture is None:
        raise ApiError(404, "NOT_FOUND", "Match was not found")
    now, _, _ = await runtime_state(session, request.app.state.settings.demo_clock_iso)
    base = summary(fixture, data, server_now_utc=now)
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
