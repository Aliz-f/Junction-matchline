"""Authenticated preference and profile endpoints."""
from __future__ import annotations

from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.auth import current_user, user_public
from app.core.errors import ApiError
from app.db.session import get_session
from app.providers.demo import DemoSportsDataProvider
from app.schemas.contract import FavoriteRequest, FavoriteResponse, UserProfile

router = APIRouter(prefix="/api/v1/users/me", tags=["profile"])


async def require_user(request: Request, session: AsyncSession):
    user = await current_user(request, session)
    if user is None:
        raise ApiError(401, "UNAUTHENTICATED", "Authentication is required")
    return user


@router.put("/favorite-team", response_model=FavoriteResponse)
async def favorite(payload: FavoriteRequest, request: Request, session: AsyncSession = Depends(get_session)) -> FavoriteResponse:
    user = await require_user(request, session)
    data = await DemoSportsDataProvider().normalized_season("PL", 2026)
    team_ids = {team["id"] for team in data["teams"]}
    if str(payload.team_id) not in team_ids:
        raise ApiError(422, "INVALID_INPUT", "Team is not in the current Premier League season")
    user.favorite_team_id = str(payload.team_id)
    await session.commit()
    return FavoriteResponse(favorite_team_id=payload.team_id)


@router.get("/profile", response_model=UserProfile)
async def profile(request: Request, session: AsyncSession = Depends(get_session)) -> UserProfile:
    user = await require_user(request, session)
    return UserProfile(**user_public(user).model_dump(), prediction_summary={"scored_count": 0, "correct_outcomes": 0, "total_points": 0}, active_badges=[])
