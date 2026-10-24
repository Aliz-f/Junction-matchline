"""Guarded, backend-only room moderation command; no HTTP equivalent exists."""
from __future__ import annotations

import argparse
import asyncio
from types import SimpleNamespace
from uuid import UUID

from sqlalchemy import func, select

from app.core.config import get_settings
from app.db.football_models import (
    AuditRecord,
    RoomChangeEvent,
    RoomMessageRecord,
    RoomRecord,
)
from app.db.session import configure_database


async def hide_message(message_id: str, reason: str) -> None:
    settings = get_settings()
    if not settings.matchline_moderation_cli_enabled or not settings.matchline_moderation_operator:
        raise RuntimeError("moderation CLI is disabled or has no protected operator identity")
    holder = SimpleNamespace(state=SimpleNamespace())
    configure_database(holder, settings.database_url)
    async with holder.state.session_factory() as session:
        message = await session.get(RoomMessageRecord, message_id, with_for_update=True)
        if message is None:
            raise RuntimeError("room message not found")
        await session.scalar(
            select(RoomRecord)
            .where(RoomRecord.id == message.room_id)
            .with_for_update()
        )
        if message.moderation_state != "HIDDEN":
            message.moderation_state = "HIDDEN"
            seq = (await session.scalar(select(func.max(RoomChangeEvent.seq)).where(RoomChangeEvent.room_id == message.room_id))) or 0
            session.add(AuditRecord(message_id=message.id, operator_identifier=settings.matchline_moderation_operator, action="HIDE", reason=reason))
            session.add(RoomChangeEvent(room_id=message.room_id, seq=seq + 1, kind="REMOVE", message_id=message.id))
        await session.commit()


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--message-id", required=True, type=UUID)
    parser.add_argument("--action", choices=("hide",), required=True)
    parser.add_argument("--reason", required=True)
    args = parser.parse_args()
    asyncio.run(hide_message(str(args.message_id), args.reason))
