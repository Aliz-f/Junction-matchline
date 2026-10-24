/**
 * What-if turn accounting and evidence joining (FE-09).
 *
 * Two counters that are easy to conflate and must not be:
 *
 * - **The lifetime thread limit (40 USER turns).** Counts every *admitted*
 *   USER turn once, including FAILED and PENDING ones. An exact-key replay
 *   creates no new turn, so it never increments.
 * - **The daily completed-response quota** (FREE 3, PREMIUM 30). Only completed
 *   responses are charged; a failure is not. This number comes from the
 *   backend's `remaining_daily_messages` and is never computed here.
 *
 * Evidence joining is the other rule worth isolating: a cited ref may only
 * resolve against evidence in **its own** AI message. A ref that does not
 * resolve is surfaced as unsafe rather than quietly dropped or invented.
 */
import type { AIWhatifMessage, WhatifEvidenceItem, WhatifMessage } from "@/lib/api/types";

/** The spec's lifetime cap on admitted USER turns per thread. */
export const THREAD_TURN_LIMIT = 40;

export function isUserTurn(message: WhatifMessage): message is Extract<WhatifMessage, { speaker: "USER" }> {
  return message.speaker === "USER";
}

export function isAiTurn(message: WhatifMessage): message is AIWhatifMessage {
  return message.speaker === "AI";
}

/**
 * Admitted USER turns, counted once each.
 *
 * Deduplicated by `client_message_id`, because a replay of the same key is the
 * same turn: counting it twice would wrongly consume the thread limit.
 */
export function admittedTurnCount(messages: readonly WhatifMessage[]): number {
  const seen = new Set<string>();
  for (const message of messages) {
    if (isUserTurn(message)) seen.add(message.client_message_id);
  }
  return seen.size;
}

export type TurnAllowance = {
  readonly used: number;
  readonly limit: number;
  /** True once the lifetime limit is reached; a new thread is then required. */
  readonly exhausted: boolean;
  /** Human text for the counter, e.g. "12 of 40 questions used". */
  readonly label: string;
};

export function turnAllowance(messages: readonly WhatifMessage[]): TurnAllowance {
  const used = admittedTurnCount(messages);
  return {
    used,
    limit: THREAD_TURN_LIMIT,
    exhausted: used >= THREAD_TURN_LIMIT,
    label: `${used} of ${THREAD_TURN_LIMIT} questions used`,
  };
}

/** True when a turn is still running, so a different key would be rejected. */
export function hasPendingTurn(messages: readonly WhatifMessage[]): boolean {
  return messages.some((message) => isUserTurn(message) && message.delivery_state === "PENDING");
}

/**
 * Context for the model is completed USER/AI pairs only.
 *
 * A FAILED or PENDING turn is not part of the conversation yet, so including it
 * would misrepresent what was actually discussed.
 */
export function completedPairs(messages: readonly WhatifMessage[]): WhatifMessage[] {
  return messages.filter((message) =>
    isUserTurn(message) ? message.delivery_state === "COMPLETE" : true,
  );
}

export type ResolvedRef =
  | { readonly ref: string; readonly resolved: true; readonly item: WhatifEvidenceItem }
  /** Cited but absent from this message's evidence: shown as unsafe. */
  | { readonly ref: string; readonly resolved: false };

/**
 * Joins a claim's refs against **its own** AI message's evidence.
 *
 * Scoped to one message on purpose: joining across messages would let an older
 * turn's evidence appear to support a newer claim it was never attached to.
 */
export function resolveRefs(message: AIWhatifMessage, refs: readonly string[]): ResolvedRef[] {
  const index = new Map(message.evidence.map((item) => [item.ref, item]));
  return refs.map((ref) => {
    const item = index.get(ref);
    return item ? { ref, resolved: true as const, item } : { ref, resolved: false as const };
  });
}

/** True when any cited ref in this message fails to resolve. */
export function hasUnsafeRefs(message: AIWhatifMessage): boolean {
  const claims = [...message.analysis.supports, ...message.analysis.challenges];
  return claims.some((claim) =>
    resolveRefs(message, claim.evidence_refs).some((entry) => !entry.resolved),
  );
}

/** Composer bounds from the spec. */
export const MESSAGE_MIN_LENGTH = 10;
export const MESSAGE_MAX_LENGTH = 2000;

export function validateMessage(text: string): string | null {
  const trimmed = text.trim();
  if (trimmed.length === 0) return "Write a hypothesis to put to the AI.";
  if (trimmed.length < MESSAGE_MIN_LENGTH) {
    return `Add a little more detail — at least ${MESSAGE_MIN_LENGTH} characters.`;
  }
  if (trimmed.length > MESSAGE_MAX_LENGTH) {
    return `That is too long. Keep it under ${MESSAGE_MAX_LENGTH} characters.`;
  }
  return null;
}
