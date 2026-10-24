/**
 * FE-03 Journey data guarantees.
 *
 * The demo journey stands in for the backend, so it must produce responses that
 * validate against Appendix A exactly, derive feature flags by the spec's rules
 * rather than invention, and never fabricate a fixture or a score.
 */
import { describe, expect, it } from "vitest";
import { JourneyResponse, MatchDetail, MatchSummary } from "@/lib/api/contract";
import { manifest } from "@/mocks/fixtures";
import { demoJourney, demoMatchDetail, demoMatches } from "@/lib/demo/responses";
import { nextUpcomingId, nodePosition, trailPath } from "@/components/journey/JourneyPath";

const ARSENAL = manifest.teams[0]!.id;

describe("demoJourney", () => {
  it("validates against the Appendix A JourneyResponse schema", () => {
    const journey = demoJourney(ARSENAL, 2026);
    expect(journey).not.toBeNull();
    expect(() => JourneyResponse.parse(journey)).not.toThrow();
  });

  it("returns every fixture the club plays, home or away", () => {
    const journey = demoJourney(ARSENAL, 2026)!;
    const expected = manifest.fixtures.filter(
      (f) => f.home_team_id === ARSENAL || f.away_team_id === ARSENAL,
    );
    expect(journey.items).toHaveLength(expected.length);
    // Away fixtures are included, not hidden.
    expect(journey.items.some((m) => m.away_team.id === ARSENAL || m.home_team.id === ARSENAL)).toBe(true);
  });

  it("orders fixtures chronologically", () => {
    const kickoffs = demoJourney(ARSENAL, 2026)!.items.map((m) => Date.parse(m.kickoff_at));
    expect([...kickoffs].sort((a, b) => a - b)).toEqual(kickoffs);
  });

  it("returns null for an unknown club or a season with no data", () => {
    expect(demoJourney("20000000-0000-4000-8000-0000000099ff", 2026)).toBeNull();
    expect(demoJourney(ARSENAL, 1999)).toBeNull();
  });

  it("never invents a score for a fixture without a result", () => {
    for (const match of demoJourney(ARSENAL, 2026)!.items) {
      if (match.status === "SCHEDULED" || match.status === "POSTPONED" || match.status === "CANCELLED") {
        expect(match.score.home, match.status).toBeNull();
        expect(match.score.away, match.status).toBeNull();
      }
    }
  });

  it("labels every fixture as synthetic demo data", () => {
    for (const match of demoJourney(ARSENAL, 2026)!.items) {
      expect(match.source.kind).toBe("DEMO_SYNTHETIC");
    }
  });
});

describe("feature flags follow the spec's rules", () => {
  const all = demoMatches().items;
  const byStatus = (status: string) => all.filter((m) => m.status === status);

  it("whatif_available is true exactly when the match is FINISHED", () => {
    for (const match of all) {
      expect(match.features.whatif_available, `${match.id} ${match.status}`).toBe(
        match.status === "FINISHED",
      );
    }
  });

  it("predictions_open requires SCHEDULED and a kickoff after the server clock", () => {
    const now = Date.parse(manifest.demo_clock);
    for (const match of all) {
      const expected = match.status === "SCHEDULED" && Date.parse(match.kickoff_at) > now;
      expect(match.features.predictions_open, `${match.id} ${match.status}`).toBe(expected);
    }
  });

  it("never opens predictions on a finished or abandoned match", () => {
    for (const status of ["FINISHED", "POSTPONED", "CANCELLED", "LIVE", "HALFTIME"]) {
      for (const match of byStatus(status)) {
        expect(match.features.predictions_open, status).toBe(false);
      }
    }
  });

  it("keeps a POST_MATCH room hidden until the fixture is FINISHED", () => {
    for (const match of all) {
      if (match.features.post_match_room) expect(match.status).toBe("FINISHED");
    }
  });

  it("reports pre_match_room from room existence, not from posting rights", () => {
    for (const match of all) {
      const exists = manifest.rooms.some((r) => r.match_id === match.id && r.kind === "PRE_MATCH");
      expect(match.features.pre_match_room, match.id).toBe(exists);
    }
  });
});

