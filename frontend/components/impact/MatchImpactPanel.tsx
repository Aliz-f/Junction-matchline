/**
 * Impact for a single match (FE-06), shown in the match page's Impact tab.
 *
 * Needs the viewer's favourite club: impact is defined relative to one. Without
 * a favourite it says so rather than inventing a frame of reference.
 */
"use client";

import Link from "next/link";
import { useMatchImpact, useSession } from "@/lib/api/hooks";
import { useGuestFavorite } from "@/lib/useGuestFavorite";
import { ApiError } from "@/lib/api/client";
import { EmptyState, ErrorState, SkeletonList } from "@/components/ui/States";
import { ImpactCard } from "./ImpactCard";

export function MatchImpactPanel({ matchId }: { readonly matchId: string }) {
  const { user, isLoading } = useSession();
  const guestFavorite = useGuestFavorite();

  // Server favourite wins for a signed-in viewer, null included.
  const favoriteTeamId = user ? user.favorite_team_id : guestFavorite;
  const impact = useMatchImpact(matchId, favoriteTeamId);

  if (isLoading) return <SkeletonList rows={2} />;

  if (!favoriteTeamId) {
    return (
      <EmptyState
        title="Pick a club to see impact"
        description="Impact is measured against one club's points gap, so it needs a favourite club to compare with."
        action={
          <Link
            href="/"
            className="rounded-md border border-line bg-surface-raised px-3 py-1.5 text-sm font-semibold text-ink"
          >
            Choose on the Journey
          </Link>
        }
      />
    );
  }

  if (impact.isLoading) return <SkeletonList rows={2} />;

  if (impact.isError) {
    return (
      <ErrorState
        title="Impact is unavailable"
        description={
          impact.error instanceof ApiError && impact.error.status === 404
            ? "The server has no impact record for this match."
            : "The impact figures could not be loaded, so none are shown."
        }
        envelope={impact.error instanceof ApiError ? impact.error.envelope : null}
        onRetry={() => void impact.refetch()}
      />
    );
  }

  return impact.data ? <ImpactCard insight={impact.data} /> : null;
}
