"""Pre-G0 importable FastAPI route catalogue.

Handlers are intentional 501 stubs; the frozen path/method/request contract is
available to FE-00 without pretending later feature work has been completed.
"""

from __future__ import annotations

from fastapi import FastAPI
from fastapi.responses import JSONResponse

from app.schemas.contract import (
    AuthUserResponse,
    ErrorEnvelope,
    FavoriteRequest,
    FavoriteResponse,
    HealthResponse,
    LoginRequest,
    MetaView,
    PredictionRequest,
    RegisterRequest,
    ReportRequest,
    RoomCreateRequest,
    RoomMessageRequest,
    WhatifMessageRequest,
    WhatifThreadRequest,
)

app = FastAPI(title="Matchline API", version="0.0.0-be00", openapi_url="/openapi.json")

ERRORS = {501: {"model": ErrorEnvelope, "description": "BE-00 route stub"}}


def stub() -> JSONResponse:
    return JSONResponse(
        status_code=501,
        content={
            "error": {
                "code": "NOT_IMPLEMENTED",
                "message": "BE-00 contract stub",
                "details": {},
                "request_id": "be00",
            }
        },
    )


def route(path: str, methods: list[str], response_model: type | None = None) -> None:
    async def handler() -> JSONResponse:
        return stub()

    app.add_api_route(
        path,
        handler,
        methods=methods,
        response_model=response_model,
        responses=ERRORS,
        name=f"be00_{'_'.join(methods).lower()}_{path.replace('/', '_')}",
    )


route("/api/v1/health", ["GET"], HealthResponse)
route("/api/v1/meta", ["GET"], MetaView)
route("/api/v1/auth/me", ["GET"], AuthUserResponse)
route("/api/v1/auth/logout", ["POST"])
for path in (
    "/api/v1/competitions",
    "/api/v1/teams",
    "/api/v1/competitions/{code}/matchdays",
    "/api/v1/journey",
    "/api/v1/matches",
    "/api/v1/matches/{id}",
    "/api/v1/map/stadiums",
    "/api/v1/standings",
    "/api/v1/matches/{id}/impact",
    "/api/v1/impact/relevant",
    "/api/v1/matches/{id}/rooms",
    "/api/v1/rooms",
    "/api/v1/rooms/{id}",
    "/api/v1/rooms/{id}/messages",
    "/api/v1/rooms/{id}/changes",
    "/api/v1/matches/{id}/predictions/me",
    "/api/v1/matches/{id}/leaderboard",
    "/api/v1/matches/{id}/whatif/threads",
    "/api/v1/users/me/whatif/threads",
    "/api/v1/whatif/threads/{thread_id}",
    "/api/v1/users/me/profile",
    "/api/v1/users/me/badges",
    "/api/v1/users/me/predictions",
):
    route(path, ["GET"])


@app.post("/api/v1/auth/register", response_model=AuthUserResponse, responses=ERRORS)
async def register(_: RegisterRequest) -> JSONResponse:
    return stub()


@app.post("/api/v1/auth/login", response_model=AuthUserResponse, responses=ERRORS)
async def login(_: LoginRequest) -> JSONResponse:
    return stub()


@app.put(
    "/api/v1/users/me/favorite-team", response_model=FavoriteResponse, responses=ERRORS
)
async def put_favorite(_: FavoriteRequest) -> JSONResponse:
    return stub()


@app.post("/api/v1/matches/{id}/rooms", responses=ERRORS)
async def create_room(id: str, _: RoomCreateRequest) -> JSONResponse:
    del id
    return stub()


@app.post("/api/v1/rooms/{id}/messages", responses=ERRORS)
async def post_room_message(id: str, _: RoomMessageRequest) -> JSONResponse:
    del id
    return stub()


@app.post("/api/v1/reports", responses=ERRORS)
async def report(_: ReportRequest) -> JSONResponse:
    return stub()


@app.post("/api/v1/matches/{id}/predictions", responses=ERRORS)
async def predict(id: str, _: PredictionRequest) -> JSONResponse:
    del id
    return stub()


@app.post("/api/v1/matches/{id}/whatif/threads", responses=ERRORS)
async def create_whatif_thread(id: str, _: WhatifThreadRequest) -> JSONResponse:
    del id
    return stub()


@app.post("/api/v1/whatif/threads/{thread_id}/messages", responses=ERRORS)
async def post_whatif_message(thread_id: str, _: WhatifMessageRequest) -> JSONResponse:
    del thread_id
    return stub()
