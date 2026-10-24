"""Transactional prediction lifecycle helpers for the BE-07 API."""
from __future__ import annotations

import hashlib
import json
from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import ApiError
from app.db.football_models import (
    Match,
    PredictionRecord,
    PredictionRequestRecord,
    PredictionRevision,
)
from app.db.models import UserRecord
from app.schemas.contract import (
    Outcome,
    PredictionBreakdown,
    PredictionStatus,
    PredictionView,
)
from app.services.runtime import runtime_state


def iso_z(value: datetime | None) -> str | None:
    if value is None:
        return None
    if value.tzinfo is None:
        value = value.replace(tzinfo=UTC)
    return value.astimezone(UTC).isoformat().replace("+00:00", "Z")


def required_iso_z(value: datetime) -> str:
    result = iso_z(value)
    assert result is not None
    return result


def request_hash(outcome: Outcome, home_score: int | None, away_score: int | None) -> str:
    body = json.dumps(
        {"away_score": away_score, "home_score": home_score, "outcome": outcome.value},
        separators=(",", ":"), sort_keys=True,
    )
    return hashlib.sha256(body.encode("utf-8")).hexdigest()


def prediction_view(row: PredictionRecord) -> PredictionView:
    breakdown = None
    if row.points is not None:
        outcome_points = 3 if row.points >= 3 else 0
        breakdown = PredictionBreakdown(outcome_points=outcome_points, exact_score_points=row.points - outcome_points)
    return PredictionView(
        id=UUID(row.id), match_id=UUID(row.match_id), outcome=Outcome(row.outcome),
        home_score=row.home_score, away_score=row.away_score, created_at=required_iso_z(row.created_at),
        submitted_at=required_iso_z(row.submitted_at), locked_at=iso_z(row.locked_at),
        status=PredictionStatus(row.status), points=row.points, breakdown=breakdown,
    )


async def current_prediction(session: AsyncSession, user_id: str, match_id: str) -> PredictionRecord | None:
    row = await session.scalar(select(PredictionRecord).where(PredictionRecord.user_id == user_id, PredictionRecord.match_id == match_id))
    return row if isinstance(row, PredictionRecord) else None


async def upsert_prediction(
    session: AsyncSession, *, user: UserRecord, match_id: str, key: UUID,
    outcome: Outcome, home_score: int | None, away_score: int | None, fallback_now: datetime,
) -> tuple[PredictionView, int]:
    digest = request_hash(outcome, home_score, away_score)
    async with session.begin_nested():
        replay = await session.scalar(
            select(PredictionRequestRecord).where(
                PredictionRequestRecord.user_id == user.id,
                PredictionRequestRecord.match_id == match_id,
                PredictionRequestRecord.idempotency_key == str(key),
            )
        )
        if replay is not None:
            if replay.request_hash != digest:
                raise ApiError(409, "IDEMPOTENCY_CONFLICT", "Idempotency key was used with a different request")
            return PredictionView.model_validate(replay.response_snapshot_json), replay.response_status

        match = await session.scalar(select(Match).where(Match.id == match_id).with_for_update())
        if match is None:
            raise ApiError(404, "NOT_FOUND", "Match was not found")
        now, _, _ = await runtime_state(session, fallback_now)
        kickoff = match.kickoff_at
        if kickoff.tzinfo is None:
            kickoff = kickoff.replace(tzinfo=UTC)
        if match.status != "SCHEDULED" or now >= kickoff:
            existing = await current_prediction(session, user.id, match_id)
            if existing is not None and existing.locked_at is None:
                existing.locked_at = now
            raise ApiError(409, "PREDICTION_CLOSED", "Predictions are closed for this match")

        row = await current_prediction(session, user.id, match_id)
        status = 200
        if row is None:
            row = PredictionRecord(user_id=user.id, match_id=match_id, outcome=outcome.value,
                                   home_score=home_score, away_score=away_score, status="PENDING", points=None,
                                   created_at=now, submitted_at=now)
            session.add(row)
            status = 201
            await session.flush()
            session.add(PredictionRevision(prediction_id=row.id, revision=1,
                                           payload_json={"outcome": outcome.value, "home_score": home_score, "away_score": away_score},
                                           idempotency_key=str(key)))
        elif (row.outcome, row.home_score, row.away_score) != (outcome.value, home_score, away_score):
            row.outcome, row.home_score, row.away_score = outcome.value, home_score, away_score
            row.submitted_at = now
            revision = await session.scalar(select(PredictionRevision.revision).where(
                PredictionRevision.prediction_id == row.id).order_by(PredictionRevision.revision.desc()).limit(1))
            session.add(PredictionRevision(prediction_id=row.id, revision=(revision or 0) + 1,
                                           payload_json={"outcome": outcome.value, "home_score": home_score, "away_score": away_score},
                                           idempotency_key=str(key)))
        await session.flush()
        view = prediction_view(row)
        session.add(PredictionRequestRecord(user_id=user.id, match_id=match_id, idempotency_key=str(key),
                                             request_hash=digest, response_status=status,
                                             response_snapshot_json=view.model_dump(mode="json")))
    await session.commit()
    return view, status


async def settle_finished_predictions(session: AsyncSession, match_ids: list[str]) -> None:
    """Idempotently score only verified finished matches in the current transaction."""
    matches = list((await session.scalars(select(Match).where(Match.id.in_(match_ids), Match.status == "FINISHED"))).all())
    for match in matches:
        if match.home_score is None or match.away_score is None:
            continue
        predictions = list((await session.scalars(select(PredictionRecord).where(PredictionRecord.match_id == match.id))).all())
        for row in predictions:
            if row.status != "PENDING":
                continue
            correct_outcome = ((match.home_score > match.away_score and row.outcome == "HOME") or
                               (match.home_score == match.away_score and row.outcome == "DRAW") or
                               (match.home_score < match.away_score and row.outcome == "AWAY"))
            exact = row.home_score == match.home_score and row.away_score == match.away_score
            row.points = (3 if correct_outcome else 0) + (2 if correct_outcome and exact else 0)
            row.status = "SCORED"
            row.scored_at = datetime.now(UTC)
