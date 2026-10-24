/**
 * FE-05 stadium map data guarantees.
 *
 * The rules worth protecting: exactly one selector, verified coordinates only,
 * every selected fixture accounted for exactly once, and illumination that
 * reflects the server's aggregate rather than browser time.
 */
import { describe, expect, it } from "vitest";
import { StadiumMapResponse } from "@/lib/api/contract";
import { manifest } from "@/mocks/fixtures";
import { demoStadiumMap, londonCalendarDate } from "@/lib/demo/responses";
import { ILLUMINATION_TOKENS, illuminationToken } from "@/lib/design/illumination";

const DEFAULT_DATE = londonCalendarDate(manifest.demo_clock);

describe("londonCalendarDate", () => {
  it("derives the Europe/London calendar date from the server clock", () => {
    // 2026-10-24T12:00:00Z is 13:00 BST, still the 24th.
    expect(DEFAULT_DATE).toBe("2026-10-24");
  });

  it("uses London local date across a UTC midnight boundary in summer", () => {
    // 23:30Z on 15 June is 00:30 BST on the 16th.
    expect(londonCalendarDate("2026-06-15T23:30:00Z")).toBe("2026-06-16");
  });

  it("matches UTC in winter, when London is GMT", () => {
    expect(londonCalendarDate("2026-12-15T23:30:00Z")).toBe("2026-12-15");
  });
});

describe("selector handling", () => {
  it("requires exactly one of date or matchday", () => {
    expect(demoStadiumMap({ date: null, matchday: null })).toBeNull();
    expect(demoStadiumMap({ date: "2026-10-24", matchday: 10 })).toBeNull();
  });

  it("accepts a date alone", () => {
    const map = demoStadiumMap({ date: DEFAULT_DATE, matchday: null })!;
    expect(map.selected).toEqual({ date: DEFAULT_DATE, matchday: null });
  });

  it("accepts a matchday alone", () => {
    const map = demoStadiumMap({ date: null, matchday: 1 })!;
    expect(map.selected).toEqual({ date: null, matchday: 1 });
  });

  it("validates against the Appendix A schema for both selectors", () => {
    expect(() => StadiumMapResponse.parse(demoStadiumMap({ date: DEFAULT_DATE, matchday: null }))).not.toThrow();
    expect(() => StadiumMapResponse.parse(demoStadiumMap({ date: null, matchday: 9 }))).not.toThrow();
  });

  it("keeps an empty date selected rather than substituting a round", () => {
    // 2026-10-25 has no fixture in the manifest.
    const map = demoStadiumMap({ date: "2026-10-25", matchday: null })!;
    expect(map.selected.date).toBe("2026-10-25");
    expect(map.selected.matchday).toBeNull();
    const total =
      map.stadiums.reduce((n, v) => n + v.fixtures.length, 0) + map.unmapped_matches.length;
    expect(total).toBe(0);
  });
});

describe("venues", () => {
  it("returns only coordinate-verified venues", () => {
    const map = demoStadiumMap({ date: DEFAULT_DATE, matchday: null })!;
    for (const venue of map.stadiums) {
      expect(venue.coord_verified).toBe(true);
      expect(Number.isFinite(venue.lat)).toBe(true);
      expect(Number.isFinite(venue.lng)).toBe(true);
    }
  });

  it("returns every verified venue, including those with no selected fixture", () => {
    const verified = manifest.venues.filter((v) => v.coord_verified);
    const map = demoStadiumMap({ date: DEFAULT_DATE, matchday: null })!;
    expect(map.stadiums).toHaveLength(verified.length);
    expect(map.stadiums.some((v) => v.fixtures.length === 0)).toBe(true);
  });

  it("marks a venue with no selected fixture INACTIVE", () => {
    const map = demoStadiumMap({ date: DEFAULT_DATE, matchday: null })!;
    for (const venue of map.stadiums) {
      if (venue.fixtures.length === 0) expect(venue.illumination_state).toBe("INACTIVE");
    }
  });

  it("keeps home_team_ids so the favourite outline works without fixtures", () => {
    const map = demoStadiumMap({ date: DEFAULT_DATE, matchday: null })!;
    for (const venue of map.stadiums) {
      const source = manifest.venues.find((v) => v.id === venue.venue_id)!;
      expect(venue.home_team_ids).toEqual(source.home_team_ids);
    }
  });
});

