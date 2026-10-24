// CT-13: validate all 11 A4 contract-edge cases and their manifest references.
import { describe, expect, it } from "vitest";
import { PredictionRequest } from "@/lib/api/contract";
import { edgeCases, manifest } from "@/mocks/fixtures";
import { isUuid, londonCivilDate } from "./helpers";

const { cases } = edgeCases;
const ARSENAL = "20000000-0000-4000-8000-000000000001";
const CHELSEA = "20000000-0000-4000-8000-000000000002";
const WEST_HAM = "20000000-0000-4000-8000-000000000004";
const teams = new Set(manifest.teams.map((team) => team.id));
const venues = new Map([...manifest.venues, ...edgeCases.venues].map((venue) => [venue.id, venue]));
const fixtureCases = {
  FAVORITE_AWAY: cases.FAVORITE_AWAY,
  NEUTRAL_VENUE: cases.NEUTRAL_VENUE,
  MIXED_FINISHED: cases.MIXED_FINISHED,
  MIXED_LIVE: cases.MIXED_LIVE,
  LONDON_DST_AUTUMN_BEFORE_FALLBACK: cases.LONDON_DST_AUTUMN_BEFORE_FALLBACK,
  LONDON_DST_AUTUMN_AFTER_FALLBACK: cases.LONDON_DST_AUTUMN_AFTER_FALLBACK,
};

