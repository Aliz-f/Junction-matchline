"""Protected FREE/PREMIUM account reset behavior used by BE-03 handoff."""
from __future__ import annotations

from collections.abc import AsyncIterator

import pytest
from pydantic import SecretStr
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import Settings
from app.db.models import Base, UserRecord
from app.seed.demo_accounts import seed_demo_accounts


@pytest.fixture
async def database_session() -> AsyncIterator[AsyncSession]:
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)
    factory = async_sessionmaker(engine, expire_on_commit=False)
    async with factory() as session:
        yield session
    await engine.dispose()


@pytest.mark.asyncio
async def test_demo_account_seed_creates_free_and_premium_without_exposing_secrets(
    database_session: AsyncSession,
) -> None:
    settings = Settings(
        app_env="test",
        matchline_demo_free_email="free@example.test",
        matchline_demo_free_password=SecretStr("free-password"),
        matchline_demo_premium_email="premium@example.test",
        matchline_demo_premium_password=SecretStr("premium-password"),
    )
    await seed_demo_accounts(database_session, settings)
    await database_session.commit()
    users = list((await database_session.scalars(select(UserRecord).order_by(UserRecord.email))).all())
    assert [(item.id, item.email, item.plan, item.favorite_team_id) for item in users] == [
        ("90000000-0000-4000-8000-000000000001", "free@example.test", "FREE", "20000000-0000-4000-8000-000000000001"),
        ("90000000-0000-4000-8000-000000000002", "premium@example.test", "PREMIUM", "20000000-0000-4000-8000-000000000002"),
    ]
    assert all("password" not in item.password_hash.lower() for item in users)
