"""Matchline ASGI application factory for the BE-01 foundation."""

from __future__ import annotations

import logging
from datetime import UTC, datetime
from uuid import uuid4

from fastapi import FastAPI, Query, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.api.v1.auth import router as auth_router
from app.core.config import Settings, get_settings
from app.core.errors import (
    ApiError,
    api_error_handler,
    error_response,
    http_error_handler,
    unexpected_error_handler,
    validation_error_handler,
)
from app.core.logging import SecretRedactionFilter
from app.db.session import configure_database
from app.providers.demo import DemoSportsDataProvider
from app.schemas.contract import (
    CompetitionsResponse,
    CompetitionSummary,
    ErrorEnvelope,
    FavoriteRequest,
    FavoriteResponse,
    HealthResponse,
    MatchdaysResponse,
    MetaCapabilities,
    MetaView,
    PredictionRequest,
    ReportRequest,
    RoomCreateRequest,
    RoomMessageRequest,
    TeamsResponse,
    TeamSummary,
    WhatifMessageRequest,
    WhatifThreadRequest,
)

ERRORS = {401: {"model": ErrorEnvelope}, 403: {"model": ErrorEnvelope}, 409: {"model": ErrorEnvelope}, 422: {"model": ErrorEnvelope}, 502: {"model": ErrorEnvelope}}


def utc_z(value: datetime) -> str:
    return value.astimezone(UTC).isoformat().replace("+00:00", "Z")


