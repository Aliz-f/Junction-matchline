/**
 * FE-04 tab availability.
 *
 * These encode the rules that matter for correctness rather than appearance:
 * the tab set follows backend flags, What-if never appears before a match is
 * finished, and an unavailable deep link degrades to Overview with a reason.
 */
import { describe, expect, it } from "vitest";
import {
  MATCH_TABS,
  availableTabs,
  isMatchTab,
  parseTab,
  resolveTab,
  unavailableReason,
} from "@/components/match/matchTabs";
import { demoMatchDetail, demoMatches } from "@/lib/demo/responses";
import type { MatchDetail } from "@/lib/api/types";

const details = demoMatches()
  .items.map((m) => demoMatchDetail(m.id))
  .filter((d): d is MatchDetail => d !== null);

const byStatus = (status: string) => details.filter((d) => d.status === status);

describe("parseTab", () => {
  it("accepts every known tab", () => {
    for (const tab of MATCH_TABS) expect(parseTab(tab)).toBe(tab);
  });

  it("falls back to overview for anything unrecognised", () => {
    expect(parseTab(undefined)).toBe("overview");
    expect(parseTab("")).toBe("overview");
    expect(parseTab("nonsense")).toBe("overview");
    expect(parseTab("WHATIF")).toBe("overview");
  });

  it("takes the first value when a query parameter repeats", () => {
    expect(parseTab(["events", "whatif"])).toBe("events");
  });

  it("recognises tab names", () => {
    expect(isMatchTab("whatif")).toBe(true);
    expect(isMatchTab("nope")).toBe(false);
  });
});

describe("availableTabs", () => {
  it("always offers overview and impact", () => {
    for (const detail of details) {
      expect(availableTabs(detail), detail.status).toContain("overview");
      expect(availableTabs(detail), detail.status).toContain("impact");
    }
  });

  it("offers What-if only for a FINISHED match", () => {
    for (const detail of details) {
      const hasWhatif = availableTabs(detail).includes("whatif");
      expect(hasWhatif, `${detail.id} ${detail.status}`).toBe(detail.status === "FINISHED");
    }
  });

  it("never offers What-if on a scheduled, live or abandoned match", () => {
    for (const status of ["SCHEDULED", "LIVE", "HALFTIME", "POSTPONED", "CANCELLED"]) {
      for (const detail of byStatus(status)) {
        expect(availableTabs(detail).includes("whatif"), status).toBe(false);
      }
    }
  });

  it("offers Predict only while predictions are open", () => {
    for (const detail of details) {
      expect(availableTabs(detail).includes("predict"), detail.id).toBe(detail.features.predictions_open);
    }
  });

  it("offers Events only when the feed supports them", () => {
    for (const detail of details) {
      expect(availableTabs(detail).includes("events"), detail.id).toBe(detail.data_capabilities.events);
    }
  });

  it("offers Discuss only when a room exists", () => {
    for (const detail of details) {
      const expected = detail.features.pre_match_room || detail.features.post_match_room;
      expect(availableTabs(detail).includes("discuss"), detail.id).toBe(expected);
    }
  });

  it("returns tabs in a stable order with no duplicates", () => {
    for (const detail of details) {
      const tabs = availableTabs(detail);
      expect(new Set(tabs).size).toBe(tabs.length);
      expect(tabs[0]).toBe("overview");
    }
  });
});

describe("resolveTab", () => {
  it("honours a requested tab that is available", () => {
    const finished = byStatus("FINISHED")[0]!;
    expect(resolveTab(finished, "whatif")).toEqual({ tab: "whatif", unavailable: null });
  });

  it("refuses What-if on a match that is not finished and reports why", () => {
    const scheduled = byStatus("SCHEDULED")[0]!;
    const result = resolveTab(scheduled, "whatif");
    expect(result.tab).toBe("overview");
    expect(result.unavailable).toBe("whatif");
    expect(unavailableReason(scheduled, "whatif")).toMatch(/finished/i);
  });

  it("refuses Predict once predictions have closed", () => {
    const finished = byStatus("FINISHED")[0]!;
    const result = resolveTab(finished, "predict");
    expect(result.tab).toBe("overview");
    expect(result.unavailable).toBe("predict");
  });

  it("gives a reason for every tab it can refuse", () => {
    const scheduled = byStatus("SCHEDULED")[0]!;
    for (const tab of MATCH_TABS) {
      expect(unavailableReason(scheduled, tab).trim().length).toBeGreaterThan(0);
    }
  });
});

describe("match detail shape the UI depends on", () => {
  it("reports absent statistics and lineups as null for every fixture", () => {
    for (const detail of details) {
      expect(detail.statistics).toBeNull();
      expect(detail.lineups).toBeNull();
    }
  });

  it("gives every event a description and a traceable source ref", () => {
    for (const detail of details) {
      for (const event of detail.events) {
        expect(event.description.trim(), event.id).not.toBe("");
        expect(event.source_ref.trim(), event.id).not.toBe("");
      }
    }
  });

  it("only carries events when the feed advertises the capability", () => {
    for (const detail of details) {
      if (detail.events.length > 0) expect(detail.data_capabilities.events, detail.id).toBe(true);
    }
  });
});
