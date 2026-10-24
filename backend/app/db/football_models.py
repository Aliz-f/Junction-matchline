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
    capabilities: Mapped[dict] = mapped_column(JSON, default=dict)
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
