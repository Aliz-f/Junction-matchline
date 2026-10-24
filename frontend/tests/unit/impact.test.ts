/**
 * FE-06 Impact guarantees.
 *
 * The rules that matter here are about honesty rather than layout: missing
 * evidence must surface as UNKNOWN with zero scenarios and a caveat, a verified
 * result must still be reported, the favourite's own fixtures must not appear in
 * the relevant feed, and pagination must cover every fixture exactly once.
 */
import { describe, expect, it } from "vitest";
import { ImpactInsight } from "@/lib/api/contract";
import { manifest } from "@/mocks/fixtures";
import { demoMatchImpact, demoRelevantImpact } from "@/lib/demo/responses";
import {
  nextOwnFixture,
  recommendedInsights,
  unverifiedInsights,
} from "@/components/impact/ImpactScreen";
import { demoJourney } from "@/lib/demo/responses";
import type { ImpactInsight as Insight } from "@/lib/api/types";

const ARSENAL = manifest.teams[0]!.id;
const SEASON = manifest.competition.season_start_year;

function allPages(teamId: string, limit: number): Insight[] {
  const items: Insight[] = [];
  let cursor: string | null = null;
  for (let i = 0; i < 50; i += 1) {
    const page = demoRelevantImpact(teamId, SEASON, limit, cursor);
    if (!page) throw new Error("no page");
    items.push(...page.items);
    cursor = page.next_cursor;
    if (cursor === null) break;
  }
  return items;
}

