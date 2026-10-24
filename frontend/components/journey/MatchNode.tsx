/**
 * One Journey node = exactly one match (FE-03).
 *
 * Competition drives the node's colour and motif; status drives its icon, ring
 * and label. They are read independently, so a cup tie and a league tie look
 * different from each other while a LIVE match looks the same in both.
 *
 * The node is a real `<a>`, not a div with a click handler, so it is
 * keyboard-reachable and middle-clickable. All decorative geometry sits behind
 * it in SVG with `aria-hidden`.
 */
import Link from "next/link";
import { competitionToken } from "@/lib/design/competitions";
import { statusToken } from "@/lib/design/status";
import { StatusIndicator } from "@/components/ui/StatusIndicator";
import { CompetitionBadge } from "@/components/ui/CompetitionBadge";
import { CompetitionGlyph } from "@/components/ui/Icon";
import { formatKickoff, machineDateTime } from "@/lib/time";
import type { MatchSummary } from "@/lib/api/types";

type Props = {
  readonly match: MatchSummary;
  /** The team whose Journey this is, so home/away can be framed from it. */
  readonly teamId: string | null;
  /** Marks the next upcoming fixture, which the path centres on. */
  readonly isNext: boolean;
  readonly side: "left" | "right";
};

/**
 * A score is shown only when the source actually settled one. A status with no
 * trustworthy result (scheduled, postponed, cancelled, unknown) shows a dash,
 * never 0–0, which would read as a real goalless draw.
 */
function ScoreReadout({ match }: { readonly match: MatchSummary }) {
  const token = statusToken(match.status);
  const { home, away } = match.score;
  const hasScore = home !== null && away !== null && !token.withoutResult;

  if (!hasScore) {
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

export function MatchNode({ match, teamId, isNext, side }: Props) {
  const competition = competitionToken(match.competition.brand_key);
  const status = statusToken(match.status);
  const accent = `rgb(var(${competition.accentVar}))`;
  const tone = `rgb(var(${status.toneVar}))`;

  const isHome = teamId !== null && match.home_team.id === teamId;
  const isAway = teamId !== null && match.away_team.id === teamId;
  const opponent = isHome ? match.away_team : match.home_team;
  const kickoff = formatKickoff(match.kickoff_at);

  // Feature flags come from the backend response. They are never recomputed
  // from `status` here (FE-03: actions follow backend `features`).
  const actions: string[] = [];
  if (match.features.predictions_open) actions.push("Predict");
  if (match.features.pre_match_room || match.features.post_match_room) actions.push("Discuss");
  if (match.features.whatif_available) actions.push("What-if");

  return (
    <li
      className={[
        "relative flex w-full",
        side === "left" ? "justify-start sm:pr-[52%]" : "justify-end sm:pl-[52%]",
      ].join(" ")}
    >
      {/* Node marker on the path. Decorative; the link below carries meaning. */}
      <span
        aria-hidden="true"
        className="absolute left-4 top-6 z-10 hidden h-9 w-9 -translate-x-1/2 items-center justify-center
                   rounded-full border-4 sm:left-1/2 sm:flex"
        style={{ backgroundColor: accent, borderColor: tone }}
      >
        <span className="h-4 w-4 text-white">
          <CompetitionGlyph motif={competition.motif} />
        </span>
      </span>

      <Link
        href={`/matches/${match.id}`}
        className={[
          "group block w-full rounded-xl border bg-surface-raised p-4 transition-shadow hover:shadow-md",
          isNext ? "ring-2" : "",
        ].join(" ")}
        style={{
          borderLeftWidth: 5,
          borderLeftColor: accent,
          ...(isNext ? { boxShadow: `0 0 0 2px ${tone}` } : {}),
        }}
        aria-current={isNext ? "step" : undefined}
      >
        <div className="flex flex-wrap items-center gap-2">
          <CompetitionBadge brandKey={match.competition.brand_key} name={match.competition.name} />
          <StatusIndicator status={match.status} variant="compact" />
          {isNext ? (
            <span className="rounded bg-surface-sunken px-2 py-0.5 text-[0.6875rem] font-bold uppercase tracking-wide text-ink">
              Next up
            </span>
          ) : null}
        </div>

        <div className="mt-3 flex items-baseline justify-between gap-3">
          <p className="min-w-0 text-base font-bold text-ink">
            {/* Home and away fixtures are both shown and labelled, never hidden. */}
            {isHome || isAway ? (
              <>
                <span className="text-ink-muted">{isHome ? "vs" : "away at"}</span> {opponent.short_name}
              </>
            ) : (
              <>
                {match.home_team.short_name}
                <span className="mx-1.5 font-normal text-ink-muted">v</span>
                {match.away_team.short_name}
              </>
            )}
          </p>
          <ScoreReadout match={match} />
        </div>

        <dl className="mt-2 space-y-0.5 text-xs text-ink-muted">
          <div className="flex gap-1.5">
            <dt className="sr-only">Kick-off</dt>
            <dd>
              {kickoff ? (
                <time dateTime={machineDateTime(match.kickoff_at)}>{kickoff}</time>
              ) : (
                "Kick-off time unavailable"
              )}
            </dd>
          </div>
          {match.venue ? (
            <div className="flex gap-1.5">
              <dt className="sr-only">Venue</dt>
              <dd>{match.venue.name}</dd>
            </div>
          ) : null}
          {match.matchday !== null ? (
            <div className="flex gap-1.5">
              <dt className="sr-only">Matchday</dt>
              <dd>Matchday {match.matchday}</dd>
            </div>
          ) : null}
        </dl>

        {actions.length > 0 ? (
          <p className="mt-3 flex flex-wrap gap-1.5">
            {actions.map((action) => (
              <span
                key={action}
                className="rounded border border-line px-1.5 py-0.5 text-[0.6875rem] font-semibold text-ink-muted"
              >
                {action}
              </span>
            ))}
            <span className="sr-only">available on this match</span>
          </p>
        ) : null}
      </Link>
    </li>
  );
}
