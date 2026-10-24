"""Community rooms with server-side permissions and content-safe change feeds."""

from __future__ import annotations

import base64
import binascii
import html
from datetime import UTC, datetime
from typing import Any, Literal, cast
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.auth import current_user
from app.core.errors import ApiError
from app.db.football_models import (
    Match,
    ReportRecord,
    RoomChangeEvent,
    RoomMessageRecord,
    RoomRecord,
)
from app.db.models import UserRecord
from app.db.session import get_session
from app.schemas.contract import (
    AuthorPublic,
    Page,
    ReportRequest,
    ReportResponse,
    RoomChangePage,
    RoomChangeRemove,
    RoomChangeUpsert,
    RoomCreateRequest,
    RoomKind,
    RoomMessage,
    RoomMessageRequest,
    RoomMessagesPage,
    RoomStatus,
    RoomSummary,
)
from app.services.demo_football import fixture_by_id, persisted_manifest, summary
from app.services.runtime import runtime_state

router = APIRouter(prefix="/api/v1", tags=["rooms"])


def iso(value: datetime) -> str:
    value = value.replace(tzinfo=UTC) if value.tzinfo is None else value.astimezone(UTC)
    return value.isoformat().replace("+00:00", "Z")


async def data(session: AsyncSession) -> dict[str, Any] | None:
    return await persisted_manifest(session)


async def effective_status(room: RoomRecord, match: Match, now: datetime) -> str:
    if room.status == "HIDDEN":
        return "HIDDEN"
    kickoff = (
        match.kickoff_at.replace(tzinfo=UTC)
        if match.kickoff_at.tzinfo is None
        else match.kickoff_at
    )
    if room.kind == "POST_MATCH":
        return "OPEN" if match.status == "FINISHED" else "HIDDEN"
    return "OPEN" if match.status == "SCHEDULED" and now < kickoff else "READ_ONLY"


async def room_and_match(
    session: AsyncSession, room_id: str, now: datetime
) -> tuple[RoomRecord, Match, str]:
    room = await session.get(RoomRecord, room_id)
    if room is None:
        raise ApiError(404, "NOT_FOUND", "Room was not found")
    match = await session.get(Match, room.match_id)
    if match is None or await effective_status(room, match, now) == "HIDDEN":
        raise ApiError(404, "NOT_FOUND", "Room was not found")
    return room, match, await effective_status(room, match, now)


async def author(session: AsyncSession, user_id: str) -> AuthorPublic:
    user = await session.get(UserRecord, user_id)
    if user is None:
        raise RuntimeError("room message author missing")
    return AuthorPublic(
        id=UUID(user.id), display_name=user.display_name, public_badges=[]
    )


async def can_create(
    match: Match, kind: str, user: UserRecord | None, now: datetime
) -> bool:
    if user is None or user.plan != "PREMIUM" and user.role != "EDITOR":
        return False
    kickoff = (
        match.kickoff_at.replace(tzinfo=UTC)
        if match.kickoff_at.tzinfo is None
        else match.kickoff_at
    )
    return (kind == "PRE_MATCH" and match.status == "SCHEDULED" and now < kickoff) or (
        kind == "POST_MATCH" and match.status == "FINISHED"
    )


async def room_summary(
    session: AsyncSession,
    room: RoomRecord,
    match: Match,
    data_value: dict[str, object],
    user: UserRecord | None,
    now: datetime,
) -> RoomSummary:
    fixture = fixture_by_id(data_value, match.id)
    if fixture is None:
        raise RuntimeError("room match is absent from provider projection")
    state = await effective_status(room, match, now)
    count = (
        await session.scalar(
            select(func.count())
            .select_from(RoomMessageRecord)
            .where(
                RoomMessageRecord.room_id == room.id,
                RoomMessageRecord.moderation_state != "HIDDEN",
            )
        )
        or 0
    )
    creator = (
        await author(session, room.created_by_user_id)
        if room.created_by_user_id
        else None
    )
    return RoomSummary(
        id=UUID(room.id),
        match_id=UUID(room.match_id),
        match=summary(fixture, data_value),
        kind=RoomKind(room.kind),
        title=room.title,
        status=RoomStatus(state),
        created_by=creator,
        message_count=count,
        can_post=user is not None and state == "OPEN",
        can_create=await can_create(match, room.kind, user, now),
    )


async def message_view(session: AsyncSession, item: RoomMessageRecord) -> RoomMessage:
    return RoomMessage(
        id=UUID(item.id),
        room_id=UUID(item.room_id),
        body=item.body,
        created_at=iso(item.created_at),
        author=await author(session, item.user_id),
        moderation_state=cast(Literal["VISIBLE", "FLAGGED"], item.moderation_state),
    )


async def current_now(request: Request, session: AsyncSession) -> datetime:
    now, _, _ = await runtime_state(session, request.app.state.settings.demo_clock_iso)
    return now


