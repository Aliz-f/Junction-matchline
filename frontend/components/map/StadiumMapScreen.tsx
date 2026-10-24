/**
 * Stadium map screen (FE-05).
 *
 * Selector rules, which are the fiddly part:
 *  - The default is the Europe/London calendar date derived from
 *    `/meta.server_now_utc`, never the browser's date.
 *  - Exactly one of `date` or `matchday` is ever sent.
 *  - If the default date has no fixtures, that empty date **stays selected**.
 *    Silently jumping to the nearest matchday would misrepresent the data.
 *
 * CT-15: when signed in, the server favourite decides the home-ground outline,
 * including when it is null. A stale guest-local favourite is NOT used for a
 * signed-in viewer; it is only offered for import.
 */
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useCompetitions, useMatchdays, useMeta, useSession, useStadiumMap } from "@/lib/api/hooks";
import { readGuestFavorite } from "@/lib/favorite-team";
import { ApiError } from "@/lib/api/client";
import { EmptyState, ErrorState, SkeletonList } from "@/components/ui/States";
import { SourceBadge, StaleSourceBanner } from "@/components/ui/SourceBadge";
import { ILLUMINATION_TOKENS } from "@/lib/design/illumination";
import { EnglandMap } from "./EnglandMap";
import { VenueList } from "./VenueList";
import { formatDate } from "@/lib/time";

type Selector = { date: string | null; matchday: number | null };

function Legend() {
  return (
    <details className="rounded-lg border border-line bg-surface-raised p-3">
      <summary className="cursor-pointer text-sm font-semibold text-ink">Map legend</summary>
      <ul className="mt-3 space-y-1.5">
        {Object.entries(ILLUMINATION_TOKENS).map(([state, token]) => (
          <li key={state} className="flex items-start gap-2 text-xs">
            <span
              aria-hidden="true"
              className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: `rgb(var(${token.toneVar}))` }}
            />
            <span>
              <span className="font-semibold text-ink">{token.label}</span>{" "}
              <span className="text-ink-muted">{token.description}</span>
            </span>
          </li>
        ))}
        <li className="flex items-start gap-2 text-xs">
          <span
            aria-hidden="true"
            className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full border-2 border-amber-500"
          />
          <span>
            <span className="font-semibold text-ink">Your club&rsquo;s home</span>{" "}
            <span className="text-ink-muted">
              Outlined from the venue&rsquo;s home clubs, even with no fixture in this selection.
            </span>
          </span>
        </li>
      </ul>
    </details>
  );
}