describe("nextUpcomingId", () => {
  const items = demoMatches().items;

  it("picks the earliest fixture after the server clock", () => {
    const id = nextUpcomingId(items, manifest.demo_clock);
    const now = Date.parse(manifest.demo_clock);
    const expected = items
      .filter((m) => Date.parse(m.kickoff_at) > now)
      .sort((a, b) => Date.parse(a.kickoff_at) - Date.parse(b.kickoff_at))[0];
    expect(id).toBe(expected?.id);
  });

  it("uses the server clock, so a different clock selects a different node", () => {
    const early = nextUpcomingId(items, "2026-08-01T00:00:00Z");
    const late = nextUpcomingId(items, manifest.demo_clock);
    expect(early).not.toBe(late);
  });

  it("returns null when every fixture is in the past", () => {
    expect(nextUpcomingId(items, "2030-01-01T00:00:00Z")).toBeNull();
  });

  it("returns null without a server clock rather than falling back to local time", () => {
    expect(nextUpcomingId(items, null)).toBeNull();
    expect(nextUpcomingId(items, "not a date")).toBeNull();
  });
});

describe("demoMatches and demoMatchDetail", () => {
  it("exposes every manifest fixture for browsing without a favourite club", () => {
    const { items } = demoMatches();
    expect(items).toHaveLength(manifest.fixtures.length);
    for (const match of items) expect(() => MatchSummary.parse(match)).not.toThrow();
  });

  it("validates a match detail against the Appendix A schema", () => {
    const detail = demoMatchDetail(manifest.fixtures[2]!.id);
    expect(() => MatchDetail.parse(detail)).not.toThrow();
  });

  it("returns null for an unknown match id", () => {
    expect(demoMatchDetail("30000000-0000-4000-8000-0000000099ff")).toBeNull();
  });

  it("reports absent statistics and lineups as null, never as invented analysis", () => {
    const detail = demoMatchDetail(manifest.fixtures[2]!.id)!;
    expect(detail.statistics).toBeNull();
    expect(detail.lineups).toBeNull();
  });

  it("carries the manifest's own data capabilities", () => {
    const fixture = manifest.fixtures[2]!;
    expect(demoMatchDetail(fixture.id)!.data_capabilities).toEqual(fixture.capabilities);
  });
});

describe("board geometry", () => {
  it("winds centre -> right -> centre -> left, so the trail reads as a route", () => {
    const xs = [0, 1, 2, 3, 4].map((i) => Math.round(nodePosition(i).xPercent));
    expect(xs).toEqual([50, 76, 50, 24, 50]);
  });

  it("keeps every node inside the board width", () => {
    for (let i = 0; i < 40; i += 1) {
      const { xPercent } = nodePosition(i);
      expect(xPercent).toBeGreaterThanOrEqual(20);
      expect(xPercent).toBeLessThanOrEqual(80);
    }
  });

  it("spaces nodes evenly down the page", () => {
    const gaps = [1, 2, 3, 4].map((i) => nodePosition(i).yPx - nodePosition(i - 1).yPx);
    expect(new Set(gaps).size).toBe(1);
  });

  it("builds a trail joining every node centre", () => {
    const path = trailPath(4);
    expect(path.startsWith("M ")).toBe(true);
    // One cubic segment between each consecutive pair.
    expect(path.match(/C /g)).toHaveLength(3);
    for (const i of [1, 2, 3]) {
      expect(path).toContain(String(nodePosition(i).yPx));
    }
  });

  it("handles a single fixture and an empty season without throwing", () => {
    // Room callouts need a little more vertical breathing room than the
    // original board, so the node centre follows the current 184px row.
    expect(trailPath(1)).toBe("M 50 92");
    expect(trailPath(0)).toBe("");
  });
});
