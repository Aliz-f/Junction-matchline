/**
 * Match header (FE-04).
 *
 * Renders defensively: a missing crest falls back to initials, a missing venue
 * says so, and a match with no trustworthy result shows no score rather than a
 * zero. A postponed or cancelled fixture gets an explicit warning so it can
 * never read as a goalless draw.
 */
import { statusToken } from "@/lib/design/status";
import { StatusIndicator } from "@/components/ui/StatusIndicator";
import { CompetitionBadge } from "@/components/ui/CompetitionBadge";
import { SourceBadge, StaleSourceBanner } from "@/components/ui/SourceBadge";
import { formatKickoff, machineDateTime } from "@/lib/time";
import type { MatchDetail, TeamSummary } from "@/lib/api/types";

function TeamCrest({ team }: { readonly team: TeamSummary }) {
  if (team.crest_url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- crest host is not known ahead of time, so the Image loader cannot be configured for it
      <img src={team.crest_url} alt="" width={40} height={40} className="h-10 w-10 shrink-0" />
    );
  }

  const initials = team.short_name
    .split(/\s+/)
    .map((word) => word[0] ?? "")
    .join("")
    .slice(0, 3)
    .toUpperCase();

  return (
    <span
      aria-hidden="true"
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-sunken text-sm font-bold text-ink-muted"
    >
      {initials}
    </span>
  );
}

export function MatchHeader({ match }: { readonly match: MatchDetail }) {
  const token = statusToken(match.status);
  const kickoff = formatKickoff(match.kickoff_at);
  const { home, away } = match.score;
  const showScore = home !== null && away !== null && !token.withoutResult;
  const disrupted = match.status === "POSTPONED" || match.status === "CANCELLED";

  return (
    <header className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <CompetitionBadge brandKey={match.competition.brand_key} name={match.competition.name} />
        <StatusIndicator status={match.status} />
        <SourceBadge kind={match.source.kind} />
      </div>

      <div className="rounded-xl border border-line bg-surface-raised p-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <TeamCrest team={match.home_team} />
            <div className="min-w-0">
              <p className="truncate text-base font-bold text-ink">{match.home_team.short_name}</p>
              <p className="text-xs text-ink-muted">Home</p>
            </div>
          </div>

          <div className="shrink-0 text-center">
            {showScore ? (
              <p className="font-mono text-3xl font-black tabular-nums text-ink">
                {home}
                <span className="mx-1.5 text-ink-muted">–</span>
                {away}
              </p>
            ) : (
              <p className="text-sm font-semibold text-ink-muted">
                {disrupted ? "No result" : "Not started"}
              </p>
            )}
            {match.status === "LIVE" || match.status === "HALFTIME" ? (
              <p className="mt-1 text-[0.6875rem] font-semibold uppercase tracking-wide text-ink-muted">
                Score may change
              </p>
            ) : null}
          </div>

          <div className="flex min-w-0 flex-1 items-center justify-end gap-3 text-right">
            <div className="min-w-0">
              <p className="truncate text-base font-bold text-ink">{match.away_team.short_name}</p>
              <p className="text-xs text-ink-muted">Away</p>
            </div>
            <TeamCrest team={match.away_team} />
          </div>
        </div>

        <dl className="mt-4 grid gap-x-6 gap-y-2 border-t border-line pt-3 text-sm sm:grid-cols-2">
          <div className="flex gap-2">
            <dt className="text-ink-muted">Kick-off</dt>
            <dd className="font-medium text-ink">
              {kickoff ? (
                <time dateTime={machineDateTime(match.kickoff_at)}>{kickoff}</time>
              ) : (
                <span className="text-ink-muted">Not available</span>
              )}
            </dd>
          </div>
          <div className="flex gap-2">
            <dt className="text-ink-muted">Stadium</dt>
            <dd className="font-medium text-ink">
              {match.venue ? (
                match.venue.name
              ) : (
                <span className="text-ink-muted">Location unavailable</span>
              )}
            </dd>
          </div>
          <div className="flex gap-2">
            <dt className="text-ink-muted">Round</dt>
            <dd className="font-medium text-ink">
              {match.matchday !== null ? (
                `Matchday ${match.matchday}`
              ) : (
                <span className="text-ink-muted">Not available</span>
              )}
            </dd>
          </div>
          <div className="flex gap-2">
            <dt className="text-ink-muted">Source</dt>
            <dd className="font-medium text-ink">
              {match.source.kind === "DEMO_SYNTHETIC" ? "Synthetic demo data" : "Live provider"}
              <span className="ml-1.5 font-normal text-ink-muted">({match.source.data_version})</span>
            </dd>
          </div>
        </dl>
      </div>

      {disrupted ? (
        <p role="status" className="rounded-md border border-amber-500/50 bg-amber-500/10 px-3 py-2 text-sm text-amber-800 dark:text-amber-200">
          <strong className="font-semibold">
            This match was {match.status === "POSTPONED" ? "postponed" : "cancelled"}.
          </strong>{" "}
          There is no result, and any score shown elsewhere for this fixture is not final.
        </p>
      ) : null}

      {match.source.is_stale ? <StaleSourceBanner lastSyncedAt={match.source.last_synced_at} /> : null}
    </header>
  );
}
