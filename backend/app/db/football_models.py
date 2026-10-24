"""Normalized BE-02 football, runtime, and audit persistence models."""
from __future__ import annotations

from datetime import UTC, datetime
from uuid import uuid4

from sqlalchemy import (
    JSON,
    Boolean,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Integer,
    String,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.db.models import Base


def now() -> datetime:
    return datetime.now(UTC)


class Competition(Base):
    __tablename__ = "competitions"
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    code: Mapped[str] = mapped_column(String(16), unique=True)
    name: Mapped[str] = mapped_column(String(160))
    brand_key: Mapped[str] = mapped_column(String(64))
    country_code: Mapped[str] = mapped_column(String(8))


class Season(Base):
    __tablename__ = "seasons"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    competition_id: Mapped[str] = mapped_column(ForeignKey("competitions.id"), index=True)
    start_year: Mapped[int] = mapped_column(Integer)
    __table_args__ = (UniqueConstraint("competition_id", "start_year"),)


class Team(Base):
    __tablename__ = "teams"
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    provider: Mapped[str] = mapped_column(String(32), default="demo")
    provider_id: Mapped[str] = mapped_column(String(128))
    name: Mapped[str] = mapped_column(String(160))
    short_name: Mapped[str] = mapped_column(String(80))
    crest_url: Mapped[str | None] = mapped_column(String(500))
    __table_args__ = (UniqueConstraint("provider", "provider_id"),)


class Venue(Base):
    __tablename__ = "venues"
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    name: Mapped[str] = mapped_column(String(160))
    lat: Mapped[float | None]
    lng: Mapped[float | None]
    coord_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    coord_source: Mapped[str | None] = mapped_column(String(500))


class SeasonTeamHomeVenue(Base):
    """Verified season-specific home association; never inferred from fixtures."""
    __tablename__ = "season_team_home_venues"
    season_id: Mapped[str] = mapped_column(ForeignKey("seasons.id"), primary_key=True)
    team_id: Mapped[str] = mapped_column(ForeignKey("teams.id"), primary_key=True)
    venue_id: Mapped[str] = mapped_column(ForeignKey("venues.id"), primary_key=True)
    source_ref: Mapped[str] = mapped_column(String(500))


class Match(Base):
    __tablename__ = "matches"
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    provider: Mapped[str] = mapped_column(String(32), default="demo")
    provider_id: Mapped[str] = mapped_column(String(128))
    competition_id: Mapped[str] = mapped_column(ForeignKey("competitions.id"), index=True)
    season_id: Mapped[str] = mapped_column(ForeignKey("seasons.id"), index=True)
    matchday: Mapped[int | None]
    home_team_id: Mapped[str] = mapped_column(ForeignKey("teams.id"), index=True)
    away_team_id: Mapped[str] = mapped_column(ForeignKey("teams.id"), index=True)
    venue_id: Mapped[str | None] = mapped_column(ForeignKey("venues.id"))
    kickoff_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    status: Mapped[str] = mapped_column(String(16))
    home_score: Mapped[int | None]
    away_score: Mapped[int | None]
    capabilities: Mapped[dict[str, object]] = mapped_column(JSON, default=dict)
    __table_args__ = (UniqueConstraint("provider", "provider_id"), CheckConstraint("home_team_id <> away_team_id"),)


class MatchEventRecord(Base):
    __tablename__ = "match_events"
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    match_id: Mapped[str] = mapped_column(ForeignKey("matches.id"), index=True)
    kind: Mapped[str] = mapped_column(String(16))
    minute: Mapped[int | None]
    team_id: Mapped[str | None] = mapped_column(ForeignKey("teams.id"))
    player_name: Mapped[str | None] = mapped_column(String(160))
    related_player_name: Mapped[str | None] = mapped_column(String(160))
    description: Mapped[str] = mapped_column(String(500), default="")
    source_ref: Mapped[str] = mapped_column(String(200))


class RuntimeState(Base):
    __tablename__ = "app_runtime_state"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, default=1)
    mode: Mapped[str] = mapped_column(String(16), default="DEMO")
    demo_clock_utc: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    demo_epoch: Mapped[int] = mapped_column(Integer, default=1)
    scenario_name: Mapped[str] = mapped_column(String(32), default="baseline")
    scenario_revision: Mapped[int] = mapped_column(Integer, default=1)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now, onupdate=now)


class AuditRecord(Base):
    """Reserved append-only audit rows for later room/prediction/What-if services."""
    __tablename__ = "moderation_actions"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    message_id: Mapped[str] = mapped_column(String(36), index=True)
    operator_identifier: Mapped[str] = mapped_column(String(160))
    action: Mapped[str] = mapped_column(String(32), default="HIDE")
    reason: Mapped[str] = mapped_column(String(500))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)


