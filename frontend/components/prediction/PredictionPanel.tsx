/**
 * Prediction entry (FE-08), shown in the match page's Predict tab.
 *
 * Rules enforced here:
 *  - Scores are both empty or both whole numbers consistent with the chosen
 *    outcome; the form explains the mismatch rather than silently refusing.
 *  - A retry reuses the same `Idempotency-Key` **and** body; an edit mints a
 *    fresh key. So a replay never creates a second prediction.
 *  - After **any** 200/201 or uncertain network result, the authoritative
 *    current prediction is re-read and rendered. A replayed response is never
 *    trusted as the current state. If that re-read fails, the displayed
 *    prediction is explicitly labelled unverified.
 *  - The cutoff shown comes from `locked_at` and the server clock; it never
 *    ticks against frozen demo time, and a server 409 always wins.
 */
"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useCurrentPrediction, useMeta, useSession, useSubmitPrediction } from "@/lib/api/hooks";
import { ApiError } from "@/lib/api/client";
import { attemptFor, type PredictionAttempt } from "@/lib/predictions/idempotency";
import { toPredictionRequest, validatePrediction, type PredictionDraft } from "@/lib/predictions/validate";
import { EmptyState, ErrorState, SkeletonList } from "@/components/ui/States";
import { formatKickoff, machineDateTime } from "@/lib/time";
import type { MatchDetail, Outcome, PredictionView } from "@/lib/api/types";

const OUTCOMES: readonly Outcome[] = ["HOME", "DRAW", "AWAY"];

function outcomeLabel(match: MatchDetail, outcome: Outcome): string {
  if (outcome === "HOME") return `${match.home_team.short_name} win`;
  if (outcome === "AWAY") return `${match.away_team.short_name} win`;
  return "Draw";
}

/** Settled result. Points and breakdown are the server's, never recomputed. */
function SettledPrediction({ prediction }: { readonly prediction: PredictionView }) {
  if (prediction.status === "VOID") {
    return (
      <p role="status" className="rounded-md border border-line bg-surface-sunken px-3 py-2 text-sm text-ink-muted">
        <span className="font-semibold text-ink">This prediction was voided.</span> No points were
        awarded, and this is not a scoring failure on your part.
      </p>
    );
  }

  if (prediction.status === "PENDING") {
    return (
      <p className="text-sm text-ink-muted">
        Your prediction is recorded and will be scored once the result is confirmed.
      </p>
    );
  }

  return (
    <div className="rounded-md border border-line bg-surface-sunken px-3 py-2 text-sm">
      <p className="font-semibold text-ink">
        Scored: {prediction.points ?? 0} {prediction.points === 1 ? "point" : "points"}
      </p>
      {prediction.breakdown ? (
        <ul className="mt-1 space-y-0.5 text-xs text-ink-muted">
          <li>Result: {prediction.breakdown.outcome_points} points</li>
          <li>Exact score: {prediction.breakdown.exact_score_points} points</li>
        </ul>
      ) : (
        <p className="mt-1 text-xs text-ink-muted">The server did not supply a points breakdown.</p>
      )}
    </div>
  );
}

