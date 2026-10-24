/**
 * Journey screen (FE-02 + FE-03).
 *
 * Favourite-team resolution, in priority order:
 *  1. Signed in  -> the **server** favourite always wins, including when it is
 *     null. A stale guest choice never overrides it.
 *  2. Guest      -> the `localStorage` choice.
 *  3. Neither    -> prompt the picker, while still allowing browsing.
 *
 * When a guest with a local choice signs in and the server disagrees, we ask
 * before importing (`PUT /users/me/favorite-team`). Declining changes nothing.
 */
"use client";

import { useEffect, useMemo, useState } from "react";
import { useJourney, useMeta, useSession, useSetFavoriteTeam, useTeams } from "@/lib/api/hooks";
import { readGuestFavorite, writeGuestFavorite } from "@/lib/favorite-team";
import { competitionGroup, competitionToken, type CompetitionGroup } from "@/lib/design/competitions";
import { ApiError } from "@/lib/api/client";
import { JourneyPath } from "./JourneyPath";
import { CompetitionFilter } from "./CompetitionFilter";
import { TeamPicker } from "@/components/team/TeamPicker";
import { EmptyState, ErrorState, SkeletonList } from "@/components/ui/States";
import { SourceBadge, StaleSourceBanner } from "@/components/ui/SourceBadge";

function errorFor(error: unknown): { title: string; description: string } {
  if (error instanceof ApiError) {
    if (error.status === 404) {
      return {
        title: "No Journey for this club",
        description: "The server has no fixtures for that club and season.",
      };
    }
    if (!error.conformed) {
      return {
        title: "The server response could not be read",
        description:
          "The backend replied in a shape this build does not recognise. This is a contract mismatch, not a problem with your connection.",
      };
    }
    return { title: "Could not load the Journey", description: error.message };
  }
  return { title: "Could not load the Journey", description: "An unexpected error occurred." };
}

export function JourneyScreen() {
  const { user, isLoading: sessionLoading } = useSession();
  const meta = useMeta();
  const teams = useTeams("PL");
  const setFavorite = useSetFavoriteTeam();

  const [guestFavorite, setGuestFavorite] = useState<string | null>(null);
  const [importDeclined, setImportDeclined] = useState(false);
  const [filter, setFilter] = useState<CompetitionGroup>("ALL");

  // Read once on mount: `localStorage` is unavailable during SSR.
  useEffect(() => {
    setGuestFavorite(readGuestFavorite());
  }, []);

  // The server value wins whenever there is a session, null included.
  const effectiveTeamId = user ? user.favorite_team_id : guestFavorite;
  const season = meta.data?.default_season_start_year ?? null;
  const journey = useJourney(effectiveTeamId, season);

  const offerImport =
    user !== null && user.favorite_team_id === null && guestFavorite !== null && !importDeclined;

  const visible = useMemo(() => {
    const items = journey.data?.items ?? [];
    if (filter === "ALL") return items;
    return items.filter((match) => competitionGroup(competitionToken(match.competition.brand_key)) === filter);
  }, [journey.data, filter]);

  function chooseTeam(teamId: string) {
    if (user) {
      setFavorite.mutate(teamId);
    } else {
      writeGuestFavorite(teamId);
      setGuestFavorite(teamId);
    }
  }

  if (sessionLoading || meta.isLoading) return <SkeletonList rows={4} />;

  if (meta.isError) {
    return (
      <ErrorState
        title="Could not reach the server"
        description="The app needs the server clock and capabilities before it can show a Journey."
        onRetry={() => void meta.refetch()}
      />
    );
  }

  // No favourite yet: prompt, but make clear browsing is still possible.
  if (!effectiveTeamId) {
    return (
      <div className="space-y-6">
        <EmptyState
          title="Pick a club to build your Journey"
          description="Your Journey follows one club through the season. A favourite club prioritises what you see — it never hides other teams' matches, and you can browse every fixture without choosing one."
        />
        {teams.isLoading ? <SkeletonList rows={3} /> : null}
        {teams.isError ? (
          <ErrorState title="Could not load clubs" onRetry={() => void teams.refetch()} />
        ) : null}
        {teams.data ? (
          <TeamPicker
            teams={teams.data.items}
            selectedTeamId={null}
            onSelect={chooseTeam}
            isSaving={setFavorite.isPending}
          />
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {offerImport ? (
        <div role="region" aria-label="Import favourite club" className="rounded-lg border border-line bg-surface-sunken p-4">
          <p className="text-sm text-ink">
            You picked a club before signing in. Your account currently has no favourite club. Import it?
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => guestFavorite && setFavorite.mutate(guestFavorite)}
              disabled={setFavorite.isPending}
              className="rounded-md bg-ink px-3 py-1.5 text-sm font-semibold text-surface-raised disabled:opacity-60"
            >
              {setFavorite.isPending ? "Saving…" : "Import to my account"}
            </button>
            <button
              type="button"
              onClick={() => setImportDeclined(true)}
              className="rounded-md border border-line px-3 py-1.5 text-sm font-semibold text-ink"
            >
              Keep my account as it is
            </button>
          </div>
        </div>
      ) : null}

      {setFavorite.isError ? (
        <ErrorState
          title="Could not save your club"
          description={
            setFavorite.error instanceof ApiError && setFavorite.error.isUnauthenticated
              ? "Your session has expired. Sign in again to save a favourite club."
              : "The server rejected the change, so your favourite club is unchanged."
          }
        />
      ) : null}

      {journey.isLoading ? <SkeletonList rows={4} /> : null}

      {journey.isError ? (
        <ErrorState {...errorFor(journey.error)} onRetry={() => void journey.refetch()} />
      ) : null}

      {journey.data ? (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CompetitionFilter
              value={filter}
              onChange={setFilter}
              counts={countByGroup(journey.data.items)}
            />
            {journey.data.items[0] ? <SourceBadge kind={journey.data.items[0].source.kind} /> : null}
          </div>

          {journey.data.items.some((match) => match.source.is_stale) ? (
            <StaleSourceBanner lastSyncedAt={journey.data.items[0]?.source.last_synced_at ?? null} />
          ) : null}

          {visible.length === 0 ? (
            <EmptyState
              title="Nothing in this competition"
              description="The current data set has no fixtures for this club in that competition. Nothing is hidden — there simply are none to show."
            />
          ) : (
            <JourneyPath
              matches={visible}
              teamId={journey.data.team_id}
              serverNowUtc={meta.data?.server_now_utc ?? null}
            />
          )}
        </>
      ) : null}

      {teams.data ? (
        <details className="rounded-lg border border-line bg-surface-raised p-4">
          <summary className="cursor-pointer text-sm font-semibold text-ink">Change club</summary>
          <div className="mt-4">
            <TeamPicker
              teams={teams.data.items}
              selectedTeamId={effectiveTeamId}
              onSelect={chooseTeam}
              isSaving={setFavorite.isPending}
            />
            <p className="mt-3 text-xs text-ink-muted">
              Changing your club re-prioritises your Journey. It never clears your prediction history or badges.
            </p>
          </div>
        </details>
      ) : null}
    </div>
  );
}

function countByGroup(matches: readonly { competition: { brand_key: string } }[]): Record<CompetitionGroup, number> {
  const counts: Record<CompetitionGroup, number> = { ALL: matches.length, LEAGUE: 0, CUP: 0 };
  for (const match of matches) {
    const group = competitionGroup(competitionToken(match.competition.brand_key));
    if (group) counts[group] += 1;
  }
  return counts;
}