async def database_healthy(request: Request) -> bool:
    try:
        async with request.app.state.db_engine.connect() as connection:
            await connection.execute(text("SELECT 1"))
    except Exception:
        return False
    return True


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or get_settings()
    app = FastAPI(title="Matchline API", version="0.1.0", openapi_url="/openapi.json")
    app.state.settings = settings
    logging.getLogger("matchline").addFilter(SecretRedactionFilter())
    configure_database(app, settings.database_url)
    app.add_middleware(CORSMiddleware, allow_origins=settings.allowed_origins, allow_credentials=True, allow_methods=["GET", "POST", "PUT", "OPTIONS"], allow_headers=["Content-Type", "Idempotency-Key"])

    @app.middleware("http")
    async def request_context_and_origin_policy(request: Request, call_next: object) -> object:
        request.state.request_id = str(uuid4())
        if request.url.path.startswith("/api/v1/") and request.method in {"POST", "PUT", "PATCH", "DELETE"}:
            origin = request.headers.get("origin", "").rstrip("/")
            if origin not in settings.allowed_origins:
                return error_response(request, 403, "CSRF_ORIGIN_INVALID", "Request Origin is not allowed")
        response = await call_next(request)  # type: ignore[operator]
        if request.url.path.startswith("/api/v1/"):
            response.headers["Cache-Control"] = "private, no-store"
            response.headers["Vary"] = "Cookie"
        response.headers["X-Request-ID"] = request.state.request_id
        return response

    app.add_exception_handler(ApiError, api_error_handler)
    app.add_exception_handler(RequestValidationError, validation_error_handler)
    app.add_exception_handler(StarletteHTTPException, http_error_handler)
    app.add_exception_handler(Exception, unexpected_error_handler)

    @app.get("/api/v1/health", response_model=HealthResponse, responses=ERRORS)
    @app.get("/health", response_model=HealthResponse, include_in_schema=False)
    async def health(request: Request) -> HealthResponse:
        return HealthResponse(status="ok", database="ok" if await database_healthy(request) else "degraded")

    @app.get("/api/v1/meta", response_model=MetaView, responses=ERRORS)
    async def meta() -> MetaView:
        demo = settings.mode == "DEMO"
        now = settings.demo_clock_iso if demo else datetime.now(UTC)
        return MetaView(mode=settings.mode, default_competition="PL", default_season_start_year=2026, server_now_utc=utc_z(now), demo_clock_frozen=demo, demo_epoch=1 if demo else None, scenario_revision=1 if demo else None, capabilities=MetaCapabilities(whatif_sharing=False, events=False, live_updates=False))

    app.include_router(auth_router)

    provider = DemoSportsDataProvider()

    async def season_data() -> dict[str, object]:
        return await provider.normalized_season("PL", 2026)

    @app.get("/api/v1/competitions", response_model=CompetitionsResponse, responses=ERRORS)
    async def competitions() -> CompetitionsResponse:
        data = await season_data()
        competition = data["competition"]
        assert isinstance(competition, dict)
        return CompetitionsResponse(
            items=[
                CompetitionSummary(
                    id=competition["id"],
                    code=competition["code"],
                    name=competition["name"],
                    brand_key=competition["brand_key"],
                    country_code=competition["country_code"],
                )
            ]
        )

    @app.get("/api/v1/teams", response_model=TeamsResponse, responses=ERRORS)
    async def teams(competition: str = Query(...)) -> TeamsResponse:
        data = await season_data()
        competition_data = data["competition"]
        assert isinstance(competition_data, dict)
        if competition != competition_data["code"]:
            raise ApiError(422, "INVALID_INPUT", "Unsupported competition", {"field": "competition"})
        raw_teams = data["teams"]
        assert isinstance(raw_teams, list)
        return TeamsResponse(items=sorted((TeamSummary(crest_url=None, **team) for team in raw_teams), key=lambda team: team.name))

    @app.get("/api/v1/competitions/{code}/matchdays", response_model=MatchdaysResponse, responses=ERRORS)
    async def matchdays(code: str, season: int = Query(...)) -> MatchdaysResponse:
        data = await season_data()
        competition_data = data["competition"]
        assert isinstance(competition_data, dict)
        if code != competition_data["code"] or season != competition_data["season_start_year"]:
            raise ApiError(422, "INVALID_INPUT", "Unsupported competition season")
        fixtures = data["fixtures"]
        assert isinstance(fixtures, list)
        return MatchdaysResponse(items=sorted({fixture["matchday"] for fixture in fixtures}))

    async def stub(request: Request) -> JSONResponse:
        return error_response(request, 502, "PROVIDER_UNAVAILABLE", "This Phase 1 endpoint is not available in the current backend slice")

    def route(path: str, methods: list[str], response_model: type | None = None) -> None:
        async def handler(request: Request) -> JSONResponse:
            return await stub(request)
        app.add_api_route(path, handler, methods=methods, response_model=response_model, responses=ERRORS, name=f"contract_{'_'.join(methods).lower()}_{path.replace('/', '_')}")

    for path in ("/api/v1/journey", "/api/v1/matches", "/api/v1/matches/{id}", "/api/v1/map/stadiums", "/api/v1/standings", "/api/v1/matches/{id}/impact", "/api/v1/impact/relevant", "/api/v1/matches/{id}/rooms", "/api/v1/rooms", "/api/v1/rooms/{id}", "/api/v1/rooms/{id}/messages", "/api/v1/rooms/{id}/changes", "/api/v1/matches/{id}/predictions/me", "/api/v1/matches/{id}/leaderboard", "/api/v1/matches/{id}/whatif/threads", "/api/v1/users/me/whatif/threads", "/api/v1/whatif/threads/{thread_id}", "/api/v1/users/me/profile", "/api/v1/users/me/badges", "/api/v1/users/me/predictions"):
        route(path, ["GET"])
    async def body_stub(request: Request) -> JSONResponse:
        return await stub(request)

    @app.put("/api/v1/users/me/favorite-team", response_model=FavoriteResponse, responses=ERRORS)
    async def favorite_stub(_: FavoriteRequest, request: Request) -> JSONResponse:
        return await body_stub(request)

    @app.post("/api/v1/matches/{id}/rooms", responses=ERRORS)
    async def room_stub(id: str, _: RoomCreateRequest, request: Request) -> JSONResponse:
        del id
        return await body_stub(request)

    @app.post("/api/v1/rooms/{id}/messages", responses=ERRORS)
    async def room_message_stub(id: str, _: RoomMessageRequest, request: Request) -> JSONResponse:
        del id
        return await body_stub(request)

    @app.post("/api/v1/reports", responses=ERRORS)
    async def report_stub(_: ReportRequest, request: Request) -> JSONResponse:
        return await body_stub(request)

    @app.post("/api/v1/matches/{id}/predictions", responses=ERRORS)
    async def prediction_stub(id: str, _: PredictionRequest, request: Request) -> JSONResponse:
        del id
        return await body_stub(request)

    @app.post("/api/v1/matches/{id}/whatif/threads", responses=ERRORS)
    async def whatif_thread_stub(id: str, _: WhatifThreadRequest, request: Request) -> JSONResponse:
        del id
        return await body_stub(request)

    @app.post("/api/v1/whatif/threads/{thread_id}/messages", responses=ERRORS)
    async def whatif_message_stub(thread_id: str, _: WhatifMessageRequest, request: Request) -> JSONResponse:
        del thread_id
        return await body_stub(request)
    return app


app = create_app()
