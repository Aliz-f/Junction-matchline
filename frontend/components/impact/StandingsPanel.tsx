/**
 * Current standings (FE-06).
 *
 * Kept in its own area, labelled with the server's `as_of`, so a historical
 * impact calculation elsewhere on the page can never be mistaken for the live
 * table. Positions are shown only when the server supplies them: a null
 * position is rendered as such rather than being derived, because asserting a
 * rank without full tiebreaks is prohibited.
 */
"use client";

import { useStandings } from "@/lib/api/hooks";
import { ApiError } from "@/lib/api/client";
import { ErrorState, SkeletonList } from "@/components/ui/States";
import { SourceBadge, StaleSourceBanner } from "@/components/ui/SourceBadge";
import { useTeams } from "@/lib/api/hooks";
import { formatKickoff, machineDateTime } from "@/lib/time";

export function StandingsPanel({ season }: { readonly season: number | null }) {
  const standings = useStandings("PL", season);
  const teams = useTeams("PL");

  const nameFor = (teamId: string) =>
    teams.data?.items.find((team) => team.id === teamId)?.short_name ?? teamId;

  return (
    <section aria-labelledby="standings-heading">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="standings-heading" className="text-lg font-bold text-ink">
          {standings.data
            ? `Current standings (as of ${formatKickoff(standings.data.as_of) ?? standings.data.as_of})`
            : "Current standings"}
        </h2>
        {standings.data ? <SourceBadge kind={standings.data.source.kind} /> : null}
      </div>

      {standings.isLoading ? <SkeletonList rows={3} /> : null}

      {standings.isError ? (
        <div className="mt-2">
          <ErrorState
            title="Standings are unavailable"
            description={
              standings.error instanceof ApiError && standings.error.status === 502
                ? "The server has no standings snapshot to report. No table is shown rather than an estimated one."
                : "The standings table could not be loaded."
            }
            envelope={standings.error instanceof ApiError ? standings.error.envelope : null}
            onRetry={() => void standings.refetch()}
          />
        </div>
      ) : null}

      {standings.data ? (
        <>
          {standings.data.source.is_stale ? (
            <div className="mt-2">
              <StaleSourceBanner lastSyncedAt={standings.data.source.last_synced_at} />
            </div>
          ) : null}
          <p className="mt-1 text-xs text-ink-muted">
            Snapshot taken{" "}
            <time dateTime={machineDateTime(standings.data.as_of)}>
              {formatKickoff(standings.data.as_of) ?? standings.data.as_of}
            </time>
            .
          </p>
          <div className="mt-2 overflow-x-auto rounded-lg border border-line">
            <table className="w-full text-sm">
              <caption className="sr-only">
                Current league standings for the Premier League, {standings.data.season_start_year}
              </caption>
              <thead className="bg-surface-sunken text-xs uppercase tracking-wide text-ink-muted">
                <tr>
                  <th scope="col" className="px-2 py-2 text-left">Pos</th>
                  <th scope="col" className="px-2 py-2 text-left">Club</th>
                  <th scope="col" className="px-2 py-2 text-right">Pl</th>
                  <th scope="col" className="px-2 py-2 text-right">W</th>
                  <th scope="col" className="px-2 py-2 text-right">D</th>
                  <th scope="col" className="px-2 py-2 text-right">L</th>
                  <th scope="col" className="px-2 py-2 text-right">GD</th>
                  <th scope="col" className="px-2 py-2 text-right">Pts</th>
                </tr>
              </thead>
              <tbody>
                {standings.data.rows.map((row) => (
                  <tr key={row.team_id} className="border-t border-line">
                    <td className="px-2 py-1.5 font-mono tabular-nums text-ink-muted">
                      {row.position ?? "—"}
                    </td>
                    <th scope="row" className="px-2 py-1.5 text-left font-semibold text-ink">
                      {nameFor(row.team_id)}
                    </th>
                    <td className="px-2 py-1.5 text-right font-mono tabular-nums">{row.played}</td>
                    <td className="px-2 py-1.5 text-right font-mono tabular-nums">{row.won}</td>
                    <td className="px-2 py-1.5 text-right font-mono tabular-nums">{row.drawn}</td>
                    <td className="px-2 py-1.5 text-right font-mono tabular-nums">{row.lost}</td>
                    <td className="px-2 py-1.5 text-right font-mono tabular-nums">
                      {row.goal_difference > 0 ? "+" : ""}
                      {row.goal_difference}
                    </td>
                    <td className="px-2 py-1.5 text-right font-mono font-bold tabular-nums text-ink">
                      {row.points}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {standings.data.rows.some((row) => row.position === null) ? (
            <p className="mt-1.5 text-xs text-ink-muted">
              A dash means the server did not supply a position for that club. Positions are never
              derived here, because ranking requires the full tiebreak rules.
            </p>
          ) : null}
        </>
      ) : null}
    </section>
  );
}
