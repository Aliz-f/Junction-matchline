/**
 * Typed access to the BE-00 fixtures mirrored byte-for-byte under
 * `tests/fixtures/`. The schemas describe the backend-authored file layout
 * (not Appendix A DTOs) so a structural change fails loudly instead of being
 * silently reinterpreted. Never edit the JSON here; re-copy from backend.
 */
import { z } from "zod";
import { MatchScore, MatchStatus, Outcome, Plan, RoomKind, Utc, Uuid } from "@/lib/api/contract";
import edgeJson from "@/tests/fixtures/contract_edge_cases.json";
import manifestJson from "@/tests/fixtures/demo_manifest.json";
import type { CompetitionSummary, TeamSummary } from "@/lib/api/types";

/** SHA-256 values published in `backend/contracts/BE00_HANDOFF.md`. */
export const EXPECTED_FIXTURE_SHA256 = {
  "demo_manifest.json": "434c152362e5ffcdf9979ee222daed77976b54c204b94c2ab4904888b221f9b5",
  "contract_edge_cases.json": "f2b4fff7969be31341e74ec299b594b4518916f561edff34e7165079ead7fe74",
} as const;

const Venue = z
  .object({
    id: Uuid,
    name: z.string(),
    lat: z.number(),
    lng: z.number(),
    coord_verified: z.boolean(),
    coord_source: z.string().url(),
    home_team_ids: z.array(Uuid),
  })
  .strict();

const ManifestEvent = z
  .object({
    id: Uuid,
    kind: z.enum(["GOAL", "SUB", "CARD", "OTHER"]),
    minute: z.number().int().nullable(),
    team_id: Uuid.nullable(),
    player_name: z.string().nullable(),
    related_player_name: z.string().nullable(),
    source_ref: z.string(),
  })
  .strict();

const ManifestFixture = z
  .object({
    key: z.string(),
    id: Uuid,
    matchday: z.number().int().positive(),
    kickoff_at: Utc,
    home_team_id: Uuid,
    away_team_id: Uuid,
    venue_id: Uuid.nullable(),
    status: MatchStatus,
    score: MatchScore,
    events: z.array(ManifestEvent),
    event_availability: z.enum(["NONE", "PARTIAL", "RICH"]),
    validation_status: z.literal("VERIFIED_SYNTHETIC"),
    capabilities: z.object({ events: z.boolean(), lineups: z.boolean(), player_stats: z.boolean() }).strict(),
  })
  .strict();

const FixtureState = z.object({ status: MatchStatus, score: MatchScore }).strict();
const Scenario = z
  .object({
    server_now_utc: Utc,
    snapshot_id: Uuid,
    fixture_states: z.record(FixtureState),
    expected_impact: z.string(),
  })
  .strict();

export const DemoManifest = z
  .object({
    schema_version: z.string(),
    data_source: z.literal("DEMO_SYNTHETIC"),
    disclaimer: z.string(),
    competition: z
      .object({
        id: Uuid,
        code: z.literal("PL"),
        season_start_year: z.number().int(),
        name: z.string(),
        brand_key: z.string(),
        country_code: z.string(),
      })
      .strict(),
    demo_clock: Utc,
    teams: z.array(z.object({ id: Uuid, name: z.string(), short_name: z.string() }).strict()),
    venues: z.array(Venue),
    fixtures: z.array(ManifestFixture),
    users: z.array(
      z.object({ id: Uuid, key: z.string(), plan: Plan, favorite_team_id: Uuid.nullable() }).strict(),
    ),
    rooms: z.array(z.object({ id: Uuid, match_id: Uuid, kind: RoomKind }).strict()),
    snapshots: z.array(z.object({ id: Uuid, key: z.string() }).strict()),
    prediction_baselines: z
      .object({
        free: z
          .object({
            scored_count: z.number().int(),
            correct_outcomes: z.number().int(),
            pending_match_id: Uuid,
            pending_outcome: Outcome,
            expected_after_settlement: z
              .object({
                scored_count: z.number().int(),
                correct_outcomes: z.number().int(),
                predictor_bronze: z.boolean(),
              })
              .strict(),
          })
          .strict(),
        premium: z
          .object({ scored_count: z.number().int(), correct_outcomes: z.number().int(), predictor_bronze: z.boolean() })
          .strict(),
      })
      .strict(),
    scenarios: z
      .object({ baseline: Scenario, upcoming_live: Scenario, upcoming_finished: Scenario })
      .strict(),
  })
  .strict();

