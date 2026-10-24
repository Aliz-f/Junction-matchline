"""Cookie-based authentication endpoints defined by Appendix A."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from typing import Any, cast
from uuid import UUID

from fastapi import APIRouter, Depends, Request, Response
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import ApiError
from app.core.security import hash_password, hash_session_token, new_session_token, password_matches
from app.db.models import SessionRecord, UserRecord
from app.db.session import get_session
from app.schemas.contract import AuthUserResponse, ErrorEnvelope, LoginRequest, Plan, RegisterRequest, Role, UserPublic

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])
ERRORS: dict[int | str, dict[str, Any]] = {401: {"model": ErrorEnvelope}, 403: {"model": ErrorEnvelope}, 409: {"model": ErrorEnvelope}, 422: {"model": ErrorEnvelope}}


def user_public(user: UserRecord) -> UserPublic:
    return UserPublic(
        id=UUID(user.id),
        display_name=user.display_name,
        plan=Plan(user.plan),
        role=Role(user.role),
        favorite_team_id=UUID(user.favorite_team_id) if user.favorite_team_id else None,
    )


async def current_user(request: Request, session: AsyncSession) -> UserRecord | None:
    token = request.cookies.get(request.app.state.settings.session_cookie_name)
    if not token:
        return None
    result = await session.execute(
        select(SessionRecord, UserRecord)
        .join(UserRecord, UserRecord.id == SessionRecord.user_id)
        .where(SessionRecord.token_sha256 == hash_session_token(token))
    )
    row = result.first()
    if row is None:
        return None
    stored_session, user = row
    expires_at = stored_session.expires_at
    if expires_at.tzinfo is None:
        # SQLite does not round-trip timezone information even for a
        # timezone-aware column; application timestamps are always UTC.
        expires_at = expires_at.replace(tzinfo=UTC)
    if stored_session.revoked_at is not None or expires_at <= datetime.now(UTC):
        return None
    return cast(UserRecord, user)


def set_session_cookie(response: Response, request: Request, token: str) -> None:
    settings = request.app.state.settings
    response.set_cookie(
        settings.session_cookie_name,
        token,
        httponly=True,
        secure=settings.session_cookie_secure,
        samesite="lax",
        max_age=settings.session_ttl_days * 86_400,
        path="/api/v1",
    )


async def issue_session(response: Response, request: Request, session: AsyncSession, user: UserRecord) -> None:
    token = new_session_token()
    session.add(
        SessionRecord(
            user_id=user.id,
            token_sha256=hash_session_token(token),
            expires_at=datetime.now(UTC) + timedelta(days=request.app.state.settings.session_ttl_days),
        )
    )
    await session.commit()
    set_session_cookie(response, request, token)


@router.post("/register", response_model=AuthUserResponse, status_code=201, responses=ERRORS)
async def register(payload: RegisterRequest, request: Request, response: Response, session: AsyncSession = Depends(get_session)) -> AuthUserResponse:
    email = payload.email.strip().lower()
    existing = await session.scalar(select(UserRecord).where(UserRecord.email == email))
    if existing is not None:
        raise ApiError(409, "EMAIL_ALREADY_REGISTERED", "An account already uses this email")
    user = UserRecord(email=email, display_name=payload.display_name.strip(), password_hash=hash_password(payload.password))
    session.add(user)
    await session.flush()
    await issue_session(response, request, session, user)
    return AuthUserResponse(user=user_public(user))


@router.post("/login", response_model=AuthUserResponse, responses=ERRORS)
async def login(payload: LoginRequest, request: Request, response: Response, session: AsyncSession = Depends(get_session)) -> AuthUserResponse:
    user = await session.scalar(select(UserRecord).where(UserRecord.email == payload.email.strip().lower()))
    if user is None or not password_matches(user.password_hash, payload.password):
        raise ApiError(401, "UNAUTHENTICATED", "Email or password is incorrect")
    await issue_session(response, request, session, user)
    return AuthUserResponse(user=user_public(user))


@router.post("/logout", status_code=204, response_class=Response, responses=ERRORS)
async def logout(request: Request, session: AsyncSession = Depends(get_session)) -> Response:
    if await current_user(request, session) is None:
        raise ApiError(401, "UNAUTHENTICATED", "Authentication is required")
    token = request.cookies.get(request.app.state.settings.session_cookie_name)
    if token:
        stored = await session.scalar(select(SessionRecord).where(SessionRecord.token_sha256 == hash_session_token(token)))
        if stored is not None:
            stored.revoked_at = datetime.now(UTC)
            await session.commit()
    response = Response(status_code=204)
    response.delete_cookie(request.app.state.settings.session_cookie_name, path="/api/v1")
    return response


@router.get("/me", response_model=AuthUserResponse, responses=ERRORS)
async def me(request: Request, session: AsyncSession = Depends(get_session)) -> AuthUserResponse:
    user = await current_user(request, session)
    return AuthUserResponse(user=user_public(user) if user else None)
