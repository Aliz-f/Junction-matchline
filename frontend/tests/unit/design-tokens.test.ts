/**
 * FE-01 design-token guarantees.
 *
 * These assert the properties the spec actually cares about: every status is
 * representable, status is never carried by colour alone, and competition
 * identity and match state use disjoint colour scales.
 */
import { describe, expect, it } from "vitest";
import { MatchStatus } from "@/lib/api/contract";
import { STATUS_TOKENS, statusToken } from "@/lib/design/status";
import { COMPETITION_GROUPS, competitionGroup, competitionToken } from "@/lib/design/competitions";

describe("status tokens", () => {
  it("covers every A1 MatchStatus, including SUSPENDED and UNKNOWN", () => {
    for (const status of MatchStatus.options) {
      expect(STATUS_TOKENS[status], status).toBeDefined();
    }
    expect(Object.keys(STATUS_TOKENS).sort()).toEqual([...MatchStatus.options].sort());
  });

  it("gives every status a non-empty text label and description", () => {
    for (const status of MatchStatus.options) {
      const token = STATUS_TOKENS[status];
      expect(token.label.trim(), status).not.toBe("");
      expect(token.description.trim(), status).not.toBe("");
    }
  });

  it("uses distinct labels, so no two statuses read identically", () => {
    const labels = MatchStatus.options.map((status) => STATUS_TOKENS[status].label);
    expect(new Set(labels).size).toBe(labels.length);
  });

  it("animates only in-progress statuses, and never as the sole signal", () => {
    const animated = MatchStatus.options.filter((status) => STATUS_TOKENS[status].animated);
    expect(animated).toEqual(["LIVE", "HALFTIME"]);
    // Each animated status still has a label and a distinct icon.
    for (const status of animated) {
      expect(STATUS_TOKENS[status].label.trim()).not.toBe("");
    }
  });

  it("treats statuses with no trustworthy result as result-less", () => {
    expect(STATUS_TOKENS.SCHEDULED.withoutResult).toBe(true);
    expect(STATUS_TOKENS.POSTPONED.withoutResult).toBe(true);
    expect(STATUS_TOKENS.CANCELLED.withoutResult).toBe(true);
    expect(STATUS_TOKENS.UNKNOWN.withoutResult).toBe(true);
    expect(STATUS_TOKENS.FINISHED.withoutResult).toBe(false);
  });

  it("degrades an unrecognised status to UNKNOWN, never to SCHEDULED", () => {
    expect(statusToken("NOT_A_STATUS")).toBe(STATUS_TOKENS.UNKNOWN);
    expect(statusToken("")).toBe(STATUS_TOKENS.UNKNOWN);
    expect(statusToken("scheduled")).toBe(STATUS_TOKENS.UNKNOWN);
  });
});

describe("competition tokens", () => {
  it("resolves the only competition the frozen manifest contains", () => {
    const token = competitionToken("pl_demo");
    expect(token.key).toBe("pl");
    expect(token.motif).toBe("pitch");
  });

  it("falls back to neutral for an unknown or absent brand key", () => {
    for (const value of ["", "mystery_cup", null, undefined]) {
      expect(competitionToken(value).key, String(value)).toBe("neutral");
    }
  });

  it("groups competitions for the All / League / Cup filter", () => {
    expect(COMPETITION_GROUPS).toEqual(["ALL", "LEAGUE", "CUP"]);
    expect(competitionGroup(competitionToken("pl_demo"))).toBe("LEAGUE");
    expect(competitionGroup(competitionToken("facup_demo"))).toBe("CUP");
    expect(competitionGroup(competitionToken("mystery"))).toBeNull();
  });
});

describe("competition and status scales are independent", () => {
  it("shares no CSS custom property between the two scales", () => {
    const statusVars = new Set(MatchStatus.options.map((status) => STATUS_TOKENS[status].toneVar));
    const competitionVars = new Set(
      ["pl_demo", "ucl_demo", "facup_demo", "unknown"].map((key) => competitionToken(key).accentVar),
    );
    for (const accent of competitionVars) {
      expect(statusVars.has(accent), accent).toBe(false);
    }
  });
});
