"""Create local-only FREE/PREMIUM demo accounts without printing credentials."""
from __future__ import annotations

import asyncio

from sqlalchemy import select

from app.core.config import get_settings
from app.core.security import hash_password
from app.db.models import UserRecord
from app.db.session import configure_database


async def seed() -> None:
    settings = get_settings()
    pairs = ((settings.matchline_demo_free_email, settings.matchline_demo_free_password, "FREE"), (settings.matchline_demo_premium_email, settings.matchline_demo_premium_password, "PREMIUM"))
    if settings.app_env not in {"development", "test"} or any(email is None or password is None for email, password, _ in pairs):
        raise RuntimeError("local DEMO account credentials must be supplied in ignored environment configuration")
    class Holder: pass
    holder = Holder(); holder.state = type("State", (), {})()
    configure_database(holder, settings.database_url)
    async with holder.state.session_factory() as session:
        for email, password, plan in pairs:
            user = await session.scalar(select(UserRecord).where(UserRecord.email == email.lower()))
            if user is None:
                session.add(UserRecord(email=email.lower(), display_name=f"Demo {plan.title()}", password_hash=hash_password(password.get_secret_value()), plan=plan))
            else:
                user.plan = plan
                user.password_hash = hash_password(password.get_secret_value())
        await session.commit()


if __name__ == "__main__":
    asyncio.run(seed())
