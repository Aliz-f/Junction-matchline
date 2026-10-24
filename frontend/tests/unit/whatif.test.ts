/**
 * FE-09 What-if attempt handling, turn accounting and evidence joining.
 *
 * These are the rules that stop double charging and fabricated citations, so
 * they are tested as pure logic rather than through the chat UI.
 */
// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import {
  clearAllAttempts,
  clearAttempt,
  loadAttempt,
  reconcileAttempt,
  saveAttempt,
  type WhatifAttempt,
} from "@/lib/whatif/attempt";
import {
  THREAD_TURN_LIMIT,
  admittedTurnCount,
  completedPairs,
  hasPendingTurn,
  hasUnsafeRefs,
  resolveRefs,
  turnAllowance,
  validateMessage,
} from "@/lib/whatif/turns";
import type { AIWhatifMessage, WhatifMessage } from "@/lib/api/types";

const USER = "50000000-0000-4000-8000-000000000001";
const OTHER_USER = "50000000-0000-4000-8000-000000000002";
const THREAD = "90000000-0000-4000-8000-000000000001";

const attempt = (overrides: Partial<WhatifAttempt> = {}): WhatifAttempt => ({
  threadId: THREAD,
  userId: USER,
  clientMessageId: "c0000000-0000-4000-8000-000000000001",
  idempotencyKey: "i0000000-0000-4000-8000-000000000001",
  content: "What if the penalty had been given?",
  createdAt: "2026-10-24T12:00:00Z",
  ...overrides,
});

describe("attempt storage", () => {
  beforeEach(() => {
    clearAllAttempts();
  });

  it("round-trips an attempt", () => {
    expect(saveAttempt(attempt())).toBe(true);
    expect(loadAttempt(USER, THREAD)).toEqual(attempt());
  });

  it("keeps attempts separate per user, so an account switch cannot adopt one", () => {
    saveAttempt(attempt());
    expect(loadAttempt(OTHER_USER, THREAD)).toBeNull();
  });

  it("keeps attempts separate per thread", () => {
    saveAttempt(attempt());
    expect(loadAttempt(USER, "90000000-0000-4000-8000-000000000002")).toBeNull();
  });

  it("clears one attempt", () => {
    saveAttempt(attempt());
    clearAttempt(USER, THREAD);
    expect(loadAttempt(USER, THREAD)).toBeNull();
  });

  it("clears every attempt, for logout and account switches", () => {
    saveAttempt(attempt());
    saveAttempt(attempt({ userId: OTHER_USER }));
    clearAllAttempts();
    expect(loadAttempt(USER, THREAD)).toBeNull();
    expect(loadAttempt(OTHER_USER, THREAD)).toBeNull();
  });

  it("rejects a partial envelope rather than offering an incomplete retry", () => {
    // A missing key must never tempt the caller into minting a new one.
    window.sessionStorage.setItem(
      `matchline:whatif-attempt:v1:${USER}:${THREAD}`,
      JSON.stringify({ threadId: THREAD, userId: USER, content: "x" }),
    );
    expect(loadAttempt(USER, THREAD)).toBeNull();
  });

  it("rejects malformed JSON", () => {
    window.sessionStorage.setItem(`matchline:whatif-attempt:v1:${USER}:${THREAD}`, "{not json");
    expect(loadAttempt(USER, THREAD)).toBeNull();
  });

  it("rejects an envelope whose identity does not match the request", () => {
    window.sessionStorage.setItem(
      `matchline:whatif-attempt:v1:${USER}:${THREAD}`,
      JSON.stringify(attempt({ userId: OTHER_USER })),
    );
    expect(loadAttempt(USER, THREAD)).toBeNull();
  });
});

