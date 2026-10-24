/**
 * FE-08 prediction validation and idempotency.
 *
 * CT-18 is about rejecting malformed score lines, and the idempotency rules are
 * about never creating a second prediction on a retry. Both are pure logic, so
 * they are tested directly rather than through the form.
 */
import { describe, expect, it, vi } from "vitest";
import { PredictionRequest } from "@/lib/api/contract";
import {
  hasErrors,
  impliedOutcome,
  toPredictionRequest,
  validatePrediction,
} from "@/lib/predictions/validate";
import { attemptFor, sameBody } from "@/lib/predictions/idempotency";

const draft = (outcome: "HOME" | "DRAW" | "AWAY" | null, home = "", away = "") => ({
  outcome,
  homeScore: home,
  awayScore: away,
});

describe("impliedOutcome", () => {
  it("reads the outcome off a score line", () => {
    expect(impliedOutcome(2, 1)).toBe("HOME");
    expect(impliedOutcome(1, 2)).toBe("AWAY");
    expect(impliedOutcome(1, 1)).toBe("DRAW");
    expect(impliedOutcome(0, 0)).toBe("DRAW");
  });

  it("is undecided when the line is incomplete", () => {
    expect(impliedOutcome(null, 1)).toBeNull();
    expect(impliedOutcome(1, null)).toBeNull();
    expect(impliedOutcome(null, null)).toBeNull();
  });
});

describe("validatePrediction", () => {
  it("accepts an outcome with no exact score", () => {
    expect(hasErrors(validatePrediction(draft("HOME")))).toBe(false);
  });

  it("accepts a consistent exact score", () => {
    expect(hasErrors(validatePrediction(draft("HOME", "2", "1")))).toBe(false);
    expect(hasErrors(validatePrediction(draft("DRAW", "0", "0")))).toBe(false);
    expect(hasErrors(validatePrediction(draft("AWAY", "1", "3")))).toBe(false);
  });

  it("requires an outcome", () => {
    expect(validatePrediction(draft(null)).outcome).toBeDefined();
  });

  it("rejects exactly one score being filled in", () => {
    expect(validatePrediction(draft("HOME", "2", "")).awayScore).toBeDefined();
    expect(validatePrediction(draft("HOME", "", "1")).homeScore).toBeDefined();
  });

  it("rejects a score that contradicts the chosen outcome", () => {
    const errors = validatePrediction(draft("HOME", "1", "2"));
    expect(errors.form).toBeDefined();
    expect(errors.form).toMatch(/away win/i);
  });

  it("rejects a draw score under a win outcome", () => {
    expect(validatePrediction(draft("HOME", "1", "1")).form).toBeDefined();
  });

  it("rejects negatives, decimals and junk", () => {
    expect(validatePrediction(draft("HOME", "-1", "0")).homeScore).toBeDefined();
    expect(validatePrediction(draft("HOME", "1.5", "0")).homeScore).toBeDefined();
    expect(validatePrediction(draft("HOME", "two", "0")).homeScore).toBeDefined();
    expect(validatePrediction(draft("HOME", "1", "1e3")).awayScore).toBeDefined();
  });

  it("tolerates surrounding whitespace", () => {
    expect(hasErrors(validatePrediction(draft("HOME", " 2 ", " 1 ")))).toBe(false);
  });
});

describe("toPredictionRequest", () => {
  it("produces a body the contract schema accepts", () => {
    const body = toPredictionRequest(draft("HOME", "2", "1"));
    expect(body).toEqual({ outcome: "HOME", home_score: 2, away_score: 1 });
    expect(() => PredictionRequest.parse(body)).not.toThrow();
  });

  it("sends both scores as null when neither is given", () => {
    const body = toPredictionRequest(draft("DRAW"));
    expect(body).toEqual({ outcome: "DRAW", home_score: null, away_score: null });
    expect(() => PredictionRequest.parse(body)).not.toThrow();
  });

  it("returns null for anything invalid, so nothing malformed is sent", () => {
    expect(toPredictionRequest(draft("HOME", "1", "2"))).toBeNull();
    expect(toPredictionRequest(draft(null, "1", "0"))).toBeNull();
    expect(toPredictionRequest(draft("HOME", "2", ""))).toBeNull();
    expect(toPredictionRequest(draft("HOME", "-1", "-2"))).toBeNull();
  });

  it("agrees with the contract schema on every case it accepts", () => {
    const cases = [
      draft("HOME", "3", "0"),
      draft("AWAY", "0", "1"),
      draft("DRAW", "2", "2"),
      draft("HOME"),
    ];
    for (const candidate of cases) {
      const body = toPredictionRequest(candidate);
      expect(body, JSON.stringify(candidate)).not.toBeNull();
      expect(() => PredictionRequest.parse(body)).not.toThrow();
    }
  });
});