@router.get("/rooms/{room_id}", response_model=RoomSummary)
async def room_detail(
    room_id: str, request: Request, session: AsyncSession = Depends(get_session)
) -> RoomSummary:
    now = await current_now(request, session)
    user = await current_user(request, session)
    room, match, _ = await room_and_match(session, room_id, now)
    value = await data(session)
    if value is None:
        raise ApiError(502, "PROVIDER_UNAVAILABLE", "Room data is unavailable")
    return await room_summary(session, room, match, value, user, now)


@router.get("/rooms", response_model=Page)
async def rooms(
    request: Request,
    competition: str = Query(...),
    kind: str | None = Query(None),
    limit: int = Query(20, ge=1, le=100),
    session: AsyncSession = Depends(get_session),
) -> Page:
    value = await data(session)
    if value is None or competition != value["competition"]["code"]:
        raise ApiError(422, "INVALID_INPUT", "Unsupported competition")
    now = await current_now(request, session)
    user = await current_user(request, session)
    rows = list(
        (await session.scalars(select(RoomRecord).order_by(RoomRecord.id))).all()
    )
    items = []
    for room in rows:
        if kind and room.kind != kind:
            continue
        match = await session.get(Match, room.match_id)
        if match and await effective_status(room, match, now) != "HIDDEN":
            items.append(await room_summary(session, room, match, value, user, now))
    return Page(items=items[:limit], next_cursor=None)


@router.get("/matches/{match_id}/rooms", response_model=Page)
async def match_rooms(
    match_id: str,
    request: Request,
    kind: str | None = Query(None),
    limit: int = Query(20, ge=1, le=100),
    session: AsyncSession = Depends(get_session),
) -> Page:
    response = await rooms(request, "PL", kind, limit, session)
    return Page(
        items=[item for item in response.items if str(item.match_id) == match_id],
        next_cursor=None,
    )


@router.post("/matches/{match_id}/rooms", response_model=RoomSummary, status_code=201)
async def create_room(
    match_id: str,
    payload: RoomCreateRequest,
    request: Request,
    session: AsyncSession = Depends(get_session),
) -> RoomSummary:
    user = await current_user(request, session)
    if user is None:
        raise ApiError(401, "UNAUTHENTICATED", "Authentication is required")
    if user.plan != "PREMIUM" and user.role != "EDITOR":
        raise ApiError(403, "PREMIUM_REQUIRED", "Premium membership is required")
    now = await current_now(request, session)
    match = await session.get(Match, match_id)
    if match is None:
        raise ApiError(404, "NOT_FOUND", "Match was not found")
    if not await can_create(match, payload.kind.value, user, now):
        raise ApiError(409, "ROOM_CLOSED", "A room of this kind cannot be created now")
    room = RoomRecord(
        id=str(uuid4()),
        match_id=match_id,
        kind=payload.kind.value,
        title=html.escape(payload.title.strip()),
        status="OPEN",
        created_by_user_id=user.id,
    )
    session.add(room)
    await session.commit()
    value = await data(session)
    assert value is not None
    return await room_summary(session, room, match, value, user, now)


@router.post("/rooms/{room_id}/messages", response_model=RoomMessage, status_code=201)
async def post_message(
    room_id: str,
    payload: RoomMessageRequest,
    request: Request,
    session: AsyncSession = Depends(get_session),
) -> RoomMessage:
    user = await current_user(request, session)
    if user is None:
        raise ApiError(401, "UNAUTHENTICATED", "Authentication is required")
    now = await current_now(request, session)
    room, match, state = await room_and_match(session, room_id, now)
    if state != "OPEN":
        raise ApiError(409, "ROOM_CLOSED", "This room is read-only")
    body = html.escape(payload.body.strip())
    if not body or len(body) > 2000:
        raise ApiError(
            422, "INVALID_INPUT", "Message body must be between 1 and 2000 characters"
        )
    moderation = (
        "FLAGGED"
        if any(word in body.lower() for word in ("spam", "abuse"))
        else "VISIBLE"
    )
    item = RoomMessageRecord(
        room_id=room.id, user_id=user.id, body=body, moderation_state=moderation
    )
    session.add(item)
    await session.flush()
    seq = (
        await session.scalar(
            select(func.max(RoomChangeEvent.seq)).where(
                RoomChangeEvent.room_id == room.id
            )
        )
    ) or 0
    session.add(
        RoomChangeEvent(room_id=room.id, seq=seq + 1, kind="UPSERT", message_id=item.id)
    )
    await session.commit()
    return await message_view(session, item)


