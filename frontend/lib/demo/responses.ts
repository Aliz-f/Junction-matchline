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
import type {
  CompetitionSummary,
  ErrorEnvelope,
  HealthResponse,
  MetaView,
  TeamSummary,
  UserPublic,
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
