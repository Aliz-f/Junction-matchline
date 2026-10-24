/**
 * Appendix A v2.4 (A1 + A3) DTO contract as runtime Zod schemas.
 *
 * Temporary pre-G0 source of frontend API types (FE-G0.4): once backend
 * `/openapi.json` conforms to Appendix A, `lib/api/types.ts` is regenerated
 * from it and these schemas remain as the runtime conformance check for mocks.
 * All objects are `.strict()` because the contract is closed; response fields
 * are always present and absent values are explicit `null`.
 */
import { z } from "zod";

// A1 scalar formats --------------------------------------------------------

/** Canonical RFC4122 UUID string. */
export const Uuid = z.string().uuid();
/** RFC3339 UTC timestamp `YYYY-MM-DDTHH:mm:ssZ`. */
export const Utc = z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/, "UTC RFC3339 ending in Z");
/** Europe/London civil date `YYYY-MM-DD`. */
export const CivilDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const NonNegativeInt = z.number().int().nonnegative();

// A1 enums ------------------------------------------------------------------

export const MatchStatus = z.enum([
  "SCHEDULED",
  "LIVE",
  "HALFTIME",
  "FINISHED",
  "POSTPONED",
  "CANCELLED",
  "SUSPENDED",
  "UNKNOWN",
]);
export const Illumination = z.enum([
  "UPCOMING_ROUND",
  "LIVE",
  "COMPLETED",
  "INACTIVE",
  "POSTPONED_OR_CANCELLED",
  "UNKNOWN",
]);
export const Plan = z.enum(["FREE", "PREMIUM"]);
export const Role = z.enum(["USER", "EDITOR"]);
export const RoomKind = z.enum(["PRE_MATCH", "POST_MATCH"]);
export const RoomStatus = z.enum(["OPEN", "READ_ONLY", "HIDDEN"]);
export const Relevance = z.enum(["HIGH", "MEDIUM", "LOW", "NONE", "UNKNOWN"]);
export const SourceKind = z.enum(["DEMO_SYNTHETIC", "LIVE_PROVIDER"]);
export const PredictionStatus = z.enum(["PENDING", "SCORED", "VOID"]);
export const Outcome = z.enum(["HOME", "DRAW", "AWAY"]);

// A1 error envelope -----------------------------------------------------------

/** Every A1 error code with its single HTTP status. */
export const ERROR_STATUS = {
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  PREMIUM_REQUIRED: 403,
  CSRF_ORIGIN_INVALID: 403,
  NOT_FOUND: 404,
  PREDICTION_CLOSED: 409,
  ROOM_CLOSED: 409,
  MATCH_NOT_FINISHED: 409,
  IDEMPOTENCY_CONFLICT: 409,
  WHATIF_THREAD_BUSY: 409,
  WHATIF_TURN_SUPERSEDED: 409,
  WHATIF_THREAD_LIMIT: 409,
  INVALID_INPUT: 422,
  RATE_LIMITED: 429,
  PROVIDER_UNAVAILABLE: 502,
  AI_UNAVAILABLE: 503,
} as const;
export type ErrorCode = keyof typeof ERROR_STATUS;
export const ErrorCodeSchema = z.enum(Object.keys(ERROR_STATUS) as [ErrorCode, ...ErrorCode[]]);

export const ErrorEnvelope = z
  .object({
    error: z
      .object({
        code: ErrorCodeSchema,
        message: z.string().min(1),
        details: z.record(z.unknown()),
        request_id: z.string().min(1),
      })
      .strict(),
  })
  .strict();

// A3 DTOs ---------------------------------------------------------------------

export const Page = <T extends z.ZodTypeAny>(item: T) =>
  z.object({ items: z.array(item), next_cursor: z.string().nullable() }).strict();
export const Items = <T extends z.ZodTypeAny>(item: T) => z.object({ items: z.array(item) }).strict();

