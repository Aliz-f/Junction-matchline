/**
 * Demo-mode responses (FE-01).
 *
 * These back `app/api/v1/[...path]/route.ts` when `MATCHLINE_API_BASE_URL` is
 * unset, so the deployed frontend is navigable before the backend exists. Every
 * value is DERIVED FROM the frozen BE-00 manifest that `mocks/fixtures.ts`
 * already mirrors byte-for-byte — the same bytes the CT-13 contract tests hash.
 * Nothing here invents a fixture, team, score or ID.
 *
 * Scope is deliberately identical to the frozen MSW handler set in
 * `mocks/handlers.ts`: only endpoints the manifest fully determines. Everything
 * else returns a `PROVIDER_UNAVAILABLE` envelope that names the blocking gap
 * from `FE00_HANDOFF.md`, rather than fabricating an Appendix A response.
 *
 * This module is server-only. It must never be imported by a client component,
 * or the whole manifest ships in the browser bundle.
 */
import { ERROR_STATUS, type ErrorCode } from "@/lib/api/contract";
import { competitionSummary, manifest, seasonMatchdays, teamSummaries } from "@/mocks/fixtures";
import type { DemoManifest } from "@/mocks/fixtures";
import type { JourneyResponse } from "@/lib/api/contract";
import type { z } from "zod";
import type {
  CompetitionSummary,
  ErrorEnvelope,
  HealthResponse,
  MatchDetail,
  MatchSummary,
  MetaView,
  SourceView,
  TeamSummary,
  UserPublic,
  VenueSummary,
} from "@/lib/api/types";

/** Marks demo-mode correlation IDs as non-production, non-resource values. */
export const DEMO_REQUEST_ID = "req_demo_mode";

export function demoErrorEnvelope(
  code: ErrorCode,
  message: string,
  details: Record<string, unknown> = {},
): { body: ErrorEnvelope; status: number } {
  return {
    body: { error: { code, message, details, request_id: DEMO_REQUEST_ID } },
    status: ERROR_STATUS[code],
  };
}

export function demoHealth(): HealthResponse {
  return { status: "ok", database: "ok" };
}

/**
 * Demo `/meta`.
 *
 * `server_now_utc` is the manifest's own `demo_clock`, and `demo_clock_frozen`
 * is true because nothing advances it. `demo_epoch` is 1 per A3b.
 *
 * FE00_HANDOFF Q2 is now ANSWERED by BE-01 (`backend/app/main.py`), which is
 * authoritative for feature flags. Every value below mirrors what that handler
 * returns in DEMO mode, so demo mode and the real backend agree:
 *
 *   demo_epoch 1, scenario_revision 1, whatif_sharing false, live_updates false,
 *   events FALSE, and server_now_utc from `settings.demo_clock_iso`, which
 *   equals the manifest `demo_clock` (2026-10-24T12:00:00Z).
 *
 * `capabilities.events` is deliberately NOT derived from the manifest fixtures
 * here. Some fixtures do advertise event data, so deriving it would yield true
 * and silently disagree with the backend. The backend owns this flag.
 */
export function demoMeta(): MetaView {
  return {
    mode: "DEMO",
    default_competition: "PL",
    default_season_start_year: manifest.competition.season_start_year,
    server_now_utc: manifest.demo_clock,
    demo_clock_frozen: true,
    demo_epoch: 1,
    scenario_revision: 1,
    capabilities: {
      whatif_sharing: false,
      events: false,
      live_updates: false,
    },
  };
}

/** Guest session. Real cookie-backed auth arrives with FE-02 against BE-03. */
export function demoAuthMe(): { user: UserPublic | null } {
  return { user: null };
}

export function demoCompetitions(): { items: CompetitionSummary[] } {
  return { items: [competitionSummary()] };
}

export function demoTeams(): { items: TeamSummary[] } {
  return { items: teamSummaries() };
}

export function demoMatchdays(): { items: number[] } {
  return { items: seasonMatchdays() };
}

export const DEMO_COMPETITION_CODE = manifest.competition.code;
export const DEMO_SEASON = manifest.competition.season_start_year;
export const DEMO_CLOCK = manifest.demo_clock;
export const DEMO_DISCLAIMER = manifest.disclaimer;
export const DEMO_DATA_SOURCE = manifest.data_source;

/** Manifest fixture UUIDs, used to 404 unknown match deep links in demo mode. */
export function demoFixtureIds(): ReadonlySet<string> {
  return new Set(manifest.fixtures.map((fixture) => fixture.id));
}

/** Manifest room UUIDs, used to 404 unknown room deep links in demo mode. */
export function demoRoomIds(): ReadonlySet<string> {
  return new Set(manifest.rooms.map((room) => room.id));
}