export function PredictionPanel({ match }: { readonly match: MatchDetail }) {
  const { user, isLoading: sessionLoading } = useSession();
  const meta = useMeta();
  const current = useCurrentPrediction(match.id);
  const submit = useSubmitPrediction(match.id);

  const [draft, setDraft] = useState<PredictionDraft>({ outcome: null, homeScore: "", awayScore: "" });
  const [showErrors, setShowErrors] = useState(false);
  const attemptRef = useRef<PredictionAttempt | null>(null);
  const [unverified, setUnverified] = useState(false);

  const existing = current.data?.prediction ?? null;

  // Seed the form from the server's record once it arrives.
  useEffect(() => {
    if (!existing) return;
    setDraft({
      outcome: existing.outcome,
      homeScore: existing.home_score === null ? "" : String(existing.home_score),
      awayScore: existing.away_score === null ? "" : String(existing.away_score),
    });
  }, [existing]);

  if (sessionLoading || meta.isLoading) return <SkeletonList rows={2} />;

  if (user === null) {
    return (
      <EmptyState
        title="Sign in to predict"
        description="Predictions are tied to your account so they can be scored after the match."
        action={
          <Link
            href="/login"
            className="rounded-md bg-ink px-3 py-1.5 text-sm font-semibold text-surface-raised"
          >
            Sign in
          </Link>
        }
      />
    );
  }

  if (current.isLoading) return <SkeletonList rows={2} />;

  if (current.isError && !(current.error instanceof ApiError && current.error.status === 404)) {
    return (
      <ErrorState
        title="Could not load your prediction"
        description="Your existing prediction could not be read, so the form is not shown rather than risking overwriting it."
        envelope={current.error instanceof ApiError ? current.error.envelope : null}
        onRetry={() => void current.refetch()}
      />
    );
  }

  const errors = validatePrediction(draft);
  // Backend authority: predictions_open is the gate, not our own clock maths.
  const open = match.features.predictions_open;
  const lockedAt = existing?.locked_at ?? null;

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setShowErrors(true);
    const body = toPredictionRequest(draft);
    if (!body) return;

    // Same body -> same key (retry). Different body -> fresh key (edit).
    const attempt = attemptFor(attemptRef.current, body);
    attemptRef.current = attempt;

    try {
      await submit.mutateAsync({ body, idempotencyKey: attempt.key });
      setUnverified(false);
    } catch {
      // Swallowed: the authoritative re-read below decides what is true.
    }

    // Re-read regardless of outcome, including after a network failure.
    const refreshed = await current.refetch();
    setUnverified(refreshed.isError);
  }

  return (
    <div className="space-y-4">
      {existing ? (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-ink">Your prediction</h3>
          <p className="text-sm text-ink-muted">
            {outcomeLabel(match, existing.outcome)}
            {existing.home_score !== null && existing.away_score !== null
              ? ` · ${existing.home_score}–${existing.away_score}`
              : " · no exact score"}
          </p>
          {unverified ? (
            <p role="status" className="rounded-md border border-amber-500/50 bg-amber-500/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-200">
              This is the last state we could confirm. The server could not be re-read, so it may be
              out of date.
            </p>
          ) : null}
          <SettledPrediction prediction={existing} />
        </div>
      ) : null}

      {!open ? (
        <p role="status" className="rounded-md border border-line bg-surface-sunken px-3 py-2 text-sm text-ink-muted">
          <span className="font-semibold text-ink">Predictions are closed for this match.</span>{" "}
          {lockedAt ? (
            <>
              They locked at{" "}
              <time dateTime={machineDateTime(lockedAt)}>{formatKickoff(lockedAt) ?? lockedAt}</time>.
            </>
          ) : (
            "The server closes them at kick-off."
          )}
        </p>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4">
          <fieldset>
            <legend className="text-sm font-semibold text-ink">
              {existing ? "Change your prediction" : "Your prediction"}
            </legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {OUTCOMES.map((outcome) => (
                <label
                  key={outcome}
                  className={[
                    "cursor-pointer rounded-md border px-3 py-1.5 text-sm font-semibold",
                    draft.outcome === outcome
                      ? "border-ink bg-surface-sunken text-ink"
                      : "border-line text-ink-muted hover:text-ink",
                  ].join(" ")}
                >
                  <input
                    type="radio"
                    name="outcome"
                    value={outcome}
                    checked={draft.outcome === outcome}
                    onChange={() => setDraft({ ...draft, outcome })}
                    className="sr-only"
                  />
                  {outcomeLabel(match, outcome)}
                </label>
              ))}
            </div>
            {showErrors && errors.outcome ? (
              <p className="mt-1 text-xs font-semibold text-red-600 dark:text-red-400">{errors.outcome}</p>
            ) : null}
          </fieldset>

          <fieldset>
            <legend className="text-sm font-semibold text-ink">Exact score (optional)</legend>
            <p className="mt-0.5 text-xs text-ink-muted">
              Leave both empty, or fill both in. An exact score earns extra points.
            </p>
            <div className="mt-2 flex items-end gap-3">
              <div>
                <label htmlFor="home-score" className="block text-xs text-ink-muted">
                  {match.home_team.short_name}
                </label>
                <input
                  id="home-score"
                  inputMode="numeric"
                  value={draft.homeScore}
                  onChange={(event) => setDraft({ ...draft, homeScore: event.target.value })}
                  className="mt-1 w-16 rounded-md border border-line bg-surface-raised px-2 py-1.5 text-sm text-ink"
                />
              </div>
              <span className="pb-2 text-ink-muted">–</span>
              <div>
                <label htmlFor="away-score" className="block text-xs text-ink-muted">
                  {match.away_team.short_name}
                </label>
                <input
                  id="away-score"
                  inputMode="numeric"
                  value={draft.awayScore}
                  onChange={(event) => setDraft({ ...draft, awayScore: event.target.value })}
                  className="mt-1 w-16 rounded-md border border-line bg-surface-raised px-2 py-1.5 text-sm text-ink"
                />
              </div>
            </div>
            {showErrors && (errors.homeScore || errors.awayScore) ? (
              <p className="mt-1 text-xs font-semibold text-red-600 dark:text-red-400">
                {errors.homeScore ?? errors.awayScore}
              </p>
            ) : null}
          </fieldset>

          {showErrors && errors.form ? (
            <p role="alert" className="rounded-md border border-red-500/50 bg-red-500/5 px-3 py-2 text-sm text-ink">
              {errors.form}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={submit.isPending}
            className="rounded-md bg-ink px-3 py-1.5 text-sm font-semibold text-surface-raised disabled:opacity-60"
          >
            {submit.isPending ? "Saving…" : existing ? "Update prediction" : "Submit prediction"}
          </button>

          {submit.isError && submit.error instanceof ApiError ? (
            <ErrorState
              title={
                submit.error.code === "PREDICTION_CLOSED"
                  ? "Predictions closed before this was saved"
                  : submit.error.code === "IDEMPOTENCY_CONFLICT"
                    ? "That submission conflicted"
                    : "Your prediction was not saved"
              }
              description={
                submit.error.code === "PREDICTION_CLOSED"
                  ? "The server closed predictions at kick-off. Whatever it already holds is shown above."
                  : "The state shown above is whatever the server holds."
              }
              envelope={submit.error.envelope}
            />
          ) : null}
        </form>
      )}
    </div>
  );
}
