/**
 * Impact page (FE-06).
 *
 * Sections are kept apart on purpose:
 *  - **Recommended** is deterministic: the favourite's next SCHEDULED fixture
 *    by kickoff then UUID, followed by HIGH → MEDIUM → LOW other-team fixtures
 *    with dates ascending. No ranking model, and UNKNOWN is never recommended.
 *  - **Impact unverified** holds UNKNOWN / INSUFFICIENT_DATA insights in a
 *    neutral section, which is not an endorsement of relevance.
 *  - **Current standings** is its own area, separate from historical effects,
 *    so a past calculation can never be read as the live table.
 *
 * `relevance=NONE` is excluded from the feed by the backend because it is below
 * the recommendation threshold — which is *not* the same as "no effect".
 */
"use client";

import { useMemo } from "react";
import { useJourney, useMeta, useRelevantImpact, useSession } from "@/lib/api/hooks";
import { useGuestFavorite } from "@/lib/useGuestFavorite";
import { ApiError } from "@/lib/api/client";
import { EmptyState, ErrorState, SkeletonList } from "@/components/ui/States";
import { SourceBadge } from "@/components/ui/SourceBadge";
import { ImpactCard } from "./ImpactCard";
import { StandingsPanel } from "./StandingsPanel";
import type { ImpactInsight, MatchSummary, Relevance } from "@/lib/api/types";

const RECOMMENDED_ORDER: readonly Relevance[] = ["HIGH", "MEDIUM", "LOW"];

/** Stable tiebreak so the order never depends on server response order. */
function byKickoffThenId(a: { kickoff_at: string; id: string }, b: { kickoff_at: string; id: string }) {
  return Date.parse(a.kickoff_at) - Date.parse(b.kickoff_at) || a.id.localeCompare(b.id);
}

export function nextOwnFixture(
  matches: readonly MatchSummary[],
  serverNowUtc: string | null,
): MatchSummary | null {
  if (!serverNowUtc) return null;
  const now = Date.parse(serverNowUtc);
  if (Number.isNaN(now)) return null;
  return (
    [...matches]
      .filter((m) => m.status === "SCHEDULED" && Date.parse(m.kickoff_at) > now)
      .sort(byKickoffThenId)[0] ?? null
  );
}

/** HIGH → MEDIUM → LOW, dates ascending inside each band. UNKNOWN excluded. */
export function recommendedInsights(insights: readonly ImpactInsight[]): ImpactInsight[] {
  return RECOMMENDED_ORDER.flatMap((relevance) =>
    insights
      .filter((insight) => insight.relevance === relevance)
      .sort((a, b) => byKickoffThenId(a.match, b.match)),
  );
}

export function unverifiedInsights(insights: readonly ImpactInsight[]): ImpactInsight[] {
  return insights
    .filter((insight) => insight.relevance === "UNKNOWN" || insight.basis === "INSUFFICIENT_DATA")
    .sort((a, b) => byKickoffThenId(a.match, b.match));
}

export function ImpactScreen() {
  const { user, isLoading: sessionLoading } = useSession();
  const meta = useMeta();
  const guestFavorite = useGuestFavorite();

  // The server favourite wins whenever there is a session, null included.
  const favoriteTeamId = user ? user.favorite_team_id : guestFavorite;
  const season = meta.data?.default_season_start_year ?? null;

  const impact = useRelevantImpact(favoriteTeamId, season);
  const journey = useJourney(favoriteTeamId, season);

  const recommended = useMemo(() => recommendedInsights(impact.data?.items ?? []), [impact.data]);
  const unverified = useMemo(() => unverifiedInsights(impact.data?.items ?? []), [impact.data]);
  const nextOwn = useMemo(
    () => nextOwnFixture(journey.data?.items ?? [], meta.data?.server_now_utc ?? null),
    [journey.data, meta.data],
  );

  if (sessionLoading || meta.isLoading) return <SkeletonList rows={4} />;

  if (meta.isError) {
    return (
      <ErrorState
        title="Could not reach the server"
        description="Impact needs the server clock and season before it can be calculated."
        onRetry={() => void meta.refetch()}
      />
    );
  }

  if (!favoriteTeamId) {
    return (
      <EmptyState
        title="Pick a club to see its impact"
        description="Impact shows how other results move your club's points gap. Choose a favourite club on the Journey first — other teams' matches stay fully browsable either way."
      />
    );
  }

  return (
    <div className="space-y-8">
      <StandingsPanel season={season} />

      <section aria-labelledby="recommended-heading">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="recommended-heading" className="text-lg font-bold text-ink">
            Recommended for your team
          </h2>
          {impact.data?.items[0] ? <SourceBadge kind={impact.data.items[0].match.source.kind} /> : null}
        </div>
        <p className="mt-1 max-w-prose text-sm text-ink-muted">
          Your next fixture first, then other clubs&rsquo; matches ordered by how much they can move
          your points gap. This ordering is deterministic — there is no prediction model behind it.
        </p>

        {nextOwn ? (
          <div className="mt-3">
            <h3 className="text-xs font-bold uppercase tracking-wide text-ink-muted">Your next match</h3>
            <ul className="mt-1.5">
              <li className="rounded-lg border border-line bg-surface-raised p-3 text-sm">
                <p className="font-bold text-ink">
                  {nextOwn.home_team.short_name}
                  <span className="mx-1 font-normal text-ink-muted">v</span>
                  {nextOwn.away_team.short_name}
                </p>
                <p className="mt-0.5 text-xs text-ink-muted">
                  Matchday {nextOwn.matchday ?? "unknown"}
                </p>
              </li>
            </ul>
          </div>
        ) : null}

        {impact.isLoading ? <SkeletonList rows={3} /> : null}

        {impact.isError ? (
          // A partial pagination failure must not look like a short list.
          <ErrorState
            title="Impact is unavailable"
            description={
              impact.error instanceof ApiError && impact.error.status === 404
                ? "The server has no impact data for this club and season."
                : "The full set of relevant fixtures could not be loaded, so none are shown rather than an incomplete list."
            }
            envelope={impact.error instanceof ApiError ? impact.error.envelope : null}
            onRetry={() => void impact.refetch()}
          />
        ) : null}

        {impact.data && recommended.length > 0 ? (
          <ul className="mt-3 space-y-2">
            {recommended.map((insight) => (
              <li key={insight.match_id}>
                <ImpactCard insight={insight} />
              </li>
            ))}
          </ul>
        ) : null}

        {impact.data && recommended.length === 0 ? (
          <p className="mt-3 rounded-md border border-line bg-surface-sunken px-3 py-2 text-sm text-ink-muted">
            No fixture currently has a verified points-gap effect to recommend. Anything that could not
            be verified is listed below rather than omitted.
          </p>
        ) : null}
      </section>

      {unverified.length > 0 ? (
        <section aria-labelledby="unverified-heading">
          <h2 id="unverified-heading" className="text-lg font-bold text-ink">
            Impact unverified
          </h2>
          <p className="mt-1 max-w-prose text-sm text-ink-muted">
            These fixtures are shown because their effect could not be verified, not because they are
            relevant and not because they had no effect. Nothing here is a recommendation.
          </p>
          <ul className="mt-3 space-y-2">
            {unverified.map((insight) => (
              <li key={insight.match_id}>
                <ImpactCard insight={insight} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