// Journey and match views -----------------------------------------------------
//
// Demo mode acts as a STAND-IN BACKEND here, so it computes the two
// backend-authoritative structures `MatchSummary.source` and
// `MatchSummary.features` rather than leaving them out — Appendix A requires
// both and `MatchSummary` is a strict schema.
//
// This is not the client deriving backend flags: the UI still reads
// `features` off the response and never recomputes it from status. The rules
// below are the spec's own (frontend spec A5 note 5), not invented:
//
//   predictions_open  = status SCHEDULED and server time strictly before kickoff
//   whatif_available  = status is authoritatively FINISHED
//   pre_match_room    = a discoverable PRE_MATCH room exists for the match
//   post_match_room   = a discoverable POST_MATCH room exists, which for a
//                       seeded template means the fixture is FINISHED
//
// Gaps this cannot close (still open for the backend, see FE00_HANDOFF):
//   G1 `source` has no per-fixture `data_version` / `last_synced_at` /
//      `is_stale` in the manifest, so one manifest-wide value is used.
//   G6 the manifest has no hidden POST_MATCH template for `match_upcoming`.

type ManifestFixture = DemoManifest["fixtures"][number];

function teamById(id: string): TeamSummary {
  const team = manifest.teams.find((candidate) => candidate.id === id);
  if (!team) throw new Error(`Demo manifest has no team ${id}`);
  // The manifest carries no licensed crest, so `crest_url` is explicitly null.
  return { id: team.id, name: team.name, short_name: team.short_name, crest_url: null };
}

function venueById(id: string | null): VenueSummary | null {
  if (!id) return null;
  const venue = manifest.venues.find((candidate) => candidate.id === id);
  if (!venue) return null;
  return {
    id: venue.id,
    name: venue.name,
    lat: venue.lat,
    lng: venue.lng,
    coord_verified: venue.coord_verified,
  };
}

/**
 * One source view for every fixture (gap G1). `is_stale` is false because the
 * frozen manifest is by definition current for the frozen clock.
 */
function demoSource(): SourceView {
  return {
    kind: "DEMO_SYNTHETIC",
    is_stale: false,
    last_synced_at: manifest.demo_clock,
    data_version: manifest.schema_version,
  };
}

function demoFeatures(fixture: ManifestFixture): MatchSummary["features"] {
  const rooms = manifest.rooms.filter((room) => room.match_id === fixture.id);
  const isFinished = fixture.status === "FINISHED";
  const beforeKickoff = Date.parse(fixture.kickoff_at) > Date.parse(manifest.demo_clock);

  return {
    pre_match_room: rooms.some((room) => room.kind === "PRE_MATCH"),
    // A seeded POST_MATCH template is hidden until the fixture is FINISHED.
    post_match_room: rooms.some((room) => room.kind === "POST_MATCH") && isFinished,
    predictions_open: fixture.status === "SCHEDULED" && beforeKickoff,
    whatif_available: isFinished,
  };
}

function matchSummary(fixture: ManifestFixture): MatchSummary {
  return {
    id: fixture.id,
    competition: competitionSummary(),
    season_start_year: manifest.competition.season_start_year,
    matchday: fixture.matchday,
    kickoff_at: fixture.kickoff_at,
    status: fixture.status,
    home_team: teamById(fixture.home_team_id),
    away_team: teamById(fixture.away_team_id),
    score: fixture.score,
    venue: venueById(fixture.venue_id),
    source: demoSource(),
    features: demoFeatures(fixture),
  };
}

/** Chronological, which is the order the Journey path renders in. */
function chronological(fixtures: readonly ManifestFixture[]): ManifestFixture[] {
  return [...fixtures].sort(
    (a, b) => Date.parse(a.kickoff_at) - Date.parse(b.kickoff_at) || a.id.localeCompare(b.id),
  );
}

/** Every fixture involving the team, home or away (both are highlighted). */
export function demoJourney(teamId: string, season: number): z.infer<typeof JourneyResponse> | null {
  if (season !== manifest.competition.season_start_year) return null;
  if (!manifest.teams.some((team) => team.id === teamId)) return null;

  const fixtures = chronological(
    manifest.fixtures.filter(
      (fixture) => fixture.home_team_id === teamId || fixture.away_team_id === teamId,
    ),
  );

  return {
    items: fixtures.map(matchSummary),
    team_id: teamId,
    season_start_year: manifest.competition.season_start_year,
  };
}

/** All fixtures, for browsing without a favourite club. */
export function demoMatches(): { items: MatchSummary[]; next_cursor: null } {
  return { items: chronological(manifest.fixtures).map(matchSummary), next_cursor: null };
}

export function demoMatchDetail(matchId: string): MatchDetail | null {
  const fixture = manifest.fixtures.find((candidate) => candidate.id === matchId);
  if (!fixture) return null;

  return {
    ...matchSummary(fixture),
    events: fixture.events.map((event) => ({
      id: event.id,
      kind: event.kind,
      minute: event.minute,
      team_id: event.team_id,
      player_name: event.player_name,
      related_player_name: event.related_player_name,
      // Gap G3: the manifest has no `description` on every event. Fall back to
      // a factual restatement rather than inventing commentary.
      description: event.player_name ? `${event.kind} — ${event.player_name}` : event.kind,
      source_ref: event.source_ref,
    })),
    // The manifest provides neither, and inventing football statistics is
    // exactly what the spec forbids. The UI shows "Not available in this feed".
    statistics: null,
    lineups: null,
    data_capabilities: fixture.capabilities,
  };
}
