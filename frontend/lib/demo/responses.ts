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
import type { JourneyResponse, StadiumMapResponse } from "@/lib/api/contract";
import type { z } from "zod";
import type {
  CompetitionSummary,
  ErrorEnvelope,
  HealthResponse,
  Illumination,
  ImpactInsight,
  MatchDetail,
  MatchSummary,
  MetaView,
  RoomChangePage,
  RoomMessagesPage,
  RoomSummary,
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

// Stadium map -----------------------------------------------------------------
//
// `illumination_state` is a backend aggregate, so demo mode computes it as a
// STAND-IN. The per-state meanings are the spec's (frontend spec FE-05):
//
//   LIVE                   a match is in play
//   UNKNOWN                unusable state, incl. overdue still-SCHEDULED
//   POSTPONED_OR_CANCELLED a selected fixture has no result
//   UPCOMING_ROUND         a future SCHEDULED fixture
//   COMPLETED              selected fixtures have finished
//   INACTIVE               no selected fixture at this venue
//
// The PRECEDENCE between them when one venue hosts several selected fixtures is
// not specified, so the order above is a demo-mode choice, not a frozen
// contract decision. The real backend owns it.

/** Europe/London calendar date for a UTC instant, used by the date selector. */
export function londonCalendarDate(utc: string): string {
  // `en-CA` yields YYYY-MM-DD, which is the A1 CivilDate shape.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/London",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(utc));
}

function aggregateIllumination(fixtures: readonly ManifestFixture[]): Illumination {
  if (fixtures.length === 0) return "INACTIVE";

  const now = Date.parse(manifest.demo_clock);
  const overdue = (f: ManifestFixture) =>
    f.status === "SCHEDULED" && Date.parse(f.kickoff_at) <= now;

  if (fixtures.some((f) => f.status === "LIVE" || f.status === "HALFTIME")) return "LIVE";
  if (fixtures.some((f) => f.status === "UNKNOWN" || overdue(f))) return "UNKNOWN";
  if (fixtures.some((f) => f.status === "POSTPONED" || f.status === "CANCELLED")) {
    return "POSTPONED_OR_CANCELLED";
  }
  if (fixtures.some((f) => f.status === "SCHEDULED")) return "UPCOMING_ROUND";
  if (fixtures.some((f) => f.status === "FINISHED" || f.status === "SUSPENDED")) return "COMPLETED";
  return "UNKNOWN";
}

export type MapSelector = { readonly date?: string | null; readonly matchday?: number | null };

/**
 * Stadium map for exactly one selector.
 *
 * Returns null when both or neither selector is supplied: A1 allows `date` OR
 * `matchday`, and guessing one would hide the caller's mistake.
 *
 * Every coordinate-verified venue is returned, including those with no selected
 * fixture (INACTIVE), because `home_team_ids` still drives the favourite-home
 * outline there. Fixtures whose venue is missing or unverified are returned in
 * `unmapped_matches` rather than being dropped or given a placeholder location.
 */
export function demoStadiumMap(selector: MapSelector): z.infer<typeof StadiumMapResponse> | null {
  const hasDate = typeof selector.date === "string" && selector.date.length > 0;
  const hasMatchday = typeof selector.matchday === "number";
  if (hasDate === hasMatchday) return null;

  const selected = manifest.fixtures.filter((fixture) =>
    hasDate
      ? londonCalendarDate(fixture.kickoff_at) === selector.date
      : fixture.matchday === selector.matchday,
  );

  const verifiedVenues = manifest.venues.filter((venue) => venue.coord_verified);

  const stadiums = verifiedVenues.map((venue) => {
    const fixtures = chronological(selected.filter((fixture) => fixture.venue_id === venue.id));
    return {
      venue_id: venue.id,
      name: venue.name,
      lat: venue.lat,
      lng: venue.lng,
      coord_verified: true as const,
      home_team_ids: venue.home_team_ids,
      illumination_state: aggregateIllumination(fixtures),
      fixtures: fixtures.map((fixture) => ({ match: matchSummary(fixture) })),
    };
  });

  const unmapped = chronological(
    selected.filter((fixture) => {
      if (!fixture.venue_id) return true;
      const venue = manifest.venues.find((candidate) => candidate.id === fixture.venue_id);
      return !venue || !venue.coord_verified;
    }),
  ).map((fixture) => {
    const venue = fixture.venue_id
      ? manifest.venues.find((candidate) => candidate.id === fixture.venue_id)
      : undefined;
    return {
      match: matchSummary(fixture),
      reason: (venue && !venue.coord_verified
        ? "VENUE_COORDINATES_UNVERIFIED"
        : "VENUE_MISSING") as "VENUE_MISSING" | "VENUE_COORDINATES_UNVERIFIED",
    };
  });

  return {
    competition: manifest.competition.code,
    season_start_year: manifest.competition.season_start_year,
    selected: {
      matchday: hasMatchday ? (selector.matchday ?? null) : null,
      date: hasDate ? (selector.date ?? null) : null,
    },
    stadiums,
    unmapped_matches: unmapped,
    source: demoSource(),
  };
}

// Impact ----------------------------------------------------------------------
//
// IMPORTANT: demo mode cannot produce real impact figures, and does not try.
//
// Gap G7: the manifest's snapshots are `{id, key}` only — no standings `as_of`,
// no rows, and no expected impacts. Points-gap effects and league positions are
// backend-owned arithmetic (AGENTS.md section 5: "Backend ... owns standings/
// impact math"), and FE-06 forbids frontend standings maths outright.
//
// So every insight below is returned exactly as the spec prescribes for missing
// evidence: `relevance=UNKNOWN`, `basis=INSUFFICIENT_DATA`, `scenarios=[]`, with
// an explicit caveat. The one thing that IS verified from the manifest — the
// actual outcome of a finished fixture — is returned, because the spec asks for
// a verified `actual_outcome` even when impact evidence is unavailable.
//
// `/standings` is deliberately NOT implemented in demo mode: inventing a table
// would be exactly the fabrication the rules prohibit.

function actualOutcome(fixture: ManifestFixture): "HOME" | "DRAW" | "AWAY" | null {
  if (fixture.status !== "FINISHED") return null;
  const { home, away } = fixture.score;
  if (home === null || away === null) return null;
  if (home > away) return "HOME";
  if (home < away) return "AWAY";
  return "DRAW";
}

const INSUFFICIENT_CAVEAT =
  "No standings snapshot is available for this fixture, so its points-gap effect cannot be verified. " +
  "This is not a statement that the result had no effect.";

function impactInsight(fixture: ManifestFixture, favoriteTeamId: string): ImpactInsight {
  return {
    match_id: fixture.id,
    match: matchSummary(fixture),
    favorite_team_id: favoriteTeamId,
    // Included in the relevant feed precisely because it is UNKNOWN, not NONE.
    relevance: "UNKNOWN",
    basis: "INSUFFICIENT_DATA",
    data_version: manifest.schema_version,
    // Nothing has been verified against a standings snapshot.
    verified_at: null,
    actual_outcome: actualOutcome(fixture),
    // No evidence, so no scenarios. Never a fabricated confirmed case.
    scenarios: [],
    summary:
      actualOutcome(fixture) !== null
        ? "The result is confirmed, but its effect on your club's points gap cannot be verified from the available data."
        : "This fixture's effect on your club's points gap cannot be verified from the available data.",
    summary_type: "TEMPLATE",
    caveats: [INSUFFICIENT_CAVEAT],
    sources: [{ ref: manifest.schema_version, label: "Synthetic demo manifest" }],
  };
}

/**
 * Relevant other-team fixtures for a favourite club.
 *
 * Excludes the favourite's own fixtures, which belong to the Journey, and
 * paginates so the client's "follow `next_cursor` to null" loop is exercised
 * rather than assumed.
 */
export function demoRelevantImpact(
  favoriteTeamId: string,
  season: number,
  limit: number,
  cursor: string | null,
): { items: ImpactInsight[]; next_cursor: string | null } | null {
  if (season !== manifest.competition.season_start_year) return null;
  if (!manifest.teams.some((team) => team.id === favoriteTeamId)) return null;

  const others = chronological(
    manifest.fixtures.filter(
      (fixture) =>
        fixture.home_team_id !== favoriteTeamId && fixture.away_team_id !== favoriteTeamId,
    ),
  );

  const offset = cursor === null ? 0 : Number.parseInt(cursor, 10);
  if (!Number.isInteger(offset) || offset < 0) return null;

  const page = others.slice(offset, offset + limit);
  const nextOffset = offset + page.length;

  return {
    items: page.map((fixture) => impactInsight(fixture, favoriteTeamId)),
    next_cursor: nextOffset < others.length ? String(nextOffset) : null,
  };
}

/** Impact for one fixture, including the favourite club's own matches. */
export function demoMatchImpact(matchId: string, favoriteTeamId: string): ImpactInsight | null {
  const fixture = manifest.fixtures.find((candidate) => candidate.id === matchId);
  if (!fixture) return null;
  if (!manifest.teams.some((team) => team.id === favoriteTeamId)) return null;
  return impactInsight(fixture, favoriteTeamId);
}

// Community rooms -------------------------------------------------------------
//
// Two manifest-backed rooms exist, both with ZERO messages.
//
// Gap G9 is why: the manifest gives the burst fixtures a UUID5 namespace but no
// name template, body, author or timestamp step, so neither side can generate
// identical messages. Inventing message content would be fabricated user
// content, so demo rooms are empty and `sync_after_seq` is 0. The empty-room
// path is itself a required contract case, so this is a real scenario rather
// than a hole.
//
// Gap G5: `RoomSummary.title` is required by Appendix A but absent from the
// manifest. Demo mode derives a label from `kind`, which is a display string
// determined by the contract enum rather than invented content. The real title
// is still owed by the backend.
//
// Room status follows the spec's own rules:
//   PRE_MATCH  OPEN while the fixture is SCHEDULED and before kickoff,
//              READ_ONLY from kickoff onwards (archive stays discoverable)
//   POST_MATCH discoverable only once the fixture is FINISHED; a template for a
//              non-finished fixture is HIDDEN and must 404 everywhere
//
// `can_post` and `can_create` are contextual permissions. Demo mode has no
// session, so the caller is always a guest: both are false, and the UI explains
// that signing in is required rather than showing a dead composer.

type ManifestRoom = DemoManifest["rooms"][number];

const ROOM_TITLES: Record<"PRE_MATCH" | "POST_MATCH", string> = {
  PRE_MATCH: "Pre-match discussion",
  POST_MATCH: "Post-match discussion",
};

function roomStatus(room: ManifestRoom, fixture: ManifestFixture): "OPEN" | "READ_ONLY" | "HIDDEN" {
  const beforeKickoff = Date.parse(fixture.kickoff_at) > Date.parse(manifest.demo_clock);

  if (room.kind === "PRE_MATCH") {
    // Clock-driven cutoff: at or past kickoff the room is read-only even if the
    // fixture is still marked SCHEDULED (CT-17).
    return fixture.status === "SCHEDULED" && beforeKickoff ? "OPEN" : "READ_ONLY";
  }
  // A POST_MATCH template is not discoverable until the fixture is FINISHED.
  return fixture.status === "FINISHED" ? "OPEN" : "HIDDEN";
}

function roomSummary(room: ManifestRoom, fixture: ManifestFixture): RoomSummary {
  return {
    id: room.id,
    match_id: room.match_id,
    match: matchSummary(fixture),
    kind: room.kind,
    title: ROOM_TITLES[room.kind],
    status: roomStatus(room, fixture),
    // System-seeded rooms have no creator.
    created_by: null,
    message_count: 0,
    // Guest: cannot post, cannot create. The backend decides this per caller.
    can_post: false,
    can_create: false,
  };
}

function roomWithFixture(roomId: string): { room: ManifestRoom; fixture: ManifestFixture } | null {
  const room = manifest.rooms.find((candidate) => candidate.id === roomId);
  if (!room) return null;
  const fixture = manifest.fixtures.find((candidate) => candidate.id === room.match_id);
  if (!fixture) return null;
  return { room, fixture };
}

/** Only discoverable rooms. A HIDDEN template is excluded from every index. */
function discoverableRooms(): RoomSummary[] {
  const summaries: RoomSummary[] = [];
  for (const room of manifest.rooms) {
    const pair = roomWithFixture(room.id);
    if (!pair) continue;
    const summary = roomSummary(pair.room, pair.fixture);
    if (summary.status !== "HIDDEN") summaries.push(summary);
  }
  return summaries.sort(
    (a, b) => Date.parse(a.match.kickoff_at) - Date.parse(b.match.kickoff_at) || a.id.localeCompare(b.id),
  );
}

export function demoRooms(): { items: RoomSummary[]; next_cursor: null } {
  return { items: discoverableRooms(), next_cursor: null };
}

export function demoMatchRooms(matchId: string): { items: RoomSummary[] } | null {
  if (!manifest.fixtures.some((fixture) => fixture.id === matchId)) return null;
  return { items: discoverableRooms().filter((room) => room.match_id === matchId) };
}

/**
 * One room by id.
 *
 * Returns null for a HIDDEN template as well as an unknown id, so the handler
 * emits the same 404 either way and never leaks that a template exists.
 */
export function demoRoom(roomId: string): RoomSummary | null {
  const pair = roomWithFixture(roomId);
  if (!pair) return null;
  const summary = roomSummary(pair.room, pair.fixture);
  return summary.status === "HIDDEN" ? null : summary;
}

/** Empty message page. `sync_after_seq` is present even with no messages. */
export function demoRoomMessages(roomId: string): RoomMessagesPage | null {
  if (!demoRoom(roomId)) return null;
  return { items: [], next_cursor: null, sync_after_seq: 0 };
}

/** Empty change page that still reports a cursor, so polling is well-formed. */
export function demoRoomChanges(roomId: string, afterSeq: number): RoomChangePage | null {
  if (!demoRoom(roomId)) return null;
  return { items: [], next_after_seq: afterSeq, has_more: false };
}