describe("edge corpus envelope", () => {
  it("contains exactly the 11 mandatory case keys", () => {
    expect(Object.keys(cases).sort()).toEqual(
      [
        "CLOCK_CUTOFF",
        "EMPTY_ROOM_BURST",
        "FAVORITE_AWAY",
        "HIDDEN_OLD_MESSAGE",
        "LONDON_DST_AUTUMN_AFTER_FALLBACK",
        "LONDON_DST_AUTUMN_BEFORE_FALLBACK",
        "MAP_NO_FAVORITE",
        "MIXED_FINISHED",
        "MIXED_LIVE",
        "NEUTRAL_VENUE",
        "PREDICTION_SCORE_CONSTRAINT",
      ].sort(),
    );
  });

  it("is an isolated namespace for the canonical competition and season", () => {
    expect(edgeCases.namespace).toBe("edge-only-not-public-demo");
    expect(edgeCases.competition_id).toBe(manifest.competition.id);
    expect(edgeCases.season_start_year).toBe(manifest.competition.season_start_year);
  });

  it("uses edge-only UUIDs that never collide with demo manifest IDs", () => {
    const manifestIds = new Set(
      [manifest.teams, manifest.venues, manifest.fixtures, manifest.rooms, manifest.users].flatMap((items) =>
        items.map((item) => item.id),
      ),
    );
    const edgeIds = [
      ...Object.values(fixtureCases).map((c) => c.id),
      ...edgeCases.venues.map((v) => v.id),
      cases.EMPTY_ROOM_BURST.room_id,
      cases.HIDDEN_OLD_MESSAGE.room_id,
    ];
    expect(edgeIds.every(isUuid)).toBe(true);
    expect(new Set(edgeIds).size).toBe(edgeIds.length);
    expect(edgeIds.filter((id) => manifestIds.has(id))).toEqual([]);
  });

  it("only uses coord_verified venues with recorded coordinate provenance", () => {
    for (const venue of edgeCases.venues) {
      expect(venue.coord_verified).toBe(true);
      expect(venue.coord_source).toMatch(/^https:\/\//);
    }
  });
});

describe("edge fixtures", () => {
  it.each(Object.entries(fixtureCases))("%s references known teams and venues", (_, { fixture }) => {
    expect(teams.has(fixture.home_team_id)).toBe(true);
    expect(teams.has(fixture.away_team_id)).toBe(true);
    expect(fixture.home_team_id).not.toBe(fixture.away_team_id);
    if (fixture.venue_id !== undefined) expect(venues.has(fixture.venue_id)).toBe(true);
  });

  it("has one fixture per team per matchday inside the corpus", () => {
    const seen = new Set<string>();
    for (const { fixture } of Object.values(fixtureCases)) {
      for (const team of [fixture.home_team_id, fixture.away_team_id]) {
        const key = `${fixture.matchday}:${team}`;
        expect(seen.has(key), key).toBe(false);
        seen.add(key);
      }
    }
  });

  it("FAVORITE_AWAY: Arsenal away at a Chelsea home venue without an Arsenal home outline", () => {
    const { fixture, expected } = cases.FAVORITE_AWAY;
    expect([fixture.home_team_id, fixture.away_team_id]).toEqual([CHELSEA, ARSENAL]);
    expect(fixture).toMatchObject({ matchday: 18, kickoff_at: "2026-12-19T15:00:00Z" });
    const venue = venues.get(fixture.venue_id ?? "");
    expect(venue?.home_team_ids).toContain(CHELSEA);
    expect(venue?.home_team_ids).not.toContain(ARSENAL);
    expect(expected).toEqual({ favorite_fixture_visible: true, favorite_home_outline: false });
  });

  it("NEUTRAL_VENUE: verified neutral venue lands in stadiums (CT-04)", () => {
    const { fixture, expected } = cases.NEUTRAL_VENUE;
    expect(fixture.venue_id).toBe("60000000-0000-4000-8000-000000000001");
    const venue = venues.get(fixture.venue_id ?? "");
    expect(venue).toMatchObject({ coord_verified: true, home_team_ids: [] });
    expect(expected).toEqual({ map_bucket: "stadiums", home_team_ids: [] });
  });

  it("MIXED_FINISHED + MIXED_LIVE share a venue, matchday and London date (CT-05)", () => {
    const finished = cases.MIXED_FINISHED.fixture;
    const live = cases.MIXED_LIVE.fixture;
    expect(finished.venue_id).toBe("60000000-0000-4000-8000-000000000002");
    expect(live.venue_id).toBe(finished.venue_id);
    expect(live.matchday).toBe(finished.matchday);
    expect(londonCivilDate(live.kickoff_at)).toBe(londonCivilDate(finished.kickoff_at));
    expect(finished.status).toBe("FINISHED");
    expect(finished.score?.home).not.toBeNull();
    expect(finished.score?.away).not.toBeNull();
    expect(live).toMatchObject({ status: "LIVE", home_team_id: ARSENAL, away_team_id: WEST_HAM });
    // A3 venue precedence: any LIVE/HALFTIME wins the aggregate state.
    const aggregate = [finished, live].some((f) => f.status === "LIVE" || f.status === "HALFTIME") ? "LIVE" : null;
    expect(aggregate).toBe(cases.MIXED_LIVE.expected.aggregate_state);
    expect(cases.MIXED_FINISHED.expected.clickable).toBe(true);
    expect(cases.MIXED_LIVE.expected.finished_fixture_clickable).toBe(true);
  });

  it.each([
    ["LONDON_DST_AUTUMN_BEFORE_FALLBACK", "2026-10-24T23:30:00Z"],
    ["LONDON_DST_AUTUMN_AFTER_FALLBACK", "2026-10-25T23:30:00Z"],
  ] as const)("%s filters to the expected Europe/London civil day", (name, kickoff) => {
    const { fixture, expected } = cases[name];
    expect(fixture.kickoff_at).toBe(kickoff);
    expect(expected.london_date).toBe("2026-10-25");
    expect(londonCivilDate(fixture.kickoff_at)).toBe(expected.london_date);
  });

  it("DST cases straddle the 2026-10-25 01:00Z autumn fallback", () => {
    const fallback = "2026-10-25T01:00:00Z";
    expect(cases.LONDON_DST_AUTUMN_BEFORE_FALLBACK.fixture.kickoff_at < fallback).toBe(true);
    expect(cases.LONDON_DST_AUTUMN_AFTER_FALLBACK.fixture.kickoff_at > fallback).toBe(true);
    // One minute either side of the fallback is still the same London day.
    expect(londonCivilDate("2026-10-24T22:59:00Z")).toBe("2026-10-24");
    expect(londonCivilDate("2026-10-24T23:00:00Z")).toBe("2026-10-25");
  });
});

describe("behavioral cases", () => {
  it("EMPTY_ROOM_BURST: 45 messages at limit 20 need three change pages", () => {
    const { generate, initial_sync_after_seq } = cases.EMPTY_ROOM_BURST;
    expect(cases.EMPTY_ROOM_BURST.room_id).toBe("70000000-0000-4000-8000-000000000001");
    expect(initial_sync_after_seq).toBe(0);
    expect(generate.count).toBeGreaterThanOrEqual(45);
    expect(Math.ceil(generate.count / generate.limit)).toBe(generate.pages);
    expect(generate.pages).toBeGreaterThanOrEqual(3);
  });

  it("HIDDEN_OLD_MESSAGE: at least 120 generated messages with content-safe replay", () => {
    const { room_id, generate } = cases.HIDDEN_OLD_MESSAGE;
    expect(room_id).toBe("70000000-0000-4000-8000-000000000002");
    expect(generate.count).toBeGreaterThanOrEqual(120);
    expect(generate).toMatchObject({ hide: "oldest", remove_event: true, replay_never_includes_body: true });
  });

  it("CLOCK_CUTOFF: references a manifest PRE_MATCH room on a SCHEDULED fixture", () => {
    const { fixture_id, room_id, expected } = cases.CLOCK_CUTOFF;
    const target = manifest.fixtures.find((item) => item.id === fixture_id);
    const room = manifest.rooms.find((item) => item.id === room_id);
    expect(target?.status).toBe("SCHEDULED");
    expect(room).toEqual({ id: room_id, match_id: fixture_id, kind: "PRE_MATCH" });
    expect(expected).toEqual({ fixture_status: "SCHEDULED", room_status: "READ_ONLY", post_status: 409 });
  });

  it("PREDICTION_SCORE_CONSTRAINT: frontend validator agrees with every case (CT-18)", () => {
    const { accepted, rejected, expected_status } = cases.PREDICTION_SCORE_CONSTRAINT;
    expect(expected_status).toBe(422);
    const body = ([outcome, home_score, away_score]: (typeof accepted)[number]) => ({ outcome, home_score, away_score });
    for (const tuple of accepted) expect(PredictionRequest.safeParse(body(tuple)).success, String(tuple)).toBe(true);
    for (const tuple of rejected) expect(PredictionRequest.safeParse(body(tuple)).success, String(tuple)).toBe(false);
  });

  it("MAP_NO_FAVORITE: Impact only after an explicit guest Arsenal choice (CT-15)", () => {
    const item = cases.MAP_NO_FAVORITE;
    expect(item.explicit_guest_team_id).toBe(ARSENAL);
    expect(item.expected).toEqual({
      authenticated_impact_call: false,
      guest_without_selection_impact_call: false,
      guest_selected_impact_call: true,
    });
  });

  it("status/capability matrix points at manifest fixtures with matching status", () => {
    const byKey = new Map(manifest.fixtures.map((item) => [item.key, item]));
    for (const [status, key] of Object.entries(edgeCases.g0_status_capability_matrix)) {
      if (key === "edge-only") continue;
      const target = byKey.get(key);
      expect(target, `${status} -> ${key}`).toBeDefined();
      const expectedStatus = status.startsWith("FINISHED") ? "FINISHED" : status === "NON_RELEVANT" ? "SCHEDULED" : status;
      expect(target?.status).toBe(expectedStatus);
    }
  });
});
