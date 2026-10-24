"""Pydantic v2 DTO definitions for the frozen Appendix A v2.4 contract.

This module deliberately contains no persistence or business logic.  BE-01 and
later tasks replace stub handlers while preserving these public shapes.
"""

from __future__ import annotations

from enum import Enum
from typing import Annotated, Any, Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, StrictInt, model_validator

Utc = Annotated[str, Field(pattern=r"^.+Z$")]


class ContractModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class MatchStatus(str, Enum):
    SCHEDULED = "SCHEDULED"
    LIVE = "LIVE"
    HALFTIME = "HALFTIME"
    FINISHED = "FINISHED"
    POSTPONED = "POSTPONED"
    CANCELLED = "CANCELLED"
    SUSPENDED = "SUSPENDED"
    UNKNOWN = "UNKNOWN"


class Plan(str, Enum):
    FREE = "FREE"
    PREMIUM = "PREMIUM"


class Role(str, Enum):
    USER = "USER"
    EDITOR = "EDITOR"


class RoomKind(str, Enum):
    PRE_MATCH = "PRE_MATCH"
    POST_MATCH = "POST_MATCH"


class RoomStatus(str, Enum):
    OPEN = "OPEN"
    READ_ONLY = "READ_ONLY"
    HIDDEN = "HIDDEN"


class Outcome(str, Enum):
    HOME = "HOME"
    DRAW = "DRAW"
    AWAY = "AWAY"


class PredictionStatus(str, Enum):
    PENDING = "PENDING"
    SCORED = "SCORED"
    VOID = "VOID"


class ErrorBody(ContractModel):
    code: str
    message: str
    details: dict[str, Any]
    request_id: str


class ErrorEnvelope(ContractModel):
    error: ErrorBody


class MetaCapabilities(ContractModel):
    whatif_sharing: Literal[False] = False
    events: bool
    live_updates: bool


class MetaView(ContractModel):
    mode: Literal["DEMO", "LIVE"]
    default_competition: Literal["PL"]
    default_season_start_year: int
    server_now_utc: Utc
    demo_clock_frozen: bool
    demo_epoch: int | None
    scenario_revision: int | None
    capabilities: MetaCapabilities


class UserPublic(ContractModel):
    id: UUID
    display_name: str
    plan: Plan
    role: Role
    favorite_team_id: UUID | None


class AuthUserResponse(ContractModel):
    user: UserPublic | None


class FavoriteRequest(ContractModel):
    team_id: UUID


class FavoriteResponse(ContractModel):
    favorite_team_id: UUID


class RegisterRequest(ContractModel):
    email: str
    display_name: str
    password: str


class LoginRequest(ContractModel):
    email: str
    password: str


class TeamSummary(ContractModel):
    id: UUID
    name: str
    short_name: str
    crest_url: str | None


class CompetitionSummary(ContractModel):
    id: UUID
    code: str
    name: str
    brand_key: str
    country_code: str


class CompetitionsResponse(ContractModel):
    items: list[CompetitionSummary]


class TeamsResponse(ContractModel):
    items: list[TeamSummary]


class MatchdaysResponse(ContractModel):
    items: list[int]


class VenueSummary(ContractModel):
    id: UUID
    name: str
    lat: float | None
    lng: float | None
    coord_verified: bool


class MatchScore(ContractModel):
    home: int | None
    away: int | None


class SourceView(ContractModel):
    kind: Literal["DEMO_SYNTHETIC", "LIVE_PROVIDER"]
    is_stale: bool
    last_synced_at: Utc | None
    data_version: str


class MatchFeatures(ContractModel):
    pre_match_room: bool
    predictions_open: bool
    whatif_available: bool
    post_match_room: bool


class MatchSummary(ContractModel):
    id: UUID
    competition: CompetitionSummary
    season_start_year: int
    matchday: int | None
    kickoff_at: Utc
    status: MatchStatus
    home_team: TeamSummary
    away_team: TeamSummary
    score: MatchScore
    venue: VenueSummary | None
    source: SourceView
    features: MatchFeatures


class MatchEvent(ContractModel):
    id: UUID
    kind: Literal["GOAL", "SUB", "CARD", "OTHER"]
    minute: int | None
    team_id: UUID | None
    player_name: str | None
    related_player_name: str | None
    description: str
    source_ref: str


class MatchDetail(MatchSummary):
    events: list[MatchEvent]
    statistics: dict[str, Any] | None
    lineups: dict[str, Any] | None
    data_capabilities: dict[Literal["events", "lineups", "player_stats"], bool]


class Page(ContractModel):
    items: list[Any]
    next_cursor: str | None


class HealthResponse(ContractModel):
    status: Literal["ok"]
    database: Literal["ok", "degraded"]


class PredictionRequest(ContractModel):
    outcome: Outcome
    home_score: StrictInt | None
    away_score: StrictInt | None

    @model_validator(mode="after")
    def score_pair_matches_outcome(self) -> "PredictionRequest":
        if (self.home_score is None) != (self.away_score is None):
            raise ValueError("home_score and away_score must both be null or both be present")
        if self.home_score is None:
            return self
        if self.home_score < 0 or self.away_score < 0:
            raise ValueError("scores must be nonnegative")
        actual = Outcome.DRAW
        if self.home_score > self.away_score:
            actual = Outcome.HOME
        elif self.home_score < self.away_score:
            actual = Outcome.AWAY
        if actual != self.outcome:
            raise ValueError("scores must imply the requested outcome")
        return self


class RoomCreateRequest(ContractModel):
    title: str
    kind: RoomKind


class RoomMessageRequest(ContractModel):
    body: str


class ReportRequest(ContractModel):
    target_kind: Literal["ROOM_MESSAGE"]
    target_id: UUID
    reason: str


class WhatifThreadRequest(ContractModel):
    title: str | None = None


class WhatifMessageRequest(ContractModel):
    message: Annotated[str, Field(min_length=10, max_length=2000)]
    client_message_id: UUID
