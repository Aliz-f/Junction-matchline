from __future__ import annotations

import asyncio
from pathlib import Path

from fastapi.testclient import TestClient

from app.core.config import Settings
from app.db.football_models import RoomRecord
from app.db.models import Base
from app.main import create_app
from app.seed.service import seed_demo


def test_hidden_post_match_template_is_indistinguishable_from_unknown_room(
    tmp_path: Path,
) -> None:
    app = create_app(
        Settings(
            database_url=f"sqlite+aiosqlite:///{(tmp_path / 'rooms.db').as_posix()}"
        )
    )

    async def prepare() -> None:
        async with app.state.db_engine.begin() as connection:
            await connection.run_sync(Base.metadata.create_all)
        async with app.state.session_factory() as session:
            await seed_demo(session)
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

    asyncio.run(prepare())
    hidden = "70000000-0000-4000-8000-000000000099"
    unknown = "70000000-0000-4000-8000-000000000098"
    with TestClient(app) as client:
        for suffix in ("", "/messages", "/changes?after_seq=0"):
            hidden_response = client.get(f"/api/v1/rooms/{hidden}{suffix}")
            unknown_response = client.get(f"/api/v1/rooms/{unknown}{suffix}")
            assert hidden_response.status_code == unknown_response.status_code == 404
            assert (
                hidden_response.json()["error"]["code"]
                == unknown_response.json()["error"]["code"]
                == "NOT_FOUND"
            )
            assert hidden_response.headers["Cache-Control"] == "private, no-store"
            assert hidden_response.headers["Vary"] == "Cookie"
    asyncio.run(app.state.db_engine.dispose())


def test_open_seeded_room_exposes_empty_change_baseline(tmp_path: Path) -> None:
    app = create_app(
        Settings(
            database_url=f"sqlite+aiosqlite:///{(tmp_path / 'rooms.db').as_posix()}"
        )
    )

    async def prepare() -> None:
        async with app.state.db_engine.begin() as connection:
            await connection.run_sync(Base.metadata.create_all)
        async with app.state.session_factory() as session:
            await seed_demo(session)

    asyncio.run(prepare())
    with TestClient(app) as client:
        messages = client.get(
            "/api/v1/rooms/70000000-0000-4000-8000-000000000010/messages"
        )
        changes = client.get(
            "/api/v1/rooms/70000000-0000-4000-8000-000000000010/changes?after_seq=0"
        )
    assert messages.status_code == changes.status_code == 200
    assert messages.json()["items"] == []
    assert messages.json()["sync_after_seq"] == 0
    assert changes.json() == {"items": [], "next_after_seq": 0, "has_more": False}
    asyncio.run(app.state.db_engine.dispose())
