/**
 * FE-G0.3 structural gap register: data Appendix A response DTOs need but the
 * BE-00 manifest/corpus does not supply, so FE-00 cannot freeze those mocks
 * without inventing values. The computed list must equal the gaps reported in
 * FE00_HANDOFF.md (items G1–G9); a backend fix makes this fail on purpose so
 * the matching handlers can then be frozen and the item closed.
 */
import { describe, expect, it } from "vitest";
import { edgeCases, manifest } from "@/mocks/fixtures";

const has = (value: object, key: string) => Object.prototype.hasOwnProperty.call(value, key);

function computeGaps(): string[] {
  const gaps: string[] = [];
  const fixtures = manifest.fixtures;
  if (!fixtures.every((f) => has(f, "source") || has(f, "data_version"))) {
    gaps.push("G1 MatchSummary.source.data_version/last_synced_at/is_stale not in manifest fixtures");
  }
  if (!fixtures.every((f) => has(f, "features"))) {
    gaps.push("G2 MatchSummary.features not in manifest fixtures");
  }
  if (!fixtures.flatMap((f) => f.events).every((e) => has(e, "description"))) {
    gaps.push("G3 MatchEvent.description not in manifest events");
  }
  if (!manifest.users.every((u) => has(u, "display_name") && has(u, "role"))) {
    gaps.push("G4 UserPublic.display_name/role not in manifest users");
  }
  if (!manifest.rooms.every((r) => has(r, "title"))) {
    gaps.push("G5 RoomSummary.title not in manifest rooms");
  }
  const upcomingId = fixtures.find((f) => f.key === "match_upcoming")?.id;
  if (!manifest.rooms.some((r) => r.match_id === upcomingId && r.kind === "POST_MATCH")) {
    gaps.push("G6 no hidden POST_MATCH template for match_upcoming (activated by upcoming_finished)");
  }
  if (!Object.values(manifest.scenarios).every((s) => has(s, "standings"))) {
    gaps.push("G7 scenario standings as_of/rows and expected impacts not in manifest");
  }
  const edgeStatuses = new Set(
    Object.values(edgeCases.cases).flatMap((c) => (has(c, "fixture") ? [(c as { fixture: { status: string } }).fixture.status] : [])),
  );
  if (!edgeStatuses.has("SUSPENDED") || !edgeStatuses.has("UNKNOWN")) {
    gaps.push("G8 edge corpus has no SUSPENDED or UNKNOWN fixture");
  }
  const generated = [edgeCases.cases.EMPTY_ROOM_BURST, edgeCases.cases.HIDDEN_OLD_MESSAGE];
  if (!generated.every((c) => has(c.generate, "name_template") && has(c.generate, "body_template"))) {
    gaps.push("G9 UUID5 message recipe lacks name/body/author/timestamp-step inputs");
  }
  return gaps.sort();
}

/** Questions rather than violations: in-progress or finished states dated after the demo clock. */
function computeClockQuestions(): string[] {
  return manifest.fixtures
    .filter((f) => ["LIVE", "HALFTIME", "FINISHED"].includes(f.status) && f.kickoff_at > manifest.demo_clock)
    .map((f) => `Q1 ${f.key} is ${f.status} but kicks off ${f.kickoff_at}, after demo clock`)
    .sort();
}

describe("G0 structural gaps reported to backend", () => {
  it("gap register equals FE00_HANDOFF.md", () => {
    expect(computeGaps()).toEqual(
      [
        "G1 MatchSummary.source.data_version/last_synced_at/is_stale not in manifest fixtures",
        "G2 MatchSummary.features not in manifest fixtures",
        "G3 MatchEvent.description not in manifest events",
        "G4 UserPublic.display_name/role not in manifest users",
        "G5 RoomSummary.title not in manifest rooms",
        "G6 no hidden POST_MATCH template for match_upcoming (activated by upcoming_finished)",
        "G7 scenario standings as_of/rows and expected impacts not in manifest",
        "G8 edge corpus has no SUSPENDED or UNKNOWN fixture",
        "G9 UUID5 message recipe lacks name/body/author/timestamp-step inputs",
      ].sort(),
    );
  });

  it("clock-ordering questions equal FE00_HANDOFF.md", () => {
    expect(computeClockQuestions()).toEqual([
      "Q1 match_event_poor_finished is FINISHED but kicks off 2026-11-29T15:00:00Z, after demo clock",
      "Q1 match_halftime is HALFTIME but kicks off 2026-11-08T15:00:00Z, after demo clock",
    ]);
  });
});