class StandingsSnapshot(Base):
    __tablename__ = "standings_snapshots"
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    competition_id: Mapped[str] = mapped_column(ForeignKey("competitions.id"), index=True)
    season_id: Mapped[str] = mapped_column(ForeignKey("seasons.id"), index=True)
    effective_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    source_version: Mapped[str] = mapped_column(String(128))
    table_json: Mapped[list[dict[str, object]]] = mapped_column(JSON)
    is_official: Mapped[bool] = mapped_column(Boolean, default=False)


class RoomChangeEvent(Base):
    """Body-free event history; message content is projected only by BE-06."""
    __tablename__ = "room_change_events"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    room_id: Mapped[str] = mapped_column(String(36), index=True)
    seq: Mapped[int] = mapped_column(Integer)
    kind: Mapped[str] = mapped_column(String(16))
    message_id: Mapped[str] = mapped_column(String(36))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    __table_args__ = (UniqueConstraint("room_id", "seq"),)


class ProviderSyncRun(Base):
    __tablename__ = "provider_sync_runs"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    provider: Mapped[str] = mapped_column(String(32))
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    status: Mapped[str] = mapped_column(String(32))
    records_processed: Mapped[int] = mapped_column(Integer, default=0)
    error_message: Mapped[str | None] = mapped_column(String(500))


class PredictionRecord(Base):
    __tablename__ = "predictions"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    match_id: Mapped[str] = mapped_column(ForeignKey("matches.id"), index=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    outcome: Mapped[str] = mapped_column(String(8))
    home_score: Mapped[int | None]
    away_score: Mapped[int | None]
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    submitted_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    status: Mapped[str] = mapped_column(String(16), default="PENDING")
    points: Mapped[int | None]
    __table_args__ = (
        UniqueConstraint("match_id", "user_id"),
        CheckConstraint("(home_score IS NULL AND away_score IS NULL) OR (home_score >= 0 AND away_score >= 0)"),
        CheckConstraint(
            "(home_score IS NULL AND away_score IS NULL) OR "
            "(outcome = 'HOME' AND home_score > away_score) OR "
            "(outcome = 'DRAW' AND home_score = away_score) OR "
            "(outcome = 'AWAY' AND home_score < away_score)",
            name="ck_predictions_score_direction",
        ),
    )


class PredictionRevision(Base):
    __tablename__ = "prediction_revisions"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    prediction_id: Mapped[str] = mapped_column(ForeignKey("predictions.id"), index=True)
    revision: Mapped[int] = mapped_column(Integer)
    payload_json: Mapped[dict[str, object]] = mapped_column(JSON)
    idempotency_key: Mapped[str] = mapped_column(String(36))
    accepted_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    __table_args__ = (UniqueConstraint("prediction_id", "revision"), UniqueConstraint("prediction_id", "idempotency_key"))


class PredictionRequestRecord(Base):
    __tablename__ = "prediction_requests"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    match_id: Mapped[str] = mapped_column(ForeignKey("matches.id"), index=True)
    idempotency_key: Mapped[str] = mapped_column(String(36))
    request_hash: Mapped[str] = mapped_column(String(64))
    response_status: Mapped[int] = mapped_column(Integer)
    response_snapshot_json: Mapped[dict[str, object]] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    __table_args__ = (UniqueConstraint("user_id", "match_id", "idempotency_key"),)


class RoomRecord(Base):
    __tablename__ = "rooms"
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    match_id: Mapped[str] = mapped_column(ForeignKey("matches.id"), index=True)
    kind: Mapped[str] = mapped_column(String(16))
    title: Mapped[str] = mapped_column(String(200))
    status: Mapped[str] = mapped_column(String(16), default="OPEN")


class RoomMessageRecord(Base):
    __tablename__ = "room_messages"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    room_id: Mapped[str] = mapped_column(ForeignKey("rooms.id"), index=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"))
    body: Mapped[str] = mapped_column(String(2000))
    moderation_state: Mapped[str] = mapped_column(String(16), default="VISIBLE")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)


class WhatifThreadRecord(Base):
    __tablename__ = "whatif_threads"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    match_id: Mapped[str] = mapped_column(ForeignKey("matches.id"), index=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    title: Mapped[str | None] = mapped_column(String(200))
    visibility: Mapped[str] = mapped_column(String(16), default="PRIVATE")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)


class ReportRecord(Base):
    __tablename__ = "reports"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    reporter_user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    target_kind: Mapped[str] = mapped_column(String(32))
    target_id: Mapped[str] = mapped_column(String(36))
    reason: Mapped[str] = mapped_column(String(500))
    status: Mapped[str] = mapped_column(String(16), default="OPEN")
