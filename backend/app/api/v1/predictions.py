"""Authenticated prediction endpoints."""
from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, Header, Query, Request, Response
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.auth import current_user
from app.api.v1.football import read_data
from app.core.errors import ApiError
from app.db.football_models import PredictionRecord
from app.db.models import UserRecord
from app.db.session import get_session
from app.schemas.contract import (
    BadgesResponse,
    LeaderboardResponse,
    PredictionHistoryItem,
    PredictionHistoryResponse,
    PredictionMineResponse,
    PredictionRequest,
    PredictionView,
)
from app.services.demo_football import fixture_by_id, summary
from app.services.predictions import (
    current_prediction,
    prediction_view,
    upsert_prediction,
)

router = APIRouter(prefix="/api/v1", tags=["predictions"])


async def require_user(request: Request, session: AsyncSession) -> UserRecord:
    user = await current_user(request, session)
    if user is None:
        raise ApiError(401, "UNAUTHENTICATED", "Authentication is required")
    return user


@router.post("/matches/{id}/predictions", response_model=PredictionView)
async def post_prediction(id: str, payload: PredictionRequest, request: Request,
                          response: Response, idempotency_key: UUID = Header(..., alias="Idempotency-Key"),
                          session: AsyncSession = Depends(get_session)) -> PredictionView:
    user = await require_user(request, session)
    view, status = await upsert_prediction(session, user=user, match_id=id, key=idempotency_key,
        outcome=payload.outcome, home_score=payload.home_score, away_score=payload.away_score,
        fallback_now=request.app.state.settings.demo_clock_iso)
    response.status_code = status
    return view


@router.get("/matches/{id}/predictions/me", response_model=PredictionMineResponse)
async def mine(id: str, request: Request, session: AsyncSession = Depends(get_session)) -> PredictionMineResponse:
    user = await require_user(request, session)
    row = await current_prediction(session, user.id, id)
    return PredictionMineResponse(prediction=prediction_view(row) if row else None)


@router.get("/users/me/predictions", response_model=PredictionHistoryResponse)
async def history(request: Request, limit: int = Query(20, ge=1, le=100),
                  session: AsyncSession = Depends(get_session)) -> PredictionHistoryResponse:
    user = await require_user(request, session)
    rows = list((await session.scalars(select(PredictionRecord).where(PredictionRecord.user_id == user.id)
        .order_by(PredictionRecord.submitted_at.desc(), PredictionRecord.id).limit(limit))).all())
    data = await read_data(session)
    return PredictionHistoryResponse(items=[PredictionHistoryItem(prediction=prediction_view(row), match=summary(fixture, data))
        for row in rows if (fixture := fixture_by_id(data, row.match_id))], next_cursor=None)


@router.get("/matches/{id}/leaderboard", response_model=LeaderboardResponse)
async def leaderboard(id: str, session: AsyncSession = Depends(get_session)) -> LeaderboardResponse:
    del id, session
    return LeaderboardResponse(items=[])


@router.get("/users/me/badges", response_model=BadgesResponse)
async def badges(request: Request, session: AsyncSession = Depends(get_session)) -> BadgesResponse:
    await require_user(request, session)
    return BadgesResponse(items=[])
