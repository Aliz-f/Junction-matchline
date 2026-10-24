/**
 * All-matches browse (FE-04).
 *
 * Deliberately independent of the favourite club: no `team_id` is sent and the
 * list renders identically for a guest, so "prioritises, never conceals" holds.
 */
"use client";

import Link from "next/link";
import { useAllMatches } from "@/lib/api/hooks";
import { ApiError } from "@/lib/api/client";
import { EmptyState, ErrorState, SkeletonList } from "@/components/ui/States";
import { StatusIndicator } from "@/components/ui/StatusIndicator";
import { CompetitionBadge } from "@/components/ui/CompetitionBadge";
import { SourceBadge } from "@/components/ui/SourceBadge";
import { statusToken } from "@/lib/design/status";
import { formatKickoff, machineDateTime } from "@/lib/time";
import type { MatchSummary } from "@/lib/api/types";

function Score({ match }: { readonly match: MatchSummary }) {
  const token = statusToken(match.status);
  const { home, away } = match.score;
  if (home === null || away === null || token.withoutResult) {
    return (
      <span className="font-mono text-sm text-ink-muted" aria-label="No score">
        –
      </span>
    );
  }
  return (
    <span className="font-mono text-base font-bold tabular-nums text-ink">
      {home}
      <span className="mx-1 text-ink-muted">–</span>
      {away}
    </span>
  );
}

export function AllMatchesScreen() {
  const query = useAllMatches();

  if (query.isLoading) return <SkeletonList rows={5} />;

  if (query.isError) {
    return (
      <ErrorState
        title="Could not load matches"
        description={
          query.error instanceof ApiError && !query.error.conformed
            ? "The server replied in a shape this build does not recognise."
            : "The request failed. Nothing was changed."
        }
        envelope={query.error instanceof ApiError ? query.error.envelope : null}
        onRetry={() => void query.refetch()}
      />
    );
  }

  const items = query.data?.items ?? [];

  if (items.length === 0) {
    return (
      <EmptyState
        title="No fixtures"
        description="The current data set contains no matches. Nothing is being filtered out."
      />
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-ink-muted">
          {items.length} {items.length === 1 ? "fixture" : "fixtures"}
        </p>
        {items[0] ? <SourceBadge kind={items[0].source.kind} /> : null}
      </div>

      <ul className="space-y-2">
        {items.map((match) => {
          const kickoff = formatKickoff(match.kickoff_at);
          return (
            <li key={match.id}>
              <Link
                href={`/matches/${match.id}`}
                className="block rounded-lg border border-line bg-surface-raised p-3 transition-shadow hover:shadow-md"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <CompetitionBadge brandKey={match.competition.brand_key} name={match.competition.name} />
                  <StatusIndicator status={match.status} variant="compact" />
                </div>
                <div className="mt-2 flex items-baseline justify-between gap-3">
                  <p className="min-w-0 text-sm font-bold text-ink">
                    {match.home_team.short_name}
                    <span className="mx-1.5 font-normal text-ink-muted">v</span>
                    {match.away_team.short_name}
                  </p>
                  <Score match={match} />
                </div>
                <p className="mt-1 text-xs text-ink-muted">
                  {kickoff ? (
                    <time dateTime={machineDateTime(match.kickoff_at)}>{kickoff}</time>
                  ) : (
                    "Kick-off time unavailable"
                  )}
                  {match.venue ? ` · ${match.venue.name}` : " · Location unavailable"}
                </p>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