describe("demoRelevantImpact", () => {
  it("validates every insight against the Appendix A schema", () => {
    for (const insight of allPages(ARSENAL, 100)) {
      expect(() => ImpactInsight.parse(insight)).not.toThrow();
    }
  });

  it("excludes the favourite club's own fixtures", () => {
    for (const insight of allPages(ARSENAL, 100)) {
      expect(insight.match.home_team.id).not.toBe(ARSENAL);
      expect(insight.match.away_team.id).not.toBe(ARSENAL);
    }
  });

  it("covers every other-team fixture exactly once across pages", () => {
    const expected = manifest.fixtures
      .filter((f) => f.home_team_id !== ARSENAL && f.away_team_id !== ARSENAL)
      .map((f) => f.id);
    const ids = allPages(ARSENAL, 2).map((i) => i.match_id);
    expect(ids.sort()).toEqual(expected.sort());
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("paginates, so the client's cursor loop is actually exercised", () => {
    const first = demoRelevantImpact(ARSENAL, SEASON, 2, null)!;
    expect(first.items).toHaveLength(2);
    expect(first.next_cursor).not.toBeNull();
  });

  it("ends with a null cursor rather than looping", () => {
    let cursor: string | null = null;
    let pages = 0;
    for (;;) {
      // Annotated because `cursor` is assigned from `page`, which TS cannot infer.
      const page: { items: Insight[]; next_cursor: string | null } = demoRelevantImpact(
        ARSENAL,
        SEASON,
        3,
        cursor,
      )!;
      pages += 1;
      cursor = page.next_cursor;
      if (cursor === null) break;
      expect(pages).toBeLessThan(20);
    }
    expect(pages).toBeGreaterThan(1);
  });

  it("rejects an unknown club, a wrong season and a bad cursor", () => {
    expect(demoRelevantImpact("20000000-0000-4000-8000-0000000099ff", SEASON, 20, null)).toBeNull();
    expect(demoRelevantImpact(ARSENAL, 1999, 20, null)).toBeNull();
    expect(demoRelevantImpact(ARSENAL, SEASON, 20, "nonsense")).toBeNull();
  });
});

describe("missing evidence is reported, never fabricated", () => {
  const insights = allPages(ARSENAL, 100);

  it("marks every insight UNKNOWN with INSUFFICIENT_DATA while gap G7 is open", () => {
    for (const insight of insights) {
      expect(insight.relevance).toBe("UNKNOWN");
      expect(insight.basis).toBe("INSUFFICIENT_DATA");
    }
  });

  it("returns no scenarios when there is no standings evidence", () => {
    for (const insight of insights) {
      expect(insight.scenarios).toEqual([]);
    }
  });

  it("never reports NONE, which would wrongly imply no possible effect", () => {
    for (const insight of insights) {
      expect(insight.relevance).not.toBe("NONE");
      expect(insight.basis).not.toBe("NONE");
    }
  });

  it("carries an explicit caveat explaining the unverified state", () => {
    for (const insight of insights) {
      expect(insight.caveats.length).toBeGreaterThan(0);
      expect(insight.caveats.join(" ")).toMatch(/cannot be verified/i);
    }
  });

  it("leaves verified_at null, since nothing was verified", () => {
    for (const insight of insights) expect(insight.verified_at).toBeNull();
  });

  it("still reports the verified actual outcome of a finished fixture", () => {
    const finished = insights.filter((i) => i.match.status === "FINISHED");
    expect(finished.length).toBeGreaterThan(0);
    for (const insight of finished) {
      expect(insight.actual_outcome).not.toBeNull();
      const { home, away } = insight.match.score;
      const expected = home! > away! ? "HOME" : home! < away! ? "AWAY" : "DRAW";
      expect(insight.actual_outcome).toBe(expected);
    }
  });

  it("reports no outcome for a fixture that has not finished", () => {
    for (const insight of insights) {
      if (insight.match.status !== "FINISHED") expect(insight.actual_outcome).toBeNull();
    }
  });

  it("labels the summary as a template, not AI output", () => {
    for (const insight of insights) expect(insight.summary_type).toBe("TEMPLATE");
  });

  it("cites a source for every insight", () => {
    for (const insight of insights) expect(insight.sources.length).toBeGreaterThan(0);
  });
});

describe("demoMatchImpact", () => {
  it("works for the favourite club's own fixture too", () => {
    const own = manifest.fixtures.find((f) => f.home_team_id === ARSENAL)!;
    const insight = demoMatchImpact(own.id, ARSENAL)!;
    expect(() => ImpactInsight.parse(insight)).not.toThrow();
    expect(insight.match_id).toBe(own.id);
  });

  it("returns null for an unknown match or club", () => {
    expect(demoMatchImpact("30000000-0000-4000-8000-0000000099ff", ARSENAL)).toBeNull();
    expect(demoMatchImpact(manifest.fixtures[0]!.id, "20000000-0000-4000-8000-0000000099ff")).toBeNull();
  });

  it("embeds the full match, so no second fetch is needed", () => {
    const insight = demoMatchImpact(manifest.fixtures[2]!.id, ARSENAL)!;
    expect(insight.match.home_team.short_name.length).toBeGreaterThan(0);
    expect(insight.match.id).toBe(insight.match_id);
  });
});

describe("recommendation ordering", () => {
  const insights = allPages(ARSENAL, 100);

  it("never recommends an UNKNOWN fixture", () => {
    expect(recommendedInsights(insights)).toEqual([]);
  });

  it("places UNKNOWN fixtures in the unverified section instead of dropping them", () => {
    expect(unverifiedInsights(insights)).toHaveLength(insights.length);
  });

  it("orders HIGH before MEDIUM before LOW, dates ascending within a band", () => {
    const base = insights[0]!;
    const make = (relevance: Insight["relevance"], kickoff: string, id: string): Insight => ({
      ...base,
      relevance,
      basis: "POINTS_GAP",
      match_id: id,
      match: { ...base.match, id, kickoff_at: kickoff },
    });
    const ordered = recommendedInsights([
      make("LOW", "2026-08-01T12:00:00Z", "30000000-0000-4000-8000-00000000000a"),
      make("HIGH", "2026-09-01T12:00:00Z", "30000000-0000-4000-8000-00000000000b"),
      make("HIGH", "2026-08-15T12:00:00Z", "30000000-0000-4000-8000-00000000000c"),
      make("MEDIUM", "2026-08-02T12:00:00Z", "30000000-0000-4000-8000-00000000000d"),
    ]);
    expect(ordered.map((i) => i.relevance)).toEqual(["HIGH", "HIGH", "MEDIUM", "LOW"]);
    // Within HIGH, the earlier kickoff comes first.
    expect(ordered[0]!.match.kickoff_at).toBe("2026-08-15T12:00:00Z");
  });
});

describe("nextOwnFixture", () => {
  const journey = demoJourney(ARSENAL, SEASON)!;

  it("picks the next SCHEDULED fixture by the server clock", () => {
    const next = nextOwnFixture(journey.items, manifest.demo_clock);
    expect(next).not.toBeNull();
    expect(next!.status).toBe("SCHEDULED");
    expect(Date.parse(next!.kickoff_at)).toBeGreaterThan(Date.parse(manifest.demo_clock));
  });

  it("ignores finished and postponed fixtures", () => {
    const next = nextOwnFixture(journey.items, manifest.demo_clock);
    expect(next!.status).not.toBe("POSTPONED");
    expect(next!.status).not.toBe("FINISHED");
  });

  it("returns null without a server clock rather than using local time", () => {
    expect(nextOwnFixture(journey.items, null)).toBeNull();
    expect(nextOwnFixture(journey.items, "not a date")).toBeNull();
  });

  it("returns null when nothing is scheduled ahead", () => {
    expect(nextOwnFixture(journey.items, "2030-01-01T00:00:00Z")).toBeNull();
  });
});
