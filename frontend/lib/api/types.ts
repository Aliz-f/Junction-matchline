/**
 * Temporary hand-maintained DTO types inferred from `contract.ts` (Appendix A v2.4).
 * FE-G0.4: replace with `openapi-typescript` output once backend OpenAPI
 * conforms to Appendix A; never adapt these to a nonconforming schema.
 */
import type { z } from "zod";
import type * as C from "./contract";

export type UUID = z.infer<typeof C.Uuid>;
export type UTC = z.infer<typeof C.Utc>;
export type MatchStatus = z.infer<typeof C.MatchStatus>;
export type Illumination = z.infer<typeof C.Illumination>;
export type Plan = z.infer<typeof C.Plan>;
export type Role = z.infer<typeof C.Role>;
export type RoomKind = z.infer<typeof C.RoomKind>;
export type RoomStatus = z.infer<typeof C.RoomStatus>;
export type Relevance = z.infer<typeof C.Relevance>;
export type SourceKind = z.infer<typeof C.SourceKind>;
export type PredictionStatus = z.infer<typeof C.PredictionStatus>;
export type Outcome = z.infer<typeof C.Outcome>;
export type ErrorCode = C.ErrorCode;
export type ErrorEnvelope = z.infer<typeof C.ErrorEnvelope>;
export type Page<T> = { items: T[]; next_cursor: string | null };

export type HealthResponse = z.infer<typeof C.HealthResponse>;
export type MetaView = z.infer<typeof C.MetaView>;
export type UserPublic = z.infer<typeof C.UserPublic>;
export type TeamSummary = z.infer<typeof C.TeamSummary>;
export type CompetitionSummary = z.infer<typeof C.CompetitionSummary>;
export type VenueSummary = z.infer<typeof C.VenueSummary>;
export type MatchScore = z.infer<typeof C.MatchScore>;
export type SourceView = z.infer<typeof C.SourceView>;
export type MatchFeatures = z.infer<typeof C.MatchFeatures>;
export type MatchSummary = z.infer<typeof C.MatchSummary>;
export type MatchEvent = z.infer<typeof C.MatchEvent>;
export type MatchDetail = z.infer<typeof C.MatchDetail>;
export type StadiumFixture = z.infer<typeof C.StadiumFixture>;
export type StadiumVenue = z.infer<typeof C.StadiumVenue>;
export type UnmappedMatch = z.infer<typeof C.UnmappedMatch>;
export type StadiumMapResponse = z.infer<typeof C.StadiumMapResponse>;
export type StandingsRow = z.infer<typeof C.StandingsRow>;
export type StandingsResponse = z.infer<typeof C.StandingsResponse>;
export type SourceReference = z.infer<typeof C.SourceReference>;
export type GapEffect = z.infer<typeof C.GapEffect>;
export type ImpactScenario = z.infer<typeof C.ImpactScenario>;
export type ImpactInsight = z.infer<typeof C.ImpactInsight>;
export type BadgeView = z.infer<typeof C.BadgeView>;
export type AuthorPublic = z.infer<typeof C.AuthorPublic>;
export type RoomSummary = z.infer<typeof C.RoomSummary>;
export type RoomMessage = z.infer<typeof C.RoomMessage>;
export type RoomMessagesPage = z.infer<typeof C.RoomMessagesPage>;
export type RoomChange = z.infer<typeof C.RoomChange>;
export type RoomChangePage = z.infer<typeof C.RoomChangePage>;
export type PredictionView = z.infer<typeof C.PredictionView>;
export type PredictionHistoryItem = z.infer<typeof C.PredictionHistoryItem>;
export type LeaderboardEntry = z.infer<typeof C.LeaderboardEntry>;
export type UserProfile = z.infer<typeof C.UserProfile>;
export type WhatifThread = z.infer<typeof C.WhatifThread>;
export type WhatifAnalysis = z.infer<typeof C.WhatifAnalysis>;
export type WhatifEvidenceItem = z.infer<typeof C.WhatifEvidenceItem>;
export type UserWhatifMessage = z.infer<typeof C.UserWhatifMessage>;
export type AIWhatifMessage = z.infer<typeof C.AIWhatifMessage>;
export type WhatifMessage = z.infer<typeof C.WhatifMessage>;
export type WhatifTurnResponse = z.infer<typeof C.WhatifTurnResponse>;
export type WhatifPendingResponse = z.infer<typeof C.WhatifPendingResponse>;
export type PredictionRequest = z.infer<typeof C.PredictionRequest>;