export const HealthResponse = z
  .object({ status: z.literal("ok"), database: z.enum(["ok", "degraded"]) })
  .strict();

export const MetaView = z
  .object({
    mode: z.enum(["DEMO", "LIVE"]),
    default_competition: z.literal("PL"),
    default_season_start_year: z.number().int(),
    server_now_utc: Utc,
    demo_clock_frozen: z.boolean(),
    demo_epoch: z.number().int().nullable(),
    scenario_revision: z.number().int().nullable(),
    capabilities: z
      .object({ whatif_sharing: z.literal(false), events: z.boolean(), live_updates: z.boolean() })
      .strict(),
  })
  .strict();

export const UserPublic = z
  .object({
    id: Uuid,
    display_name: z.string(),
    plan: Plan,
    role: Role,
    favorite_team_id: Uuid.nullable(),
  })
  .strict();
export const AuthMeResponse = z.object({ user: UserPublic.nullable() }).strict();
export const AuthUserResponse = z.object({ user: UserPublic }).strict();

export const TeamSummary = z
  .object({ id: Uuid, name: z.string(), short_name: z.string(), crest_url: z.string().nullable() })
  .strict();
export const CompetitionSummary = z
  .object({ id: Uuid, code: z.string(), name: z.string(), brand_key: z.string(), country_code: z.string() })
  .strict();
export const VenueSummary = z
  .object({
    id: Uuid,
    name: z.string(),
    lat: z.number().nullable(),
    lng: z.number().nullable(),
    coord_verified: z.boolean(),
  })
  .strict();
export const MatchScore = z.object({ home: NonNegativeInt.nullable(), away: NonNegativeInt.nullable() }).strict();
export const SourceView = z
  .object({ kind: SourceKind, is_stale: z.boolean(), last_synced_at: Utc.nullable(), data_version: z.string() })
  .strict();
export const MatchFeatures = z
  .object({
    pre_match_room: z.boolean(),
    predictions_open: z.boolean(),
    whatif_available: z.boolean(),
    post_match_room: z.boolean(),
  })
  .strict();
const matchSummaryShape = {
  id: Uuid,
  competition: CompetitionSummary,
  season_start_year: z.number().int(),
  matchday: z.number().int().nullable(),
  kickoff_at: Utc,
  status: MatchStatus,
  home_team: TeamSummary,
  away_team: TeamSummary,
  score: MatchScore,
  venue: VenueSummary.nullable(),
  source: SourceView,
  features: MatchFeatures,
};
export const MatchSummary = z.object(matchSummaryShape).strict();
export const MatchEvent = z
  .object({
    id: Uuid,
    kind: z.enum(["GOAL", "SUB", "CARD", "OTHER"]),
    minute: z.number().int().nullable(),
    team_id: Uuid.nullable(),
    player_name: z.string().nullable(),
    related_player_name: z.string().nullable(),
    description: z.string(),
    source_ref: z.string(),
  })
  .strict();
export const MatchDetail = z
  .object({
    ...matchSummaryShape,
    events: z.array(MatchEvent),
    statistics: z.record(z.unknown()).nullable(),
    lineups: z.record(z.unknown()).nullable(),
    data_capabilities: z
      .object({ events: z.boolean(), lineups: z.boolean(), player_stats: z.boolean() })
      .strict(),
  })
  .strict();
export const JourneyResponse = z
  .object({ items: z.array(MatchSummary), team_id: Uuid, season_start_year: z.number().int() })
  .strict();

export const StadiumFixture = z.object({ match: MatchSummary }).strict();
export const StadiumVenue = z
  .object({
    venue_id: Uuid,
    name: z.string(),
    lat: z.number(),
    lng: z.number(),
    coord_verified: z.literal(true),
    home_team_ids: z.array(Uuid),
    illumination_state: Illumination,
    fixtures: z.array(StadiumFixture),
  })
  .strict();
