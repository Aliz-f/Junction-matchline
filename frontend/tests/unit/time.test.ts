/**
 * Football-local time rendering.
 *
 * Verifies the Europe/London offset is taken from IANA zone data on both sides
 * of a DST boundary, that the timezone is always shown, and that bad input
 * degrades to null instead of "Invalid Date".
 */
import { describe, expect, it } from "vitest";
import { FOOTBALL_TIME_ZONE, formatDate, formatKickoff, formatTime, machineDateTime } from "@/lib/time";

describe("formatKickoff", () => {
  it("renders British Summer Time in summer", () => {
    const formatted = formatKickoff("2026-08-15T14:00:00Z");
    expect(formatted).toContain("BST");
    // 14:00Z is 15:00 BST.
    expect(formatted).toContain("15:00");
  });

  it("renders Greenwich Mean Time in winter", () => {
    const formatted = formatKickoff("2026-12-26T15:00:00Z");
    expect(formatted).toContain("GMT");
    expect(formatted).toContain("15:00");
  });

  it("uses the manifest demo clock correctly (BST on 24 October 2026)", () => {
    // 2026 BST ends 25 October, so the 24th is still BST: 12:00Z -> 13:00.
    const formatted = formatKickoff("2026-10-24T12:00:00Z");
    expect(formatted).toContain("13:00");
    expect(formatted).toContain("BST");
  });

  it("always includes a timezone cue", () => {
    expect(formatKickoff("2026-03-01T12:00:00Z")).toMatch(/GMT|BST/);
  });

  it("returns null for absent or unparseable input", () => {
    expect(formatKickoff(null)).toBeNull();
    expect(formatKickoff(undefined)).toBeNull();
    expect(formatKickoff("")).toBeNull();
    expect(formatKickoff("not a date")).toBeNull();
  });
});

describe("formatDate and formatTime", () => {
  it("formats a date without a time", () => {
    expect(formatDate("2026-10-24T12:00:00Z")).toBe("24 October 2026");
  });

  it("formats a time with its zone", () => {
    expect(formatTime("2026-10-24T12:00:00Z")).toContain("13:00");
    expect(formatTime("2026-10-24T12:00:00Z")).toContain("BST");
  });

  it("returns null on bad input", () => {
    expect(formatDate("nope")).toBeNull();
    expect(formatTime("nope")).toBeNull();
  });
});

describe("machineDateTime", () => {
  it("keeps the UTC value for the datetime attribute", () => {
    expect(machineDateTime("2026-10-24T12:00:00Z")).toBe("2026-10-24T12:00:00Z");
  });

  it("is undefined when there is nothing valid to mark up", () => {
    expect(machineDateTime(null)).toBeUndefined();
    expect(machineDateTime("nope")).toBeUndefined();
  });
});

describe("timezone constant", () => {
  it("renders football-local time, not the runner's local time", () => {
    expect(FOOTBALL_TIME_ZONE).toBe("Europe/London");
  });
});
