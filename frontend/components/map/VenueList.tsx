/**
 * Accessible stadium and fixture list (FE-05).
 *
 * This, not the map, is the canonical representation: it is keyboard-navigable,
 * works with no JavaScript map and survives a tile outage. Every selected
 * fixture appears here exactly once, including fixtures with no mappable venue.
 *
 * Each fixture links to `/matches/{id}` using the id the API returned, so map,
 * Journey and Impact all agree on identity.
 */
import Link from "next/link";
import { illuminationToken } from "@/lib/design/illumination";
import { StatusIndicator } from "@/components/ui/StatusIndicator";
import { CompetitionBadge } from "@/components/ui/CompetitionBadge";
import { statusToken } from "@/lib/design/status";
import { formatKickoff, machineDateTime } from "@/lib/time";
import type { MatchSummary, StadiumMapResponse } from "@/lib/api/types";

type Venue = StadiumMapResponse["stadiums"][number];
type Unmapped = StadiumMapResponse["unmapped_matches"][number];

const UNMAPPED_REASONS: Record<Unmapped["reason"], string> = {
  VENUE_MISSING: "No stadium recorded for this fixture.",
  VENUE_COORDINATES_UNVERIFIED: "This stadium's coordinates are not verified, so it is not placed on the map.",
};

function FixtureRow({ match }: { readonly match: MatchSummary }) {
  const token = statusToken(match.status);
  const { home, away } = match.score;
  const showScore = home !== null && away !== null && !token.withoutResult;
  const kickoff = formatKickoff(match.kickoff_at);

  return (
    <li>
      <Link
        href={`/matches/${match.id}`}
        className="block rounded-md border border-line bg-surface-raised p-2.5 hover:bg-surface-sunken"
      >
        <div className="flex flex-wrap items-center gap-2">
          <CompetitionBadge brandKey={match.competition.brand_key} name={match.competition.name} />
          <StatusIndicator status={match.status} variant="compact" />
        </div>
        <div className="mt-1.5 flex items-baseline justify-between gap-2">
          <span className="min-w-0 text-sm font-semibold text-ink">
            {match.home_team.short_name}
            <span className="mx-1 font-normal text-ink-muted">v</span>
            {match.away_team.short_name}
          </span>
          {showScore ? (
            <span className="font-mono text-sm font-bold tabular-nums text-ink">
              {home}
              <span className="mx-0.5 text-ink-muted">–</span>
              {away}
            </span>
          ) : (
            <span className="font-mono text-xs text-ink-muted" aria-label="No score">
              –
            </span>
          )}
        </div>
        {kickoff ? (
          <p className="mt-0.5 text-xs text-ink-muted">
            <time dateTime={machineDateTime(match.kickoff_at)}>{kickoff}</time>
          </p>
        ) : null}
      </Link>
    </li>
  );
}

export function VenueList({
  stadiums,
  unmapped,
  favoriteTeamId,
  highlightVenueId,
}: {
  readonly stadiums: readonly Venue[];
  readonly unmapped: readonly Unmapped[];
  readonly favoriteTeamId: string | null;
  readonly highlightVenueId: string | null;
}) {
  return (
    <div className="space-y-4">
      <ul className="space-y-3">
        {stadiums.map((venue) => {
          const token = illuminationToken(venue.illumination_state);
          const isFavoriteHome =
            favoriteTeamId !== null && venue.home_team_ids.includes(favoriteTeamId);
          const isHighlighted = venue.venue_id === highlightVenueId;

          return (
            <li
              key={venue.venue_id}
              id={`venue-${venue.venue_id}`}
              className={[
                "rounded-lg border bg-surface-raised p-3",
                isFavoriteHome ? "border-amber-500" : "border-line",
                isHighlighted ? "ring-2 ring-line" : "",
              ].join(" ")}
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="text-sm font-bold text-ink">
                  {venue.name}
                  {isFavoriteHome ? (
                    <span className="ml-2 rounded bg-amber-500/15 px-1.5 py-0.5 text-[0.6875rem] font-bold uppercase tracking-wide text-amber-700 dark:text-amber-300">
                      Your club&rsquo;s home
                    </span>
                  ) : null}
                </h3>
                <span
                  className="inline-flex items-center gap-1.5 text-xs font-semibold"
                  style={{ color: `rgb(var(${token.toneVar}))` }}
                >
                  <span
                    aria-hidden="true"
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: `rgb(var(${token.toneVar}))` }}
                  />
                  {token.label}
                </span>
              </div>

              <p className="mt-0.5 text-xs text-ink-muted">{token.description}</p>

              {venue.fixtures.length > 0 ? (
                <ul className="mt-2.5 space-y-2">
                  {venue.fixtures.map(({ match }) => (
                    <FixtureRow key={match.id} match={match} />
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-xs text-ink-muted">
                  No fixture here in this selection.
                  {isFavoriteHome ? " It is still shown because it is your club's home ground." : ""}
                </p>
              )}
            </li>
          );
        })}
      </ul>

      {unmapped.length > 0 ? (
        <section aria-labelledby="unmapped-heading" className="rounded-lg border border-dashed border-line bg-surface-raised p-3">
          <h3 id="unmapped-heading" className="text-sm font-bold text-ink">
            Location unavailable
          </h3>
          <p className="mt-0.5 text-xs text-ink-muted">
            These fixtures are in the current selection but cannot be placed on the map. They are
            listed rather than given a guessed location.
          </p>
          <ul className="mt-2.5 space-y-2">
            {unmapped.map(({ match, reason }) => (
              <li key={match.id}>
                <ul className="space-y-1">
                  <FixtureRow match={match} />
                </ul>
                <p className="mt-0.5 px-2.5 text-xs text-ink-muted">{UNMAPPED_REASONS[reason]}</p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
