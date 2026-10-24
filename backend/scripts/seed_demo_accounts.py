"""Create local-only FREE/PREMIUM demo accounts without printing credentials."""
from __future__ import annotations

import asyncio
from types import SimpleNamespace

from app.core.config import get_settings
from app.db.session import configure_database
from app.seed.demo_accounts import seed_demo_accounts


async def seed() -> None:
    settings = get_settings()
    holder = SimpleNamespace(state=SimpleNamespace())
    configure_database(holder, settings.database_url)
    async with holder.state.session_factory() as session:
        await seed_demo_accounts(session, settings)
        await session.commit()


if __name__ == "__main__":
    asyncio.run(seed())