@router.get("/rooms/{room_id}/messages", response_model=RoomMessagesPage)
async def messages(
    room_id: str,
    request: Request,
    limit: int = Query(20, ge=1, le=100),
    cursor: str | None = Query(None),
    after_id: str | None = Query(None),
    session: AsyncSession = Depends(get_session),
) -> RoomMessagesPage:
    if cursor and after_id:
        raise ApiError(
            422, "INVALID_INPUT", "cursor and after_id are mutually exclusive"
        )
    now = await current_now(request, session)
    room, _, _ = await room_and_match(session, room_id, now)
    visible = list(
        (
            await session.scalars(
                select(RoomMessageRecord)
                .where(
                    RoomMessageRecord.room_id == room.id,
                    RoomMessageRecord.moderation_state != "HIDDEN",
                )
                .order_by(RoomMessageRecord.created_at, RoomMessageRecord.id)
            )
        ).all()
    )
    if after_id:
        anchor = await session.get(RoomMessageRecord, after_id)
        if anchor is None or anchor.room_id != room.id:
            raise ApiError(422, "INVALID_INPUT", "Invalid message anchor")
        items = [
            item
            for item in visible
            if (item.created_at, item.id) > (anchor.created_at, anchor.id)
        ][:limit]
        next_cursor = None
    else:
        if cursor:
            try:
                anchor_time, anchor_id = (
                    base64.urlsafe_b64decode(cursor + "=" * (-len(cursor) % 4))
                    .decode()
                    .split("|", 1)
                )
            except (ValueError, UnicodeDecodeError, binascii.Error):
                raise ApiError(422, "INVALID_INPUT", "Invalid message cursor") from None
            visible = [
                item
                for item in visible
                if (iso(item.created_at), item.id) < (anchor_time, anchor_id)
            ]
        selected = visible[-limit:]
        items = selected
        next_cursor = (
            base64.urlsafe_b64encode(
                f"{iso(selected[0].created_at)}|{selected[0].id}".encode()
            )
            .decode()
            .rstrip("=")
            if len(visible) > len(selected) and selected
            else None
        )
    high = (
        await session.scalar(
            select(func.max(RoomChangeEvent.seq)).where(
                RoomChangeEvent.room_id == room.id
            )
        )
    ) or 0
    return RoomMessagesPage(
        items=[await message_view(session, item) for item in items],
        next_cursor=next_cursor,
        sync_after_seq=high,
    )


@router.get("/rooms/{room_id}/changes", response_model=RoomChangePage)
async def changes(
    room_id: str,
    request: Request,
    after_seq: int = Query(..., ge=0),
    limit: int = Query(20, ge=1, le=100),
    session: AsyncSession = Depends(get_session),
) -> RoomChangePage:
    now = await current_now(request, session)
    room, _, _ = await room_and_match(session, room_id, now)
    high = (
        await session.scalar(
            select(func.max(RoomChangeEvent.seq)).where(
                RoomChangeEvent.room_id == room.id
            )
        )
    ) or 0
    if after_seq > high:
        raise ApiError(422, "INVALID_INPUT", "after_seq exceeds the room sequence")
    events = list(
        (
            await session.scalars(
                select(RoomChangeEvent)
                .where(
                    RoomChangeEvent.room_id == room.id, RoomChangeEvent.seq > after_seq
                )
                .order_by(RoomChangeEvent.seq)
                .limit(limit)
            )
        ).all()
    )
    output: list[RoomChangeUpsert | RoomChangeRemove] = []
    for event in events:
        item = await session.get(RoomMessageRecord, event.message_id)
        if (
            event.kind == "UPSERT"
            and item is not None
            and item.moderation_state != "HIDDEN"
        ):
            output.append(
                RoomChangeUpsert(
                    seq=event.seq,
                    kind="UPSERT",
                    message_id=UUID(event.message_id),
                    message=await message_view(session, item),
                )
            )
        else:
            output.append(
                RoomChangeRemove(
                    seq=event.seq, kind="REMOVE", message_id=UUID(event.message_id)
                )
            )
    final = events[-1].seq if events else after_seq
    more = bool(
        await session.scalar(
            select(RoomChangeEvent.id)
            .where(RoomChangeEvent.room_id == room.id, RoomChangeEvent.seq > final)
            .limit(1)
        )
    )
    return RoomChangePage(items=output, next_after_seq=final, has_more=more)


@router.post("/reports", response_model=ReportResponse, status_code=201)
async def report(
    payload: ReportRequest,
    request: Request,
    session: AsyncSession = Depends(get_session),
) -> ReportResponse:
    user = await current_user(request, session)
    if user is None:
        raise ApiError(401, "UNAUTHENTICATED", "Authentication is required")
    if await session.get(RoomMessageRecord, str(payload.target_id)) is None:
        raise ApiError(404, "NOT_FOUND", "Message was not found")
    item = ReportRecord(
        reporter_user_id=user.id,
        target_kind=payload.target_kind,
        target_id=str(payload.target_id),
        reason=payload.reason,
    )
    session.add(item)
    await session.commit()
    return ReportResponse(id=UUID(item.id), status="OPEN")