describe("reconcileAttempt", () => {
  const turn = (id: string, state: "PENDING" | "COMPLETE" | "FAILED", at: string) => ({
    client_message_id: id,
    delivery_state: state,
    created_at: at,
  });

  it("does nothing without a saved attempt", () => {
    expect(reconcileAttempt(null, [])).toEqual({ action: "none" });
  });

  it("allows a resend when the server never saw the turn", () => {
    const saved = attempt();
    const outcome = reconcileAttempt(saved, []);
    expect(outcome).toEqual({ action: "resend", attempt: saved });
  });

  it("drops the envelope once the server completed the turn", () => {
    const saved = attempt();
    expect(
      reconcileAttempt(saved, [turn(saved.clientMessageId, "COMPLETE", "2026-10-24T12:00:00Z")]),
    ).toEqual({ action: "complete" });
  });

  it("waits rather than resending while the turn is pending", () => {
    const saved = attempt();
    expect(
      reconcileAttempt(saved, [turn(saved.clientMessageId, "PENDING", "2026-10-24T12:00:00Z")]),
    ).toEqual({ action: "pending" });
  });

  it("offers a retry with the ORIGINAL key when the turn failed and nothing followed", () => {
    const saved = attempt();
    const outcome = reconcileAttempt(saved, [
      turn(saved.clientMessageId, "FAILED", "2026-10-24T12:00:00Z"),
    ]);
    expect(outcome.action).toBe("retry");
    if (outcome.action === "retry") {
      expect(outcome.attempt.idempotencyKey).toBe(saved.idempotencyKey);
      expect(outcome.attempt.content).toBe(saved.content);
    }
  });

  it("reports superseded when a later turn was accepted (A FAIL, B COMPLETE)", () => {
    const saved = attempt();
    expect(
      reconcileAttempt(saved, [
        turn(saved.clientMessageId, "FAILED", "2026-10-24T12:00:00Z"),
        turn("c0000000-0000-4000-8000-000000000002", "COMPLETE", "2026-10-24T12:05:00Z"),
      ]),
    ).toEqual({ action: "superseded" });
  });

  it("is still superseded when the later accepted turn is only pending", () => {
    const saved = attempt();
    expect(
      reconcileAttempt(saved, [
        turn(saved.clientMessageId, "FAILED", "2026-10-24T12:00:00Z"),
        turn("c0000000-0000-4000-8000-000000000002", "PENDING", "2026-10-24T12:05:00Z"),
      ]),
    ).toEqual({ action: "superseded" });
  });

  it("is not superseded by another FAILED turn", () => {
    const saved = attempt();
    const outcome = reconcileAttempt(saved, [
      turn(saved.clientMessageId, "FAILED", "2026-10-24T12:00:00Z"),
      turn("c0000000-0000-4000-8000-000000000002", "FAILED", "2026-10-24T12:05:00Z"),
    ]);
    expect(outcome.action).toBe("retry");
  });

  it("is not superseded by an EARLIER accepted turn", () => {
    const saved = attempt();
    const outcome = reconcileAttempt(saved, [
      turn("c0000000-0000-4000-8000-000000000000", "COMPLETE", "2026-10-24T11:00:00Z"),
      turn(saved.clientMessageId, "FAILED", "2026-10-24T12:00:00Z"),
    ]);
    expect(outcome.action).toBe("retry");
  });
});

describe("turn accounting", () => {
  const userTurn = (clientId: string, state: "PENDING" | "COMPLETE" | "FAILED"): WhatifMessage => ({
    id: `a0000000-0000-4000-8000-${clientId.slice(-12)}`,
    client_message_id: clientId,
    speaker: "USER",
    content: "hypothesis",
    created_at: "2026-10-24T12:00:00Z",
    delivery_state: state,
  });

  it("counts FAILED and PENDING turns toward the thread limit", () => {
    const messages = [
      userTurn("c0000000-0000-4000-8000-000000000001", "COMPLETE"),
      userTurn("c0000000-0000-4000-8000-000000000002", "FAILED"),
      userTurn("c0000000-0000-4000-8000-000000000003", "PENDING"),
    ];
    expect(admittedTurnCount(messages)).toBe(3);
  });

  it("counts a replayed turn once, not twice", () => {
    const duplicate = userTurn("c0000000-0000-4000-8000-000000000001", "COMPLETE");
    expect(admittedTurnCount([duplicate, { ...duplicate }])).toBe(1);
  });

  it("formats the counter the way the spec words it", () => {
    const messages = [userTurn("c0000000-0000-4000-8000-000000000001", "COMPLETE")];
    expect(turnAllowance(messages).label).toBe(`1 of ${THREAD_TURN_LIMIT} questions used`);
  });

  it("is exhausted only at the limit", () => {
    const at39 = Array.from({ length: 39 }, (_, i) =>
      userTurn(`c0000000-0000-4000-8000-${String(i).padStart(12, "0")}`, "COMPLETE"),
    );
    expect(turnAllowance(at39).exhausted).toBe(false);
    const at40 = [
      ...at39,
      userTurn("c0000000-0000-4000-8000-000000000099", "PENDING"),
    ];
    expect(turnAllowance(at40).used).toBe(40);
    expect(turnAllowance(at40).exhausted).toBe(true);
  });

  it("detects a pending turn, so a second key is not sent", () => {
    expect(hasPendingTurn([userTurn("c0000000-0000-4000-8000-000000000001", "PENDING")])).toBe(true);
    expect(hasPendingTurn([userTurn("c0000000-0000-4000-8000-000000000001", "COMPLETE")])).toBe(false);
  });

  it("excludes incomplete user turns from model context", () => {
    const messages = [
      userTurn("c0000000-0000-4000-8000-000000000001", "COMPLETE"),
      userTurn("c0000000-0000-4000-8000-000000000002", "FAILED"),
    ];
    expect(completedPairs(messages)).toHaveLength(1);
  });
});