export const UnmappedMatch = z
  .object({ match: MatchSummary, reason: z.enum(["VENUE_MISSING", "VENUE_COORDINATES_UNVERIFIED"]) })
  .strict();
export const StadiumMapResponse = z
  .object({
    competition: z.string(),
    season_start_year: z.number().int(),
    selected: z.object({ matchday: z.number().int().nullable(), date: CivilDate.nullable() }).strict(),
    stadiums: z.array(StadiumVenue),
    unmapped_matches: z.array(UnmappedMatch),
    source: SourceView,
  })
  .strict();

export const StandingsRow = z
  .object({
    team_id: Uuid,
    position: z.number().int().nullable(),
    played: z.number().int(),
    won: z.number().int(),
    drawn: z.number().int(),
    lost: z.number().int(),
    goals_for: z.number().int(),
    goals_against: z.number().int(),
    goal_difference: z.number().int(),
    points: z.number().int(),
  })
  .strict();
export const StandingsResponse = z
  .object({
    competition: z.string(),
    season_start_year: z.number().int(),
    snapshot_id: Uuid,
    as_of: Utc,
    source: SourceView,
    rows: z.array(StandingsRow),
  })
  .strict();

export const SourceReference = z.object({ ref: z.string(), label: z.string() }).strict();
export const GapEffect = z
  .object({
    affected_team_id: Uuid,
    gap_before: z.number().int(),
    gap_after: z.number().int(),
    gap_delta: z.number().int(),
    position_change: z.number().int().nullable(),
    position_note: z.string().nullable(),
  })
  .strict();
export const ImpactScenario = z
  .object({ outcome: Outcome, is_hypothetical: z.boolean(), effects: z.array(GapEffect) })
  .strict();
export const ImpactInsight = z
  .object({
    match_id: Uuid,
    match: MatchSummary,
    favorite_team_id: Uuid,
    relevance: Relevance,
    basis: z.enum(["POINTS_GAP", "NONE", "INSUFFICIENT_DATA"]),
    data_version: z.string().nullable(),
    verified_at: Utc.nullable(),
    actual_outcome: Outcome.nullable(),
    scenarios: z.array(ImpactScenario),
    summary: z.string(),
    summary_type: z.enum(["TEMPLATE", "AI_EXPLANATION"]),
    caveats: z.array(z.string()),
    sources: z.array(SourceReference),
  })
  .strict();

export const BadgeView = z
  .object({ code: z.string(), label: z.string(), earned_at: Utc, active: z.boolean(), rule_description: z.string() })
  .strict();
export const AuthorPublic = z
  .object({ id: Uuid, display_name: z.string(), public_badges: z.array(BadgeView) })
  .strict();
export const RoomSummary = z
  .object({
    id: Uuid,
    match_id: Uuid,
    match: MatchSummary,
    kind: RoomKind,
    title: z.string(),
    status: RoomStatus,
    created_by: AuthorPublic.nullable(),
    message_count: NonNegativeInt,
    can_post: z.boolean(),
    can_create: z.boolean(),
  })
  .strict();
export const RoomMessage = z
  .object({
    id: Uuid,
    room_id: Uuid,
    body: z.string(),
    created_at: Utc,
    author: AuthorPublic,
    moderation_state: z.enum(["VISIBLE", "FLAGGED"]),
  })
  .strict();
export const RoomMessagesPage = z
  .object({ items: z.array(RoomMessage), next_cursor: z.string().nullable(), sync_after_seq: NonNegativeInt })
  .strict();
export const RoomChangeUpsert = z
  .object({ seq: NonNegativeInt, kind: z.literal("UPSERT"), message_id: Uuid, message: RoomMessage })
  .strict();
export const RoomChangeRemove = z
  .object({ seq: NonNegativeInt, kind: z.literal("REMOVE"), message_id: Uuid, message: z.null() })
  .strict();
export const RoomChange = z.discriminatedUnion("kind", [RoomChangeUpsert, RoomChangeRemove]);
export const RoomChangePage = z
  .object({ items: z.array(RoomChange), next_after_seq: NonNegativeInt, has_more: z.boolean() })
  .strict();