describe("illumination aggregates", () => {
  it("marks a venue LIVE when a match there is in play", () => {
    // Matchday 10 is the LIVE fixture in the manifest.
    const map = demoStadiumMap({ date: null, matchday: 10 })!;
    const hosting = map.stadiums.filter((v) => v.fixtures.length > 0);
    expect(hosting).toHaveLength(1);
    expect(hosting[0]!.illumination_state).toBe("LIVE");
  });

  it("marks a finished round COMPLETED", () => {
    const map = demoStadiumMap({ date: null, matchday: 1 })!;
    const hosting = map.stadiums.filter((v) => v.fixtures.length > 0);
    expect(hosting[0]!.illumination_state).toBe("COMPLETED");
  });

  it("marks a postponed fixture as disrupted, not completed", () => {
    const map = demoStadiumMap({ date: null, matchday: 13 })!;
    const hosting = map.stadiums.filter((v) => v.fixtures.length > 0);
    expect(hosting[0]!.illumination_state).toBe("POSTPONED_OR_CANCELLED");
  });

  it("marks a future scheduled fixture UPCOMING_ROUND", () => {
    const map = demoStadiumMap({ date: null, matchday: 11 })!;
    const hosting = map.stadiums.filter((v) => v.fixtures.length > 0);
    expect(hosting[0]!.illumination_state).toBe("UPCOMING_ROUND");
  });

  it("only ever emits values from the Illumination enum", () => {
    for (const matchday of manifest.fixtures.map((f) => f.matchday)) {
      const map = demoStadiumMap({ date: null, matchday })!;
      for (const venue of map.stadiums) {
        expect(Object.keys(ILLUMINATION_TOKENS)).toContain(venue.illumination_state);
      }
    }
  });
});

describe("unmapped fixtures", () => {
  it("lists a fixture with no venue rather than dropping or placing it", () => {
    // Matchday 4 has no venue in the manifest.
    const map = demoStadiumMap({ date: null, matchday: 4 })!;
    expect(map.unmapped_matches).toHaveLength(1);
    expect(map.unmapped_matches[0]!.reason).toBe("VENUE_MISSING");
    expect(map.stadiums.every((v) => v.fixtures.length === 0)).toBe(true);
  });

  it("accounts for every selected fixture exactly once", () => {
    for (const matchday of [...new Set(manifest.fixtures.map((f) => f.matchday))]) {
      const map = demoStadiumMap({ date: null, matchday })!;
      const ids = [
        ...map.stadiums.flatMap((v) => v.fixtures.map((f) => f.match.id)),
        ...map.unmapped_matches.map((u) => u.match.id),
      ];
      const expected = manifest.fixtures.filter((f) => f.matchday === matchday).map((f) => f.id);
      expect(ids.sort()).toEqual(expected.sort());
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it("carries the full match summary, so no extra fetch per fixture is needed", () => {
    const map = demoStadiumMap({ date: null, matchday: 4 })!;
    const match = map.unmapped_matches[0]!.match;
    expect(match.home_team.short_name.length).toBeGreaterThan(0);
    expect(match.competition.code).toBe("PL");
  });
});

describe("illuminationToken", () => {
  it("has a label and description for every state", () => {
    for (const [state, token] of Object.entries(ILLUMINATION_TOKENS)) {
      expect(token.label.trim(), state).not.toBe("");
      expect(token.description.trim(), state).not.toBe("");
    }
  });

  it("makes only in-play venues animate", () => {
    const animated = Object.entries(ILLUMINATION_TOKENS)
      .filter(([, t]) => t.animated)
      .map(([s]) => s);
    expect(animated).toEqual(["LIVE"]);
  });

  it("makes INACTIVE venues non-interactive", () => {
    expect(ILLUMINATION_TOKENS.INACTIVE.interactive).toBe(false);
  });

  it("does not give UNKNOWN the upcoming look", () => {
    expect(ILLUMINATION_TOKENS.UNKNOWN.toneVar).not.toBe(ILLUMINATION_TOKENS.UPCOMING_ROUND.toneVar);
  });

  it("degrades an unrecognised state to UNKNOWN", () => {
    expect(illuminationToken("WAT")).toBe(ILLUMINATION_TOKENS.UNKNOWN);
  });
});
