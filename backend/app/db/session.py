"""Lazy async SQLAlchemy setup; importing the app never connects to the database."""

from __future__ import annotations

from collections.abc import AsyncIterator

from fastapi import Request
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine


def configure_database(app: object, database_url: str) -> None:
    engine = create_async_engine(database_url, pool_pre_ping=True)
    app.state.db_engine = engine  # type: ignore[attr-defined]
    app.state.session_factory = async_sessionmaker(engine, expire_on_commit=False)  # type: ignore[attr-defined]


async def get_session(request: Request) -> AsyncIterator[AsyncSession]:
    factory: async_sessionmaker[AsyncSession] = request.app.state.session_factory
    async with factory() as session:
        yield session