describe("evidence joining", () => {
  const aiMessage = (refs: string[], cited: string[]): AIWhatifMessage =>
    ({
      id: "a0000000-0000-4000-8000-000000000001",
      speaker: "AI",
      created_at: "2026-10-24T12:00:00Z",
      delivery_state: "COMPLETE",
      source_data_version: "1.0-be00",
      validation_status: "VERIFIED_REFERENCES",
      model_label: "DEMO_AI",
      evidence: refs.map((ref) => ({
        kind: "FINAL_SCORE" as const,
        ref,
        label: "Final score",
        source_data_version: "1.0-be00",
        verified_at: null,
        match_id: "30000000-0000-4000-8000-000000000003",
        match_status: "FINISHED" as const,
        score: { home: 2, away: 1 },
      })),
      analysis: {
        classification: "COUNTERFACTUAL_EVENT",
        verdict: "UNCERTAIN",
        headline: "h",
        response: "r",
        supports: [{ text: "claim", evidence_refs: cited }],
        challenges: [],
        assumptions: [],
        unknowns: [],
        follow_up_questions: [],
        confidence: "LOW",
        disclaimer: "d",
      },
    }) as AIWhatifMessage;

  it("resolves a ref that exists in the same message", () => {
    const resolved = resolveRefs(aiMessage(["e1"], ["e1"]), ["e1"]);
    expect(resolved[0]!.resolved).toBe(true);
  });

  it("marks a ref with nothing to join to as unresolved", () => {
    const resolved = resolveRefs(aiMessage(["e1"], ["e2"]), ["e2"]);
    expect(resolved[0]!.resolved).toBe(false);
  });

  it("flags a message that cites evidence it did not supply", () => {
    expect(hasUnsafeRefs(aiMessage(["e1"], ["e1"]))).toBe(false);
    expect(hasUnsafeRefs(aiMessage(["e1"], ["e1", "e9"]))).toBe(true);
  });

  it("does not join across messages", () => {
    // Evidence belonging to another answer must not resolve here.
    const other = aiMessage(["other-ref"], []);
    const resolved = resolveRefs(other, ["e1"]);
    expect(resolved[0]!.resolved).toBe(false);
  });
});

describe("composer bounds", () => {
  it("requires something to say", () => {
    expect(validateMessage("")).not.toBeNull();
    expect(validateMessage("   ")).not.toBeNull();
  });

  it("enforces the 10-character minimum", () => {
    expect(validateMessage("too short")).not.toBeNull();
    expect(validateMessage("just enough!")).toBeNull();
  });

  it("enforces the 2000-character maximum", () => {
    expect(validateMessage("a".repeat(2000))).toBeNull();
    expect(validateMessage("a".repeat(2001))).not.toBeNull();
  });

  it("measures the trimmed text", () => {
    expect(validateMessage(`   ${"a".repeat(12)}   `)).toBeNull();
  });
});