export const PredictionBreakdown = z
  .object({ outcome_points: z.number().int(), exact_score_points: z.number().int() })
  .strict();
export const PredictionView = z
  .object({
    id: Uuid,
    match_id: Uuid,
    outcome: Outcome,
    home_score: NonNegativeInt.nullable(),
    away_score: NonNegativeInt.nullable(),
    created_at: Utc,
    submitted_at: Utc,
    locked_at: Utc.nullable(),
    status: PredictionStatus,
    points: z.number().int().nullable(),
    breakdown: PredictionBreakdown.nullable(),
  })
  .strict();
export const PredictionHistoryItem = z.object({ prediction: PredictionView, match: MatchSummary }).strict();
export const CurrentPredictionResponse = z.object({ prediction: PredictionView.nullable() }).strict();
export const LeaderboardEntry = z
  .object({
    user_id: Uuid,
    display_name: z.string(),
    points: z.number().int(),
    rank: z.number().int().positive(),
    public_badges: z.array(BadgeView),
  })
  .strict();
export const UserProfile = UserPublic.extend({
  prediction_summary: z
    .object({ scored_count: NonNegativeInt, correct_outcomes: NonNegativeInt, total_points: z.number().int() })
    .strict(),
  active_badges: z.array(BadgeView),
}).strict();

export const WhatifThread = z
  .object({
    id: Uuid,
    match_id: Uuid,
    user_id: Uuid,
    title: z.string(),
    visibility: z.literal("PRIVATE"),
    created_at: Utc,
    updated_at: Utc,
  })
  .strict();
const EvidenceClaim = z.object({ text: z.string(), evidence_refs: z.array(z.string()) }).strict();
export const WhatifAnalysis = z
  .object({
    classification: z.enum(["COUNTERFACTUAL_COACH_DECISION", "COUNTERFACTUAL_EVENT", "OTHER"]),
    verdict: z.enum([
      "PLAUSIBLY_BETTER",
      "PLAUSIBLY_WORSE",
      "NO_CLEAR_DIFFERENCE",
      "UNCERTAIN",
      "INSUFFICIENT_DATA",
      "INVALID_PREMISE",
    ]),
    headline: z.string(),
    response: z.string(),
    supports: z.array(EvidenceClaim),
    challenges: z.array(EvidenceClaim),
    assumptions: z.array(z.string()),
    unknowns: z.array(z.string()),
    follow_up_questions: z.array(z.string()),
    confidence: z.enum(["LOW", "MEDIUM"]),
    disclaimer: z.string(),
  })
  .strict();
const evidenceBase = {
  ref: z.string(),
  label: z.string(),
  source_data_version: z.string(),
  verified_at: Utc.nullable(),
};
export const WhatifEvidenceItem = z.discriminatedUnion("kind", [
  z.object({ ...evidenceBase, kind: z.literal("MATCH_EVENT"), match_id: Uuid, event: MatchEvent }).strict(),
  z
    .object({
      ...evidenceBase,
      kind: z.literal("FINAL_SCORE"),
      match_id: Uuid,
      match_status: z.literal("FINISHED"),
      score: z.object({ home: NonNegativeInt, away: NonNegativeInt }).strict(),
    })
    .strict(),
  z
    .object({
      ...evidenceBase,
      kind: z.literal("STANDINGS_SNAPSHOT"),
      snapshot_id: Uuid,
      as_of: Utc,
      team_rows: z.array(StandingsRow),
    })
    .strict(),
  z
    .object({
      ...evidenceBase,
      kind: z.literal("MATCH_METADATA"),
      match_id: Uuid,
      kickoff_at: Utc,
      home_team: TeamSummary,
      away_team: TeamSummary,
    })
    .strict(),
  z
    .object({
      ...evidenceBase,
      kind: z.literal("PLAYER_SEASON_STAT"),
      team_id: Uuid,
      player_name: z.string(),
      season_start_year: z.number().int(),
      statistic: z.string(),
      value: z.number(),
      unit: z.string(),
    })
    .strict(),
]);
export const UserWhatifMessage = z
  .object({
    id: Uuid,
    client_message_id: Uuid,
    speaker: z.literal("USER"),
    content: z.string(),
    created_at: Utc,
    delivery_state: z.enum(["PENDING", "COMPLETE", "FAILED"]),
  })
  .strict();
