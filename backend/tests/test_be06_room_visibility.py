from __future__ import annotations

from datetime import UTC, datetime
from pathlib import Path
from types import SimpleNamespace

import httpx
import pytest

from app.api.v1.rooms import effective_status
from app.core.config import Settings
from app.db.football_models import RoomRecord
from app.db.models import Base
from app.main import create_app
from app.seed.service import seed_demo


async def seeded_app(tmp_path: Path):
    app = create_app(
        Settings(database_url=f"sqlite+aiosqlite:///{(tmp_path / 'rooms.db').as_posix()}")
    )
    async with app.state.db_engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)
    async with app.state.session_factory() as session:
        await seed_demo(session)
    return app


@pytest.mark.asyncio
async def test_hidden_post_match_template_is_indistinguishable_from_unknown_room(
    tmp_path: Path,
) -> None:
    app = await seeded_app(tmp_path)
    async with app.state.session_factory() as session:
        session.add(
            RoomRecord(
                id="70000000-0000-4000-8000-000000000099",
                match_id="30000000-0000-4000-8000-000000000001",
                kind="POST_MATCH",
                title="Hidden template",
                status="HIDDEN",
            )
        )
        await session.commit()

    hidden = "70000000-0000-4000-8000-000000000099"
    unknown = "70000000-0000-4000-8000-000000000098"
    try:
        async with httpx.AsyncClient(
            transport=httpx.ASGITransport(app=app), base_url="http://testserver"
        ) as client:
            for suffix in ("", "/messages", "/changes?after_seq=0"):
                hidden_response = await client.get(f"/api/v1/rooms/{hidden}{suffix}")
                unknown_response = await client.get(f"/api/v1/rooms/{unknown}{suffix}")
                assert hidden_response.status_code == unknown_response.status_code == 404
                assert hidden_response.json()["error"]["code"] == "NOT_FOUND"
                assert unknown_response.json()["error"]["code"] == "NOT_FOUND"
                assert hidden_response.headers["Cache-Control"] == "private, no-store"
                assert hidden_response.headers["Vary"] == "Cookie"
    finally:
        await app.state.db_engine.dispose()


@pytest.mark.asyncio
async def test_open_seeded_room_exposes_empty_change_baseline(tmp_path: Path) -> None:
    app = await seeded_app(tmp_path)
    try:
        async with httpx.AsyncClient(
            transport=httpx.ASGITransport(app=app), base_url="http://testserver"
        ) as client:
            messages = await client.get(
                "/api/v1/rooms/70000000-0000-4000-8000-000000000010/messages"
            )
            changes = await client.get(
                "/api/v1/rooms/70000000-0000-4000-8000-000000000010/changes?after_seq=0"
            )
        assert messages.status_code == changes.status_code == 200
        assert messages.json()["items"] == []
        assert messages.json()["sync_after_seq"] == 0
        assert changes.json() == {"items": [], "next_after_seq": 0, "has_more": False}
    finally:
        await app.state.db_engine.dispose()


@pytest.mark.asyncio
async def test_explicit_read_only_room_never_reopens() -> None:
    room = SimpleNamespace(status="READ_ONLY", kind="PRE_MATCH")
    match = SimpleNamespace(
        status="SCHEDULED", kickoff_at=datetime(2026, 11, 1, 15, 0, tzinfo=UTC)
    )
    assert await effective_status(room, match, datetime(2026, 11, 1, 14, 0, tzinfo=UTC)) == "READ_ONLY"


def test_room_list_openapi_has_typed_cursor_pagination() -> None:
    app = create_app(Settings(database_url="sqlite+aiosqlite:///:memory:"))
    paths = app.openapi()["paths"]
    for path in ("/api/v1/rooms", "/api/v1/matches/{match_id}/rooms"):
        operation = paths[path]["get"]
        assert any(parameter["name"] == "cursor" for parameter in operation["parameters"])
        assert operation["responses"]["200"]["content"]["application/json"]["schema"] == {
            "$ref": "#/components/schemas/RoomPage"
        }
