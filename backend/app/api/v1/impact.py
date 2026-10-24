"""Public verified standings and deterministic impact endpoints (BE-05)."""

from __future__ import annotations

import base64
import binascii
from datetime import UTC, date
from typing import Any
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import ApiError
from app.db.football_models import Competition, Season, StandingsSnapshot
from app.db.session import get_session
from app.schemas.contract import ImpactInsight, Page, StandingsResponse
from app.services.demo_football import (
    fixture_by_id,
    manifest,
    persisted_manifest,
    select_fixtures,
    source,
)
from app.services.impact import impact_insight, validated_rows

router = APIRouter(prefix="/api/v1", tags=["impact"])


async def read_data(session: AsyncSession) -> dict[str, Any]:
    return await persisted_manifest(session) or manifest()


async def snapshots(
    session: AsyncSession, data: dict[str, Any]
) -> list[StandingsSnapshot]:
    try:
        competition_id = data["competition"]["id"]
        season_start = data["competition"]["season_start_year"]
        competition = await session.get(Competition, competition_id)
        if competition is None:
            return []
        season = await session.scalar(
            select(Season).where(
                Season.competition_id == competition.id,
                Season.start_year == season_start,
            )
        )
        if season is None:
            return []
        return list(
            (
                await session.scalars(
                    select(StandingsSnapshot)
                    .where(
                        StandingsSnapshot.competition_id == competition.id,
                        StandingsSnapshot.season_id == season.id,
                    )
                    .order_by(StandingsSnapshot.effective_at)
                )
            ).all()
        )
    except SQLAlchemyError:
        return []


def cursor_value(
    favorite: str,
    matchday: int | None,
    selected_date: date | None,
    fixture: dict[str, Any],
) -> str:
    raw = "|".join(
        (
            favorite,
            str(matchday or ""),
            str(selected_date or ""),
            fixture["kickoff_at"],
            fixture["id"],
        )
    )
    return base64.urlsafe_b64encode(raw.encode()).decode().rstrip("=")


def parse_cursor(
    cursor: str, favorite: str, matchday: int | None, selected_date: date | None
) -> tuple[str, str]:
    try:
        raw = base64.urlsafe_b64decode(cursor + "=" * (-len(cursor) % 4)).decode()
        cursor_favorite, cursor_matchday, cursor_date, kickoff, match_id = raw.split(
            "|", 4
        )
        UUID(match_id)
    except (ValueError, UnicodeDecodeError, binascii.Error):
        raise ApiError(422, "INVALID_INPUT", "Invalid impact cursor") from None
    if (cursor_favorite, cursor_matchday, cursor_date) != (
        favorite,
        str(matchday or ""),
        str(selected_date or ""),
    ):
        raise ApiError(
            422, "INVALID_INPUT", "Impact cursor does not match selected filters"
        )
    return kickoff, match_id


def snapshots_for_fixture(
    items: list[StandingsSnapshot], fixture: dict[str, Any]
) -> tuple[StandingsSnapshot | None, StandingsSnapshot | None]:
    kickoff = fixture["kickoff_at"].replace("Z", "+00:00")
    pre = [item for item in items if item.effective_at.isoformat() <= kickoff]
    post = [item for item in items if item.effective_at.isoformat() > kickoff]
    return (pre[-1] if pre else None, post[0] if post else None)


def build(
    fixture: dict[str, Any],
    data: dict[str, Any],
    favorite: str,
    items: list[StandingsSnapshot],
) -> ImpactInsight:
    pre, post = snapshots_for_fixture(items, fixture)
    return impact_insight(
        fixture,
        data,
        favorite,
        pre.table_json if pre and pre.table_json else None,
        snapshot_id=pre.id if pre else None,
        effective_at=pre.effective_at if pre else None,
        source_version=pre.source_version if pre else None,
        post_raw_rows=post.table_json if post and post.table_json else None,
    )


@router.get("/standings", response_model=StandingsResponse)
async def standings(
    competition: str = Query(...),
    season: int = Query(...),
    session: AsyncSession = Depends(get_session),
) -> StandingsResponse:
    data = await read_data(session)
    if (
        competition != data["competition"]["code"]
        or season != data["competition"]["season_start_year"]
    ):
        raise ApiError(422, "INVALID_INPUT", "Unsupported competition or season")
    available = [item for item in await snapshots(session, data) if item.table_json]
    if not available:
        raise ApiError(
            502, "PROVIDER_UNAVAILABLE", "No verified standings snapshot is available"
        )
    latest = available[-1]
    return StandingsResponse(
        competition=competition,
        season_start_year=season,
        snapshot_id=UUID(latest.id),
        as_of=latest.effective_at.astimezone(UTC).isoformat().replace("+00:00", "Z"),
        source=source(),
        rows=validated_rows(latest.table_json),
    )


@router.get("/matches/{match_id}/impact", response_model=ImpactInsight)
async def match_impact(
    match_id: str,
    favorite_team_id: str = Query(...),
    session: AsyncSession = Depends(get_session),
) -> ImpactInsight:
    data = await read_data(session)
    if favorite_team_id not in {item["id"] for item in data["teams"]}:
        raise ApiError(422, "INVALID_INPUT", "Unknown favourite team")
    fixture = fixture_by_id(data, match_id)
    if fixture is None:
        raise ApiError(404, "NOT_FOUND", "Match was not found")
    return build(fixture, data, favorite_team_id, await snapshots(session, data))


@router.get("/impact/relevant", response_model=Page)
async def relevant_impact(
    favorite_team_id: str = Query(...),
    competition: str = Query(...),
    season: int = Query(...),
    matchday: int | None = Query(None),
    date_value: date | None = Query(None, alias="date"),
    limit: int = Query(20, ge=1, le=100),
    cursor: str | None = Query(None),
    session: AsyncSession = Depends(get_session),
) -> Page:
    data = await read_data(session)
    if (
        competition != data["competition"]["code"]
        or season != data["competition"]["season_start_year"]
    ):
        raise ApiError(422, "INVALID_INPUT", "Unsupported competition or season")
    if favorite_team_id not in {item["id"] for item in data["teams"]}:
        raise ApiError(422, "INVALID_INPUT", "Unknown favourite team")
    if matchday is not None and date_value is not None:
        raise ApiError(422, "INVALID_INPUT", "Provide at most one of matchday or date")
    fixtures: list[dict[str, Any]] = (
        data["fixtures"]
        if matchday is None and date_value is None
        else select_fixtures(
            data["fixtures"], matchday=matchday, london_date=date_value
        )
    )
    ordered = sorted(fixtures, key=lambda item: (item["kickoff_at"], item["id"]))
    if cursor:
        cursor_key = parse_cursor(cursor, favorite_team_id, matchday, date_value)
        ordered = [
            item for item in ordered if (item["kickoff_at"], item["id"]) > cursor_key
        ]
    snapshots_list = await snapshots(session, data)
    insights = [build(item, data, favorite_team_id, snapshots_list) for item in ordered]
    # The feed is an other-team recommendation subset; UNKNOWN remains visible.
    filtered = [
        item
        for item in insights
        if item.match_id
        and favorite_team_id
        not in {str(item.match.home_team.id), str(item.match.away_team.id)}
        and item.relevance != "NONE"
    ]
    page = filtered[:limit]
    next_cursor = None
    if len(filtered) > len(page):
        fixture = fixture_by_id(data, str(page[-1].match_id))
        assert fixture is not None
        next_cursor = cursor_value(favorite_team_id, matchday, date_value, fixture)
    return Page(items=page, next_cursor=next_cursor)