export const AIWhatifMessage = z
  .object({
    id: Uuid,
    speaker: z.literal("AI"),
    created_at: Utc,
    delivery_state: z.literal("COMPLETE"),
    analysis: WhatifAnalysis,
    source_data_version: z.string(),
    evidence: z.array(WhatifEvidenceItem),
    validation_status: z.enum(["VERIFIED_REFERENCES", "INSUFFICIENT_DATA"]),
    model_label: z.enum(["AI_ANALYSIS", "DEMO_AI"]),
  })
  .strict()
  .superRefine((message, ctx) => {
    // A3: every cited ref must join to the same message's evidence array.
    const refs = new Set(message.evidence.map((item) => item.ref));
    for (const claim of [...message.analysis.supports, ...message.analysis.challenges]) {
      for (const ref of claim.evidence_refs) {
        if (!refs.has(ref)) ctx.addIssue({ code: z.ZodIssueCode.custom, message: `dangling evidence ref ${ref}` });
      }
    }
  });
export const WhatifMessage = z.union([UserWhatifMessage, AIWhatifMessage]);
export const WhatifThreadDetail = z.object({ thread: WhatifThread, messages: z.array(WhatifMessage) }).strict();
export const WhatifTurnResponse = z
  .object({ user_message: UserWhatifMessage, ai_message: AIWhatifMessage, remaining_daily_messages: NonNegativeInt })
  .strict();
export const WhatifPendingResponse = z
  .object({ request_state: z.literal("PENDING"), user_message: UserWhatifMessage, retry_after_seconds: NonNegativeInt })
  .strict();

// A2 request bodies -------------------------------------------------------------

export const RegisterRequest = z.object({ email: z.string(), display_name: z.string(), password: z.string() }).strict();
export const LoginRequest = z.object({ email: z.string(), password: z.string() }).strict();
export const FavoriteTeamRequest = z.object({ team_id: Uuid }).strict();
export const FavoriteTeamResponse = z.object({ favorite_team_id: Uuid }).strict();
export const RoomCreateRequest = z.object({ title: z.string(), kind: RoomKind }).strict();
export const RoomMessageRequest = z.object({ body: z.string() }).strict();
export const ReportRequest = z
  .object({ target_kind: z.literal("ROOM_MESSAGE"), target_id: Uuid, reason: z.string() })
  .strict();
export const ReportResponse = z.object({ id: Uuid, status: z.literal("OPEN") }).strict();
export const WhatifThreadRequest = z.object({ title: z.string().optional() }).strict();
export const WhatifMessageRequest = z.object({ message: z.string(), client_message_id: Uuid }).strict();

/**
 * A3 prediction score invariant: both scores null, or both nonnegative
 * integers whose direction implies `outcome`. Backend remains authoritative.
 */
export const PredictionRequest = z
  .object({
    outcome: Outcome,
    home_score: z.number().int().nonnegative().nullable(),
    away_score: z.number().int().nonnegative().nullable(),
  })
  .strict()
  .superRefine(({ outcome, home_score, away_score }, ctx) => {
    if (home_score === null && away_score === null) return;
    if (home_score === null || away_score === null) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "scores must be both null or both integers" });
      return;
    }
    const implied = home_score > away_score ? "HOME" : home_score === away_score ? "DRAW" : "AWAY";
    if (implied !== outcome) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: `score implies ${implied}, not ${outcome}` });
    }
  });
