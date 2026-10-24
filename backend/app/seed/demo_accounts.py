"""Server-only local demo-account seeding; credentials never leave Settings."""
from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings
from app.core.security import hash_password
from app.db.models import UserRecord


def validated_demo_accounts(settings: Settings) -> tuple[tuple[str, str, str], ...]:
    pairs = (
        (settings.matchline_demo_free_email, settings.matchline_demo_free_password, "FREE"),
        (settings.matchline_demo_premium_email, settings.matchline_demo_premium_password, "PREMIUM"),
    )
    if settings.app_env not in {"development", "test"}:
        raise RuntimeError("local DEMO account credentials must be supplied in ignored environment configuration")
    normalized: list[tuple[str, str, str]] = []
    for email, password, plan in pairs:
        if email is None or password is None:
            raise RuntimeError("local DEMO account credentials must be supplied in ignored environment configuration")
        normalized.append((email.lower(), password.get_secret_value(), plan))
    return tuple(normalized)


async def seed_demo_accounts(session: AsyncSession, settings: Settings) -> None:
    """Create or rotate the two configured demo identities without emitting secrets."""
    for email, password, plan in validated_demo_accounts(settings):
        user = await session.scalar(select(UserRecord).where(UserRecord.email == email))
        if user is None:
            session.add(
                UserRecord(
                    email=email,
                    display_name=f"Demo {plan.title()}",
                    password_hash=hash_password(password),
                    plan=plan,
                )
            )
        else:
            user.plan = plan
            user.password_hash = hash_password(password)
