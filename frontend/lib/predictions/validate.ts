/**
 * Prediction form validation (FE-08).
 *
 * The A3 invariant is: scores are **both** null, or **both** non-negative
 * integers whose direction implies the chosen `outcome`. `PredictionRequest` in
 * `contract.ts` already enforces it; this adds field-level messages so the form
 * can explain the problem instead of just refusing.
 *
 * This is a convenience, never an authority. The server validates
 * independently and its 422 always wins — a client that disagrees must defer.
 */
import type { Outcome } from "@/lib/api/types";

export type PredictionDraft = {
  readonly outcome: Outcome | null;
  /** Raw input strings, so "1.5", "-1" and "" are all representable. */
  readonly homeScore: string;
  readonly awayScore: string;
};

export type PredictionErrors = {
  readonly outcome?: string;
  readonly homeScore?: string;
  readonly awayScore?: string;
  /** Problem with the combination rather than one field. */
  readonly form?: string;
};

/** The outcome a score line implies, or null when the line is incomplete. */
export function impliedOutcome(home: number | null, away: number | null): Outcome | null {
  if (home === null || away === null) return null;
  if (home > away) return "HOME";
  if (home < away) return "AWAY";
  return "DRAW";
}

/** Parses one score box. Returns `undefined` for "not a usable number". */
function parseScore(raw: string): number | null | undefined {
  const trimmed = raw.trim();
  if (trimmed === "") return null;
  // Reject decimals and signs explicitly rather than letting Number() coerce.
  if (!/^\d+$/.test(trimmed)) return undefined;
  const value = Number(trimmed);
  return Number.isSafeInteger(value) ? value : undefined;
}

const OUTCOME_WORDS: Record<Outcome, string> = {
  HOME: "a home win",
  DRAW: "a draw",
  AWAY: "an away win",
};

export function validatePrediction(draft: PredictionDraft): PredictionErrors {
  const errors: Record<string, string> = {};

  if (draft.outcome === null) {
    errors.outcome = "Choose a result first.";
  }

  const home = parseScore(draft.homeScore);
  const away = parseScore(draft.awayScore);

  if (home === undefined) errors.homeScore = "Use a whole number of goals, such as 2.";
  if (away === undefined) errors.awayScore = "Use a whole number of goals, such as 1.";
  if (home !== undefined && away !== undefined) {
    // Exactly one filled in is the most common mistake, so name it clearly.
    if (home === null && away !== null) {
      errors.homeScore = "Enter both scores, or leave both empty.";
    } else if (away === null && home !== null) {
      errors.awayScore = "Enter both scores, or leave both empty.";
    } else if (home !== null && away !== null && draft.outcome !== null) {
      const implied = impliedOutcome(home, away);
      if (implied !== null && implied !== draft.outcome) {
        errors.form = `${home}–${away} is ${OUTCOME_WORDS[implied]}, but you picked ${OUTCOME_WORDS[draft.outcome]}. Change one of them.`;
      }
    }
  }

  return errors;
}

export function hasErrors(errors: PredictionErrors): boolean {
  return Object.keys(errors).length > 0;
}

/**
 * The request body for a valid draft, or null when it is not valid.
 *
 * Returning null rather than throwing keeps the caller's happy path simple.
 */
export function toPredictionRequest(
  draft: PredictionDraft,
): { outcome: Outcome; home_score: number | null; away_score: number | null } | null {
  if (hasErrors(validatePrediction(draft)) || draft.outcome === null) return null;
  const home = parseScore(draft.homeScore);
  const away = parseScore(draft.awayScore);
  if (home === undefined || away === undefined) return null;
  return { outcome: draft.outcome, home_score: home, away_score: away };
}
