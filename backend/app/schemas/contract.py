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


class UserProfile(UserPublic):
    prediction_summary: dict[str, int]
    active_badges: list[dict[str, str]]


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


class JourneyResponse(ContractModel):
    items: list[MatchSummary]
    team_id: UUID
    season_start_year: int


class StadiumFixture(ContractModel):
    match: MatchSummary


class StadiumVenue(ContractModel):
    venue_id: UUID
    name: str
    lat: float
    lng: float
    coord_verified: Literal[True]
    home_team_ids: list[UUID]
    illumination_state: Literal[
        "UPCOMING_ROUND",
        "LIVE",
        "COMPLETED",
        "INACTIVE",
        "POSTPONED_OR_CANCELLED",
        "UNKNOWN",
    ]
    fixtures: list[StadiumFixture]


class UnmappedMatch(ContractModel):
    match: MatchSummary
    reason: Literal["VENUE_MISSING", "VENUE_COORDINATES_UNVERIFIED"]


class StadiumMapResponse(ContractModel):
    competition: str
    season_start_year: int
    selected: dict[str, int | str | None]
    stadiums: list[StadiumVenue]
    unmapped_matches: list[UnmappedMatch]
    source: SourceView


class StandingsRow(ContractModel):
    team_id: UUID
    position: int | None
    played: int
    won: int
    drawn: int
    lost: int
    goals_for: int
    goals_against: int
    goal_difference: int
    points: int


class StandingsResponse(ContractModel):
    competition: str
    season_start_year: int
    snapshot_id: UUID
    as_of: Utc
    source: SourceView
    rows: list[StandingsRow]


class GapEffect(ContractModel):
    affected_team_id: UUID
    gap_before: int
    gap_after: int
    gap_delta: int
    # This is always the favourite's movement: rank before minus rank after.
    position_change: int | None
    position_note: str | None


class ImpactScenario(ContractModel):
    outcome: Outcome
    is_hypothetical: bool
    effects: list[GapEffect]


class SourceReference(ContractModel):
    ref: str
    label: str


class ImpactInsight(ContractModel):
    match_id: UUID
    match: MatchSummary
    favorite_team_id: UUID
    relevance: Literal["HIGH", "MEDIUM", "LOW", "NONE", "UNKNOWN"]
    basis: Literal["POINTS_GAP", "NONE", "INSUFFICIENT_DATA"]
    data_version: str | None
    verified_at: Utc | None
    actual_outcome: Outcome | None
    scenarios: list[ImpactScenario]
    summary: str
    summary_type: Literal["TEMPLATE", "AI_EXPLANATION"]
    caveats: list[str]
    sources: list[SourceReference]


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
            raise ValueError(
                "home_score and away_score must both be null or both be present"
            )
        if self.home_score is None:
            return self
        assert self.away_score is not None
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


class BadgeView(ContractModel):
    code: str
    label: str
    earned_at: Utc
    active: bool
    rule_description: str


class AuthorPublic(ContractModel):
    id: UUID
    display_name: str
    public_badges: list[BadgeView]


class RoomSummary(ContractModel):
    id: UUID
    match_id: UUID
    match: MatchSummary
    kind: RoomKind
    title: str
    status: RoomStatus
    created_by: AuthorPublic | None
    message_count: int
    can_post: bool
    can_create: bool


class RoomPage(ContractModel):
    """Typed room-list envelope; unlike generic ``Page``, its items are contractual."""

    items: list[RoomSummary]
    next_cursor: str | None


class RoomMessage(ContractModel):
    id: UUID
    room_id: UUID
    body: str
    created_at: Utc
    author: AuthorPublic
    moderation_state: Literal["VISIBLE", "FLAGGED"]


class RoomMessagesPage(ContractModel):
    items: list[RoomMessage]
    next_cursor: str | None
    sync_after_seq: int


class RoomChangeUpsert(ContractModel):
    seq: int
    kind: Literal["UPSERT"]
    message_id: UUID
    message: RoomMessage


class RoomChangeRemove(ContractModel):
    seq: int
    kind: Literal["REMOVE"]
    message_id: UUID
    message: None = None


class RoomChangePage(ContractModel):
    items: list[RoomChangeUpsert | RoomChangeRemove]
    next_after_seq: int
    has_more: bool


class ReportResponse(ContractModel):
    id: UUID
    status: Literal["OPEN"]


class ReportRequest(ContractModel):
    target_kind: Literal["ROOM_MESSAGE"]
    target_id: UUID
    reason: str


class WhatifThreadRequest(ContractModel):
    title: str | None = None


class WhatifMessageRequest(ContractModel):
    message: Annotated[str, Field(min_length=10, max_length=2000)]
    client_message_id: UUID
