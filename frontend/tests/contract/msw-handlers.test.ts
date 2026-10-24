// Frozen FE-00 MSW handlers return Appendix A-conforming bodies and headers.
import { setupServer } from "msw/node";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { z } from "zod";
import * as C from "@/lib/api/contract";
import { handlers } from "@/mocks/handlers";
import { teamSummaries } from "@/mocks/fixtures";

const ORIGIN = "http://localhost:3000";
const server = setupServer(...handlers);
const get = (path: string) => fetch(`${ORIGIN}/api/v1${path}`);

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterAll(() => server.close());

describe("frozen handlers", () => {
  it("GET /health", async () => {
    const response = await get("/health");
    expect(response.status).toBe(200);
    C.HealthResponse.parse(await response.json());
  });

  it("GET /auth/me returns a guest with private cache headers", async () => {
    const response = await get("/auth/me");
    expect(response.status).toBe(200);
    expect(C.AuthMeResponse.parse(await response.json())).toEqual({ user: null });
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(response.headers.get("vary")).toBe("Cookie");
  });

  it("GET /competitions", async () => {
    const body = C.Items(C.CompetitionSummary).parse(await (await get("/competitions")).json());
    expect(body.items.map((item) => item.code)).toEqual(["PL"]);
  });

  it("GET /teams?competition=PL sorts by name with explicit null crests", async () => {
    const body = C.Items(C.TeamSummary).parse(await (await get("/teams?competition=PL")).json());
    expect(body.items).toEqual(teamSummaries());
    expect(body.items.map((team) => team.name)).toEqual([...body.items.map((team) => team.name)].sort());
    expect(body.items.every((team) => team.crest_url === null)).toBe(true);
  });

  it("GET /teams without competition is 422 INVALID_INPUT", async () => {
    const response = await get("/teams");
    expect(response.status).toBe(422);
    expect(C.ErrorEnvelope.parse(await response.json()).error.code).toBe("INVALID_INPUT");
  });

  it("GET /competitions/PL/matchdays ascending", async () => {
    const response = await get("/competitions/PL/matchdays?season=2026");
    const matchdays = C.Items(z.number().int().positive()).parse(await response.json());
    expect(matchdays.items).toEqual([...matchdays.items].sort((a, b) => a - b));
    expect(new Set(matchdays.items).size).toBe(matchdays.items.length);
  });

  it("GET /competitions/PL/matchdays without season is 422", async () => {
    const response = await get("/competitions/PL/matchdays");
    expect(response.status).toBe(422);
    C.ErrorEnvelope.parse(await response.json());
  });

  it("leaves routes that need unresolved G0 data unhandled", async () => {
    await expect(get("/journey?team_id=20000000-0000-4000-8000-000000000001&season=2026")).rejects.toThrow();
    await expect(get("/meta")).rejects.toThrow();
  });
});

describe("A1 error catalogue", () => {
  it("assigns every code a single documented status", () => {
    expect(C.ERROR_STATUS).toEqual({
      UNAUTHENTICATED: 401,
      FORBIDDEN: 403,
      PREMIUM_REQUIRED: 403,
      CSRF_ORIGIN_INVALID: 403,
      NOT_FOUND: 404,
      PREDICTION_CLOSED: 409,
      ROOM_CLOSED: 409,
      MATCH_NOT_FINISHED: 409,
      IDEMPOTENCY_CONFLICT: 409,
      WHATIF_THREAD_BUSY: 409,
      WHATIF_TURN_SUPERSEDED: 409,
      WHATIF_THREAD_LIMIT: 409,
      INVALID_INPUT: 422,
      RATE_LIMITED: 429,
      PROVIDER_UNAVAILABLE: 502,
      AI_UNAVAILABLE: 503,
    });
  });

  it("rejects envelopes with unknown codes or extra fields", () => {
    const base = { code: "NOT_FOUND", message: "x", details: {}, request_id: "req_1" };
    expect(C.ErrorEnvelope.safeParse({ error: base }).success).toBe(true);
    expect(C.ErrorEnvelope.safeParse({ error: { ...base, code: "SYNC_EXPIRED" } }).success).toBe(false);
    expect(C.ErrorEnvelope.safeParse({ error: { ...base, extra: 1 } }).success).toBe(false);
  });
});

describe("What-if evidence join (CT-14, frontend schema side)", () => {
  const analysis = {
    classification: "COUNTERFACTUAL_COACH_DECISION",
    verdict: "UNCERTAIN",
    headline: "h",
    response: "r",
    supports: [{ text: "s", evidence_refs: ["EVENT:80000000-0000-4000-8000-000000000001"] }],
    challenges: [],
    assumptions: [],
    unknowns: [],
    follow_up_questions: [],
    confidence: "LOW",
    disclaimer: "d",
  };
  const message = (evidence: unknown[]) => ({
    id: "b0000000-0000-4000-8000-000000000001",
    speaker: "AI",
    created_at: "2026-10-24T12:00:00Z",
    delivery_state: "COMPLETE",
    analysis,
    source_data_version: "v",
    evidence,
    validation_status: "VERIFIED_REFERENCES",
    model_label: "DEMO_AI",
  });
  const finalScore = {
    kind: "FINAL_SCORE",
    ref: "EVENT:80000000-0000-4000-8000-000000000001",
    label: "Final score",
    source_data_version: "v",
    verified_at: null,
    match_id: "30000000-0000-4000-8000-000000000003",
    match_status: "FINISHED",
    score: { home: 2, away: 1 },
  };

  it("accepts refs that join to the same message's evidence", () => {
    expect(C.AIWhatifMessage.safeParse(message([finalScore])).success).toBe(true);
  });

  it("rejects dangling evidence refs", () => {
    expect(C.AIWhatifMessage.safeParse(message([])).success).toBe(false);
  });
});
