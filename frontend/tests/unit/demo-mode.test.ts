/**
 * Demo-mode guarantees (FE-01).
 *
 * Demo mode exists so the deployed frontend is navigable before the backend
 * does. These tests pin the properties that keep it honest: every value is
 * derived from the frozen manifest, nothing is invented, and the responses are
 * contract-shaped.
 */
import { describe, expect, it } from "vitest";
import { MetaView, HealthResponse, CompetitionSummary, TeamSummary, ErrorEnvelope } from "@/lib/api/contract";
import { manifest } from "@/mocks/fixtures";
import {
  DEMO_CLOCK,
  DEMO_DATA_SOURCE,
  demoCompetitions,
  demoErrorEnvelope,
  demoFixtureIds,
  demoHealth,
  demoMatchdays,
  demoMeta,
  demoRoomIds,
  demoTeams,
} from "@/lib/demo/responses";

describe("demo /meta", () => {
  it("conforms to the Appendix A MetaView schema", () => {
    expect(() => MetaView.parse(demoMeta())).not.toThrow();
  });

  it("takes server_now_utc from the manifest demo clock, not a hardcoded time", () => {
    expect(demoMeta().server_now_utc).toBe(manifest.demo_clock);
    expect(DEMO_CLOCK).toBe(manifest.demo_clock);
  });

  it("reports a frozen DEMO clock so no ticking countdown is implied", () => {
    const meta = demoMeta();
    expect(meta.mode).toBe("DEMO");
    expect(meta.demo_clock_frozen).toBe(true);
    expect(meta.capabilities.live_updates).toBe(false);
  });

  it("keeps whatif_sharing false for all of Phase 1", () => {
    expect(demoMeta().capabilities.whatif_sharing).toBe(false);
  });

  it("derives the default season from the manifest competition", () => {
    expect(demoMeta().default_season_start_year).toBe(manifest.competition.season_start_year);
    expect(demoMeta().default_competition).toBe("PL");
  });

  it("matches the BE-01 backend on capabilities.events, which the backend owns", () => {
    // BE-01 `/api/v1/meta` returns events=false in DEMO mode. Deriving this
    // from the manifest would give true, because some fixtures advertise event
    // data — so demo mode would silently disagree with the real backend.
    expect(demoMeta().capabilities.events).toBe(false);
    expect(manifest.fixtures.some((f) => f.capabilities.events)).toBe(true);
  });
});

describe("demo collections", () => {
  it("returns a contract-shaped health response", () => {
    expect(() => HealthResponse.parse(demoHealth())).not.toThrow();
  });

  it("returns only the manifest competition", () => {
    const { items } = demoCompetitions();
    expect(items).toHaveLength(1);
    expect(items[0]?.code).toBe(manifest.competition.code);
    for (const item of items) expect(() => CompetitionSummary.parse(item)).not.toThrow();
  });

  it("returns exactly the manifest teams, with no invented club", () => {
    const { items } = demoTeams();
    expect(items).toHaveLength(manifest.teams.length);
    expect(items.map((t) => t.id).sort()).toEqual(manifest.teams.map((t) => t.id).sort());
    for (const item of items) expect(() => TeamSummary.parse(item)).not.toThrow();
  });

  it("returns ascending, unique matchdays", () => {
    const { items } = demoMatchdays();
    expect(items.length).toBeGreaterThan(0);
    expect(new Set(items).size).toBe(items.length);
    expect([...items].sort((a, b) => a - b)).toEqual(items);
  });

  it("exposes exactly the manifest fixture and room ids for deep-link checks", () => {
    expect([...demoFixtureIds()].sort()).toEqual(manifest.fixtures.map((f) => f.id).sort());
    expect([...demoRoomIds()].sort()).toEqual(manifest.rooms.map((r) => r.id).sort());
  });
});

describe("demo errors", () => {
  it("builds a contract-shaped envelope with the A1 status for the code", () => {
    const { body, status } = demoErrorEnvelope("NOT_FOUND", "Competition not found");
    expect(() => ErrorEnvelope.parse(body)).not.toThrow();
    expect(status).toBe(404);
  });

  it("maps each code to its single A1 status", () => {
    expect(demoErrorEnvelope("INVALID_INPUT", "x").status).toBe(422);
    expect(demoErrorEnvelope("PROVIDER_UNAVAILABLE", "x").status).toBe(502);
    expect(demoErrorEnvelope("UNAUTHENTICATED", "x").status).toBe(401);
  });
});

describe("provenance", () => {
  it("labels the manifest as synthetic, so the UI can disclose it", () => {
    expect(DEMO_DATA_SOURCE).toBe("DEMO_SYNTHETIC");
  });

  it("carries a disclaimer that the data is not real football results", () => {
    expect(manifest.disclaimer.toLowerCase()).toContain("synthetic");
  });
});