const EdgeFixture = z
  .object({
    matchday: z.number().int().positive(),
    kickoff_at: Utc,
    home_team_id: Uuid,
    away_team_id: Uuid,
    venue_id: Uuid.optional(),
    status: MatchStatus,
    score: MatchScore.optional(),
  })
  .strict();
const EdgeFixtureCase = <E extends z.ZodRawShape>(expected: E) =>
  z.object({ id: Uuid, fixture: EdgeFixture, expected: z.object(expected).strict() }).strict();
const ScoreTuple = z.tuple([Outcome, z.number().nullable(), z.number().nullable()]);

export const ContractEdgeCases = z
  .object({
    schema_version: z.string(),
    namespace: z.literal("edge-only-not-public-demo"),
    manifest_ref: z.string(),
    competition_id: Uuid,
    season_start_year: z.number().int(),
    venues: z.array(Venue),
    cases: z
      .object({
        FAVORITE_AWAY: EdgeFixtureCase({ favorite_fixture_visible: z.boolean(), favorite_home_outline: z.boolean() }),
        NEUTRAL_VENUE: EdgeFixtureCase({ map_bucket: z.literal("stadiums"), home_team_ids: z.array(Uuid) }),
        MIXED_FINISHED: EdgeFixtureCase({ clickable: z.boolean() }),
        MIXED_LIVE: EdgeFixtureCase({ aggregate_state: z.literal("LIVE"), finished_fixture_clickable: z.boolean() }),
        LONDON_DST_AUTUMN_BEFORE_FALLBACK: EdgeFixtureCase({ london_date: z.string() }),
        LONDON_DST_AUTUMN_AFTER_FALLBACK: EdgeFixtureCase({ london_date: z.string() }),
        EMPTY_ROOM_BURST: z
          .object({
            room_id: Uuid,
            message_namespace: Uuid,
            initial_sync_after_seq: z.number().int().nonnegative(),
            generate: z
              .object({
                count: z.number().int(),
                uuid_version: z.literal(5),
                ordered_timestamp_start: Utc,
                limit: z.number().int(),
                pages: z.number().int(),
              })
              .strict(),
          })
          .strict(),
        HIDDEN_OLD_MESSAGE: z
          .object({
            room_id: Uuid,
            message_namespace: Uuid,
            generate: z
              .object({
                count: z.number().int(),
                uuid_version: z.literal(5),
                hide: z.literal("oldest"),
                remove_event: z.literal(true),
                replay_never_includes_body: z.literal(true),
              })
              .strict(),
          })
          .strict(),
        CLOCK_CUTOFF: z
          .object({
            fixture_id: Uuid,
            room_id: Uuid,
            expected: z
              .object({ fixture_status: MatchStatus, room_status: z.literal("READ_ONLY"), post_status: z.literal(409) })
              .strict(),
          })
          .strict(),
        PREDICTION_SCORE_CONSTRAINT: z
          .object({ accepted: z.array(ScoreTuple), rejected: z.array(ScoreTuple), expected_status: z.literal(422) })
          .strict(),
        MAP_NO_FAVORITE: z
          .object({
            authenticated_favorite_team_id: z.null(),
            guest_favorite_team_id: z.null(),
            explicit_guest_team_id: Uuid,
            expected: z
              .object({
                authenticated_impact_call: z.boolean(),
                guest_without_selection_impact_call: z.boolean(),
                guest_selected_impact_call: z.boolean(),
              })
              .strict(),
          })
          .strict(),
      })
      .strict(),
    g0_status_capability_matrix: z.record(z.string()),
  })
  .strict();

export type DemoManifest = z.infer<typeof DemoManifest>;
export type ContractEdgeCases = z.infer<typeof ContractEdgeCases>;

export const manifest: DemoManifest = DemoManifest.parse(manifestJson);
export const edgeCases: ContractEdgeCases = ContractEdgeCases.parse(edgeJson);

// Appendix A DTOs that the manifest determines completely. `crest_url` is
// null because the manifest records no licensed crest (A1: never invent).

export function competitionSummary(): CompetitionSummary {
  const { id, code, name, brand_key, country_code } = manifest.competition;
  return { id, code, name, brand_key, country_code };
}

export function teamSummaries(): TeamSummary[] {
  return manifest.teams
    .map(({ id, name, short_name }) => ({ id, name, short_name, crest_url: null }))
    .sort((a, b) => a.name.localeCompare(b.name, "en"));
}

export function seasonMatchdays(): number[] {
  return [...new Set(manifest.fixtures.map((fixture) => fixture.matchday))].sort((a, b) => a - b);
}
