/**
 * What-if send attempts (FE-09).
 *
 * Unlike a prediction, re-sending a What-if turn costs a model call and a quota
 * slot, so an in-flight attempt is persisted and reconciled after a reload.
 *
 * The rules, which exist to stop double charging:
 *
 * - On send, store `{client_message_id, idempotency_key, content}` keyed by
 *   user **and** thread, and keep it until the turn is COMPLETE.
 * - After a reload, re-authenticate, GET the thread, and match the saved
 *   `client_message_id` against the server's USER turns. A retry must reuse the
 *   **original key and byte-identical content** — a changed body with the same
 *   key is a genuine 409 `IDEMPOTENCY_CONFLICT`.
 * - **Never mint a replacement key for a saved USER turn.** If the envelope is
 *   gone or storage is unavailable, the turn is simply not resumable and the UI
 *   says so, rather than risking a second charge.
 * - Cleared at COMPLETE, at logout, and on an account switch.
 *
 * `sessionStorage` is per tab deliberately: an attempt belongs to the tab that
 * started it, and must not leak into another tab or survive the session.
 */

export type WhatifAttempt = {
  readonly threadId: string;
  readonly userId: string;
  readonly clientMessageId: string;
  readonly idempotencyKey: string;
  /** The exact text sent. Retries must be byte-identical. */
  readonly content: string;
  readonly createdAt: string;
};

const PREFIX = "matchline:whatif-attempt:v1";

/** Scoped by user so an account switch can never adopt another's attempt. */
function storageKey(userId: string, threadId: string): string {
  return `${PREFIX}:${userId}:${threadId}`;
}

/** True when an attempt can be persisted at all. */
export function storageAvailable(): boolean {
  try {
    const probe = `${PREFIX}:probe`;
    window.sessionStorage.setItem(probe, "1");
    window.sessionStorage.removeItem(probe);
    return true;
  } catch {
    return false;
  }
}

export function saveAttempt(attempt: WhatifAttempt): boolean {
  try {
    window.sessionStorage.setItem(
      storageKey(attempt.userId, attempt.threadId),
      JSON.stringify(attempt),
    );
    return true;
  } catch {
    return false;
  }
}

/**
 * Reads a saved attempt.
 *
 * Returns null for anything that is not a complete, well-formed envelope for
 * exactly this user and thread — a partial record must not be used to build a
 * retry, because a missing key would tempt the caller into minting a new one.
 */
export function loadAttempt(userId: string, threadId: string): WhatifAttempt | null {
  try {
    const raw = window.sessionStorage.getItem(storageKey(userId, threadId));
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return null;

    const candidate = parsed as Partial<WhatifAttempt>;
    if (
      typeof candidate.threadId !== "string" ||
      typeof candidate.userId !== "string" ||
      typeof candidate.clientMessageId !== "string" ||
      typeof candidate.idempotencyKey !== "string" ||
      typeof candidate.content !== "string" ||
      typeof candidate.createdAt !== "string"
    ) {
      return null;
    }
    // Cross-check: a record stored under another identity is not ours.
    if (candidate.userId !== userId || candidate.threadId !== threadId) return null;

    return candidate as WhatifAttempt;
  } catch {
    return null;
  }
}

export function clearAttempt(userId: string, threadId: string): void {
  try {
    window.sessionStorage.removeItem(storageKey(userId, threadId));
  } catch {
    // Nothing to do.
  }
}

/** Clears every stored attempt. Used at logout and on an account switch. */
export function clearAllAttempts(): void {
  try {
    const doomed: string[] = [];
    for (let i = 0; i < window.sessionStorage.length; i += 1) {
      const key = window.sessionStorage.key(i);
      if (key !== null && key.startsWith(PREFIX)) doomed.push(key);
    }
    for (const key of doomed) window.sessionStorage.removeItem(key);
  } catch {
    // Nothing to do.
  }
}

/** What to do with a saved attempt once the thread has been re-read. */
export type ReconcileOutcome =
  | { readonly action: "none" }
  /** The server completed it; drop the envelope. */
  | { readonly action: "complete" }
  /** Still running; wait and poll rather than resending. */
  | { readonly action: "pending" }
  /** Failed and retryable with the ORIGINAL key and content. */
  | { readonly action: "retry"; readonly attempt: WhatifAttempt }
  /** Failed but a later turn was accepted, so it can never be retried. */
  | { readonly action: "superseded" }
  /** The server never saw it; the original envelope may be resent. */
  | { readonly action: "resend"; readonly attempt: WhatifAttempt };

type ServerUserTurn = {
  readonly client_message_id: string;
  readonly delivery_state: "PENDING" | "COMPLETE" | "FAILED";
  readonly created_at: string;
};

/**
 * Decides what a saved attempt means against the server's own USER turns.
 *
 * `superseded` is the subtle one: a FAILED turn followed by **any** later
 * accepted USER turn can never be retried, because the thread has moved on.
 * The spec requires a 409 `WHATIF_TURN_SUPERSEDED` there and no replacement
 * key, so the UI must not offer a retry at all.
 */
export function reconcileAttempt(
  attempt: WhatifAttempt | null,
  serverTurns: readonly ServerUserTurn[],
): ReconcileOutcome {
  if (attempt === null) return { action: "none" };

  const mine = serverTurns.find((turn) => turn.client_message_id === attempt.clientMessageId);

  // The server never recorded it, so the original envelope is still valid.
  if (!mine) return { action: "resend", attempt };

  if (mine.delivery_state === "COMPLETE") return { action: "complete" };
  if (mine.delivery_state === "PENDING") return { action: "pending" };

  // FAILED: retryable only if nothing later was admitted.
  const failedAt = Date.parse(mine.created_at);
  const hasLater = serverTurns.some(
    (turn) =>
      turn.client_message_id !== attempt.clientMessageId &&
      Date.parse(turn.created_at) > failedAt &&
      turn.delivery_state !== "FAILED",
  );

  return hasLater ? { action: "superseded" } : { action: "retry", attempt };
}
