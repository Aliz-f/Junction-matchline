/**
 * Prediction idempotency keys (FE-08).
 *
 * Every `POST /matches/{id}/predictions` carries a mandatory UUID
 * `Idempotency-Key`. The rules, which this module exists to make unambiguous:
 *
 * - **Retrying the same submission reuses the same key and the same body.** The
 *   server replays its stored result; no second prediction is created.
 * - **A changed submission gets a fresh key.** Reusing the old key with a
 *   different body is a genuine client error and returns 409
 *   `IDEMPOTENCY_CONFLICT`.
 * - The key is tied to the exact body, so "same key, same body" is decided by
 *   comparing the body rather than by trusting a flag.
 *
 * The attempt is held in memory for the component's lifetime, not persisted:
 * a prediction is cheap to re-enter, and a stale key surviving a reload could
 * collide with a server-side record the user can no longer see. (FE-09's
 * What-if turns are different — those DO persist an attempt envelope, because
 * re-sending costs a model call and a quota slot.)
 */
import type { Outcome } from "@/lib/api/types";

export type PredictionBody = {
  readonly outcome: Outcome;
  readonly home_score: number | null;
  readonly away_score: number | null;
};

export type PredictionAttempt = {
  readonly key: string;
  readonly body: PredictionBody;
};

/** Stable comparison, independent of property order. */
export function sameBody(a: PredictionBody, b: PredictionBody): boolean {
  return a.outcome === b.outcome && a.home_score === b.home_score && a.away_score === b.away_score;
}

function newKey(): string {
  // `randomUUID` needs a secure context; fall back for older browsers.
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  // RFC 4122 version 4 bits.
  bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x40;
  bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80;
  const hex = [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/**
 * The attempt to send for `body`.
 *
 * Reuses the previous key when the body is unchanged (a retry), and mints a
 * fresh one when it differs (an edit). This is the whole rule in one place.
 */
export function attemptFor(
  previous: PredictionAttempt | null,
  body: PredictionBody,
): PredictionAttempt {
  if (previous !== null && sameBody(previous.body, body)) return previous;
  return { key: newKey(), body };
}
