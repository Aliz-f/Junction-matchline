/**
 * Profile (FE-08, gate G3).
 *
 * Shows favourite club, plan, prediction summary, prediction history and
 * badges. **No private What-if thread list at G3** — that is added by FE-09 at
 * G4, and listing it early would expose a surface the backend does not serve.
 *
 * Prediction history and badges survive a favourite-club change: nothing here
 * is keyed on the favourite.
 */
"use client";

import Link from "next/link";
import { useBadges, usePredictionHistory, useProfile, useSession, useTeams } from "@/lib/api/hooks";
import { useAllWhatifThreads } from "@/lib/whatif/useWhatif";
import { ApiError } from "@/lib/api/client";
import { EmptyState, ErrorState, SkeletonList } from "@/components/ui/States";
import { StatusIndicator } from "@/components/ui/StatusIndicator";
import { formatKickoff, machineDateTime } from "@/lib/time";
import type { PredictionStatus } from "@/lib/api/types";

const STATUS_LABELS: Record<PredictionStatus, string> = {
  PENDING: "Awaiting result",
  SCORED: "Scored",
  VOID: "Voided",
};

export function ProfileScreen() {
  const { user, isLoading } = useSession();
  const profile = useProfile();
  const badges = useBadges();
  const history = usePredictionHistory();
  const teams = useTeams("PL");
  // Added by FE-09 at G4; deliberately absent at G3.
  const threads = useAllWhatifThreads();

  if (isLoading) return <SkeletonList rows={4} />;

  if (user === null) {
    return (
      <EmptyState
        title="Sign in to see your profile"
        description="Your profile holds your favourite club, prediction history and badges. It is private to you."
        action={
          <Link href="/login" className="rounded-md bg-ink px-3 py-1.5 text-sm font-semibold text-surface-raised">
            Sign in
          </Link>
        }
      />
    );
  }

  const favoriteName =
    user.favorite_team_id === null
      ? null
      : (teams.data?.items.find((team) => team.id === user.favorite_team_id)?.short_name ?? null);

  return (
    <div className="space-y-8">
      <section aria-labelledby="account-heading">
        <h2 id="account-heading" className="text-lg font-bold text-ink">
          Account
        </h2>
        <dl className="mt-2 grid gap-x-6 gap-y-2 rounded-lg border border-line bg-surface-raised p-3 text-sm sm:grid-cols-2">
          <div className="flex gap-2">
            <dt className="text-ink-muted">Display name</dt>
            <dd className="font-semibold text-ink">{user.display_name}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="text-ink-muted">Plan</dt>
            <dd className="font-semibold text-ink">
              {user.plan}
              <span className="ml-1.5 font-normal text-ink-muted">(demo only — no billing)</span>
            </dd>
          </div>
          <div className="flex gap-2">
            <dt className="text-ink-muted">Favourite club</dt>
            <dd className="font-semibold text-ink">
              {favoriteName ?? <span className="font-normal text-ink-muted">None chosen</span>}
            </dd>
          </div>
        </dl>
        <p className="mt-1.5 text-xs text-ink-muted">
          Changing your favourite club re-prioritises what you see. It never clears the history or
          badges below.
        </p>
      </section>

      <section aria-labelledby="summary-heading">
        <h2 id="summary-heading" className="text-lg font-bold text-ink">
          Prediction summary
        </h2>
        {profile.isLoading ? <SkeletonList rows={1} /> : null}
        {profile.isError ? (
          <div className="mt-2">
            <ErrorState
              title="Could not load your summary"
              envelope={profile.error instanceof ApiError ? profile.error.envelope : null}
              onRetry={() => void profile.refetch()}
            />
          </div>
        ) : null}
        {profile.data ? (
          <dl className="mt-2 grid grid-cols-3 gap-2">
            {(
              [
                ["Scored", profile.data.prediction_summary.scored_count],
                ["Correct results", profile.data.prediction_summary.correct_outcomes],
                ["Total points", profile.data.prediction_summary.total_points],
              ] as const
            ).map(([label, value]) => (
              <div key={label} className="rounded-lg border border-line bg-surface-raised p-3 text-center">
                <dt className="text-xs text-ink-muted">{label}</dt>
                <dd className="mt-0.5 font-mono text-xl font-black tabular-nums text-ink">{value}</dd>
              </div>
            ))}
          </dl>
        ) : null}
      </section>

      <section aria-labelledby="badges-heading">
        <h2 id="badges-heading" className="text-lg font-bold text-ink">
          Badges
        </h2>
        {badges.isLoading ? <SkeletonList rows={1} /> : null}
        {badges.isError ? (
          <div className="mt-2">
            <ErrorState
              title="Could not load your badges"
              envelope={badges.error instanceof ApiError ? badges.error.envelope : null}
              onRetry={() => void badges.refetch()}
            />
          </div>
        ) : null}
        {badges.data ? (
          badges.data.items.length === 0 ? (
            <p className="mt-2 text-sm text-ink-muted">
              No badges yet. Badges are awarded by the server from your scored predictions.
            </p>
          ) : (
            <ul className="mt-2 space-y-2">
              {badges.data.items.map((badge) => (
                <li key={badge.code} className="rounded-lg border border-line bg-surface-raised p-3">
                  <p className="flex flex-wrap items-center gap-2 text-sm font-bold text-ink">
                    {badge.label}
                    {!badge.active ? (
                      <span className="rounded bg-surface-sunken px-1.5 py-0.5 text-[0.625rem] font-bold uppercase tracking-wide text-ink-muted">
                        No longer active
                      </span>
                    ) : null}
                  </p>
                  {/* The rule comes from the server, so the criteria shown are real. */}
                  <p className="mt-0.5 text-xs text-ink-muted">{badge.rule_description}</p>
                  <p className="mt-0.5 text-xs text-ink-muted">
                    Earned{" "}
                    <time dateTime={machineDateTime(badge.earned_at)}>
                      {formatKickoff(badge.earned_at) ?? badge.earned_at}
                    </time>
                  </p>
                </li>
              ))}
            </ul>
          )
        ) : null}
      </section>

      <section aria-labelledby="threads-heading">
        <h2 id="threads-heading" className="text-lg font-bold text-ink">
          Private What-if threads
        </h2>
        <p className="mt-1 max-w-prose text-sm text-ink-muted">
          Visible only to you. These conversations are never published, shared to community rooms, or
          exported.
        </p>
        {threads.isLoading ? <SkeletonList rows={1} /> : null}
        {threads.isError ? (
          <div className="mt-2">
            <ErrorState
              title="Could not load your threads"
              envelope={threads.error instanceof ApiError ? threads.error.envelope : null}
              onRetry={() => void threads.refetch()}
            />
          </div>
        ) : null}
        {threads.data ? (
          threads.data.items.length === 0 ? (
            <p className="mt-2 text-sm text-ink-muted">
              No threads yet. Open one from a finished match to ask what might have gone differently.
            </p>
          ) : (
            <ul className="mt-2 space-y-2">
              {threads.data.items.map((thread) => (
                <li key={thread.id} className="rounded-lg border border-line bg-surface-raised p-3">
                  <Link href={`/matches/${thread.match_id}?tab=whatif`} className="text-sm font-bold text-ink">
                    {thread.title}
                  </Link>
                  <p className="mt-0.5 text-xs text-ink-muted">
                    Updated{" "}
                    <time dateTime={machineDateTime(thread.updated_at)}>
                      {formatKickoff(thread.updated_at) ?? thread.updated_at}
                    </time>
                  </p>
                </li>
              ))}
            </ul>
          )
        ) : null}
      </section>

      <section aria-labelledby="history-heading">
        <h2 id="history-heading" className="text-lg font-bold text-ink">
          Prediction history
        </h2>
        {history.isLoading ? <SkeletonList rows={3} /> : null}
        {history.isError ? (
          <div className="mt-2">
            <ErrorState
              title="Could not load your history"
              envelope={history.error instanceof ApiError ? history.error.envelope : null}
              onRetry={() => void history.refetch()}
            />
          </div>
        ) : null}
        {history.data ? (
          history.data.items.length === 0 ? (
            <p className="mt-2 text-sm text-ink-muted">You have not made any predictions yet.</p>
          ) : (
            <ul className="mt-2 space-y-2">
              {history.data.items.map(({ prediction, match }) => (
                <li key={prediction.id} className="rounded-lg border border-line bg-surface-raised p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusIndicator status={match.status} variant="compact" />
                    <span className="text-xs font-semibold text-ink-muted">
                      {STATUS_LABELS[prediction.status]}
                    </span>
                  </div>
                  <Link href={`/matches/${match.id}`} className="mt-1.5 block text-sm font-bold text-ink">
                    {match.home_team.short_name}
                    <span className="mx-1 font-normal text-ink-muted">v</span>
                    {match.away_team.short_name}
                  </Link>
                  <p className="mt-0.5 text-xs text-ink-muted">
                    Predicted {prediction.outcome}
                    {prediction.home_score !== null && prediction.away_score !== null
                      ? ` ${prediction.home_score}–${prediction.away_score}`
                      : null}
                    {prediction.points !== null ? ` · ${prediction.points} points` : null}
                  </p>
                </li>
              ))}
            </ul>
          )
        ) : null}
      </section>
    </div>
  );
}
