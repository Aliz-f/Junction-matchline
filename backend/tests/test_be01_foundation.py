from __future__ import annotations

import asyncio
from pathlib import Path

from fastapi.testclient import TestClient

from app.core.config import Settings
from app.db.models import Base
from app.main import create_app


def client() -> TestClient:
    app = create_app(Settings(database_url="postgresql+asyncpg://matchline:unavailable@127.0.0.1:65432/matchline"))
    return TestClient(app)


def test_health_and_meta_are_available_without_database() -> None:
    with client() as test_client:
        health = test_client.get("/api/v1/health")
        assert health.status_code == 200
        assert health.json() == {"status": "ok", "database": "degraded"}
        meta = test_client.get("/api/v1/meta")
        assert meta.status_code == 200
        assert meta.json()["mode"] == "DEMO"
        assert meta.json()["capabilities"] == {
            "whatif_sharing": False,
            "events": False,
            "live_updates": False,
        }


def test_write_without_exact_origin_has_canonical_csrf_error() -> None:
    with client() as test_client:
        response = test_client.post("/api/v1/auth/register", json={})
    assert response.status_code == 403
    assert response.json()["error"]["code"] == "CSRF_ORIGIN_INVALID"
    assert set(response.json()["error"]) == {"code", "message", "details", "request_id"}


def test_openapi_exposes_required_auth_statuses_and_request_bodies() -> None:
    with client() as test_client:
        paths = test_client.get("/openapi.json").json()["paths"]
    assert "201" in paths["/api/v1/auth/register"]["post"]["responses"]
    assert "200" in paths["/api/v1/auth/login"]["post"]["responses"]
    assert "204" in paths["/api/v1/auth/logout"]["post"]["responses"]
    assert "requestBody" in paths["/api/v1/matches/{id}/predictions"]["post"]
    assert "requestBody" in paths["/api/v1/whatif/threads/{thread_id}/messages"]["post"]


def test_auth_contract_sets_cookie_and_logout_is_empty(tmp_path: Path) -> None:
    database_url = f"sqlite+aiosqlite:///{tmp_path}/matchline.db"
    app = create_app(Settings(database_url=database_url))

    async def create_tables() -> None:
        async with app.state.db_engine.begin() as connection:
            await connection.run_sync(Base.metadata.create_all)

    asyncio.run(create_tables())
    headers = {"Origin": "http://localhost:3000"}
    with TestClient(app) as test_client:
        register = test_client.post(
            "/api/v1/auth/register",
            headers=headers,
            json={
                "email": "supporter@example.test",
                "display_name": "Supporter",
                "password": "safe-test-password",
            },
        )
        assert register.status_code == 201
        assert register.json()["user"]["plan"] == "FREE"
        assert test_client.get("/api/v1/auth/me").json()["user"]["display_name"] == "Supporter"
        logout = test_client.post("/api/v1/auth/logout", headers=headers)
        assert logout.status_code == 204
        assert logout.content == b""
        assert test_client.get("/api/v1/auth/me").json() == {"user": None}
