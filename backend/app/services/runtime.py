"""Authoritative persisted demo clock access."""
from __future__ import annotations

from datetime import UTC, datetime

from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.football_models import RuntimeState


async def runtime_state(session: AsyncSession, fallback: datetime) -> tuple[datetime, int | None, int | None]:
    try:
        state = await session.get(RuntimeState, 1)
    except (ConnectionError, OSError, SQLAlchemyError):
        # Contract-only and first-run local harnesses may not have run Alembic.
        # They use the configured immutable fallback; seeded deployments never do.
        return fallback.astimezone(UTC), None, None
    if state is None:
        return fallback.astimezone(UTC), None, None
    value = state.demo_clock_utc
    if value.tzinfo is None:
        value = value.replace(tzinfo=UTC)
    return value.astimezone(UTC), state.demo_epoch, state.scenario_revision