describe("idempotency keys", () => {
  const home21 = { outcome: "HOME" as const, home_score: 2, away_score: 1 };
  const away12 = { outcome: "AWAY" as const, home_score: 1, away_score: 2 };

  it("compares bodies by value, not identity", () => {
    expect(sameBody(home21, { ...home21 })).toBe(true);
    expect(sameBody(home21, away12)).toBe(false);
    expect(sameBody(home21, { ...home21, home_score: 3 })).toBe(false);
  });

  it("treats a null score as distinct from a zero", () => {
    expect(
      sameBody(
        { outcome: "DRAW", home_score: null, away_score: null },
        { outcome: "DRAW", home_score: 0, away_score: 0 },
      ),
    ).toBe(false);
  });

  it("mints a UUID key for a first submission", () => {
    const attempt = attemptFor(null, home21);
    expect(attempt.key).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  });

  it("reuses the key when retrying the identical body", () => {
    const first = attemptFor(null, home21);
    const retry = attemptFor(first, { ...home21 });
    expect(retry.key).toBe(first.key);
    expect(retry).toBe(first);
  });

  it("mints a fresh key when the body changes", () => {
    const first = attemptFor(null, home21);
    const edited = attemptFor(first, away12);
    expect(edited.key).not.toBe(first.key);
  });

  it("survives the HOME -> AWAY -> replay HOME sequence with distinct keys", () => {
    // The scenario the task file names: an old replay must not look like the
    // current state, so it must carry its own key.
    const a = attemptFor(null, home21);
    const b = attemptFor(a, away12);
    const replayOfA = attemptFor(b, home21);
    expect(b.key).not.toBe(a.key);
    expect(replayOfA.key).not.toBe(b.key);
    expect(replayOfA.key).not.toBe(a.key);
  });

  it("generates a different key each time", () => {
    const keys = new Set(Array.from({ length: 50 }, () => attemptFor(null, home21).key));
    expect(keys.size).toBe(50);
  });

  it("falls back to getRandomValues when randomUUID is unavailable", () => {
    const original = crypto.randomUUID;
    // Some browsers only expose randomUUID in a secure context.
    // @ts-expect-error -- deliberately removing it for the test
    crypto.randomUUID = undefined;
    try {
      const attempt = attemptFor(null, home21);
      expect(attempt.key).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      );
    } finally {
      crypto.randomUUID = original;
    }
  });
});

describe("the server stays authoritative", () => {
  it("rejects a body the client would also reject, so they agree", () => {
    // Belt and braces: the contract schema is the real gate.
    expect(() => PredictionRequest.parse({ outcome: "HOME", home_score: 1, away_score: 2 })).toThrow();
    expect(() => PredictionRequest.parse({ outcome: "HOME", home_score: 2, away_score: null })).toThrow();
    expect(() => PredictionRequest.parse({ outcome: "HOME", home_score: -1, away_score: 0 })).toThrow();
  });

  it("does not let the client invent extra fields", () => {
    expect(() =>
      PredictionRequest.parse({ outcome: "HOME", home_score: null, away_score: null, points: 99 }),
    ).toThrow();
  });
});

describe("no local clock is consulted", () => {
  it("validation does not depend on the current time", () => {
    const spy = vi.spyOn(Date, "now");
    validatePrediction(draft("HOME", "2", "1"));
    toPredictionRequest(draft("HOME", "2", "1"));
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });
});