export function StadiumMapScreen() {
  const { user, isLoading: sessionLoading } = useSession();
  const meta = useMeta();
  const matchdays = useMatchdays("PL", meta.data?.default_season_start_year ?? null);

  const [selector, setSelector] = useState<Selector | null>(null);
  const [highlight, setHighlight] = useState<string | null>(null);
  const [guestFavorite, setGuestFavorite] = useState<string | null>(null);

  useEffect(() => {
    setGuestFavorite(readGuestFavorite());
  }, []);

  // Default selector: the London calendar date of the server clock. Set once,
  // and not replaced if it turns out to be empty.
  const serverNow = meta.data?.server_now_utc ?? null;
  useEffect(() => {
    if (selector !== null || !serverNow) return;
    const londonDate = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Europe/London",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date(serverNow));
    setSelector({ date: londonDate, matchday: null });
  }, [serverNow, selector]);

  const map = useStadiumMap(selector ?? { date: null, matchday: null });
  const competitions = useCompetitions();

  // The banner uses the server's own competition name, not hardcoded branding.
  const competitionLabel =
    competitions.data?.items.find((item) => item.code === map.data?.competition)?.name ?? null;

  // CT-15: a signed-in viewer's favourite is the server's, null included.
  const favoriteTeamId = user ? user.favorite_team_id : guestFavorite;
  const offerImport = user !== null && user.favorite_team_id === null && guestFavorite !== null;

  const fixtureCount = useMemo(() => {
    if (!map.data) return 0;
    const placed = map.data.stadiums.reduce((sum, venue) => sum + venue.fixtures.length, 0);
    return placed + map.data.unmapped_matches.length;
  }, [map.data]);

  if (sessionLoading || meta.isLoading || selector === null) return <SkeletonList rows={4} />;

  if (meta.isError) {
    return (
      <ErrorState
        title="Could not reach the server"
        description="The map needs the server clock before it can pick a date."
        onRetry={() => void meta.refetch()}
      />
    );
  }

  return (
    <div className="space-y-5">
      {/* Selector: exactly one of date or matchday is ever active. */}
      <div className="flex flex-wrap items-end gap-4 rounded-lg border border-line bg-surface-raised p-3">
        <div>
          <label htmlFor="map-date" className="block text-xs font-semibold text-ink">
            Date (Europe/London)
          </label>
          <input
            id="map-date"
            type="date"
            value={selector.date ?? ""}
            onChange={(event) =>
              setSelector(event.target.value ? { date: event.target.value, matchday: null } : selector)
            }
            className="mt-1 rounded-md border border-line bg-surface-raised px-2.5 py-1.5 text-sm text-ink"
          />
        </div>

        <div>
          <label htmlFor="map-matchday" className="block text-xs font-semibold text-ink">
            or matchday
          </label>
          <select
            id="map-matchday"
            value={selector.matchday ?? ""}
            onChange={(event) =>
              setSelector(
                event.target.value ? { date: null, matchday: Number(event.target.value) } : selector,
              )
            }
            disabled={!matchdays.data}
            className="mt-1 rounded-md border border-line bg-surface-raised px-2.5 py-1.5 text-sm text-ink disabled:opacity-60"
          >
            <option value="">Choose…</option>
            {(matchdays.data?.items ?? []).map((day) => (
              <option key={day} value={day}>
                Matchday {day}
              </option>
            ))}
          </select>
        </div>

        <p className="text-xs text-ink-muted">
          {selector.date
            ? `Showing ${formatDate(`${selector.date}T12:00:00Z`) ?? selector.date}`
            : `Showing matchday ${selector.matchday}`}
        </p>
      </div>

      {map.isLoading ? <SkeletonList rows={3} /> : null}

      {map.isError ? (
        <ErrorState
          title="Could not load the map"
          description={
            map.error instanceof ApiError && map.error.status === 422
              ? "The server rejected that selection."
              : "The request failed. Nothing was changed."
          }
          envelope={map.error instanceof ApiError ? map.error.envelope : null}
          onRetry={() => void map.refetch()}
        />
      ) : null}

      {map.data ? (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-ink-muted">
              {fixtureCount === 0
                ? "No fixtures in this selection."
                : `${fixtureCount} ${fixtureCount === 1 ? "fixture" : "fixtures"} · ${map.data.stadiums.length} verified stadiums`}
            </p>
            <SourceBadge kind={map.data.source.kind} />
          </div>

          {map.data.source.is_stale ? (
            <StaleSourceBanner lastSyncedAt={map.data.source.last_synced_at} />
          ) : null}

          {offerImport ? (
            <p role="status" className="rounded-md border border-line bg-surface-sunken px-3 py-2 text-sm text-ink-muted">
              You picked a club before signing in, but your account has no favourite club. The map is
              showing the public view. Import your choice from the{" "}
              <Link href="/" className="font-semibold text-ink underline">
                Journey
              </Link>{" "}
              to highlight your home ground.
            </p>
          ) : null}

          {fixtureCount === 0 ? (
            <EmptyState
              title="No fixtures on this date"
              description="This date genuinely has no matches. The selection has been kept rather than jumping to another round — choose a matchday above to see one."
            />
          ) : null}

          <EnglandMap
            stadiums={map.data.stadiums}
            favoriteTeamId={favoriteTeamId}
            onSelect={setHighlight}
            selectedVenueId={highlight}
            competitionName={competitionLabel}
            seasonStartYear={map.data.season_start_year}
          />

          <VenueList
            stadiums={map.data.stadiums}
            unmapped={map.data.unmapped_matches}
            favoriteTeamId={favoriteTeamId}
            highlightVenueId={highlight}
          />

          <Legend />
        </>
      ) : null}
    </div>
  );
}
