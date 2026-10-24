/**
 * One impact insight (FE-06).
 *
 * Rules this component exists to enforce:
 *
 * - The embedded `match` is used directly. There is no second fetch per card.
 * - Gap maths is **displayed, never recomputed**. `gap_delta` comes from the
 *   server; we only check it is self-consistent and say so if it is not.
 * - A `position_change` of null must carry its `position_note`.
 * - Scenarios are labelled Hypothetical or Confirmed from `is_hypothetical`,
 *   never inferred from match status.
 * - `UNKNOWN` / `INSUFFICIENT_DATA` renders as an explicit unverified state with
 *   its caveats, never as "no effect".
 */
import Link from "next/link";
import { StatusIndicator } from "@/components/ui/StatusIndicator";
import { CompetitionBadge } from "@/components/ui/CompetitionBadge";
import { DemoAiBadge } from "@/components/ui/SourceBadge";
import { formatKickoff, machineDateTime } from "@/lib/time";
import type { GapEffect, ImpactInsight, Relevance, TeamSummary } from "@/lib/api/types";

const RELEVANCE_LABELS: Record<Relevance, string> = {
  HIGH: "High relevance",
  MEDIUM: "Medium relevance",
  LOW: "Low relevance",
  NONE: "Below recommendation threshold",
  UNKNOWN: "Impact unverified",
};

const RELEVANCE_TONES: Record<Relevance, string> = {
  HIGH: "--status-live",
  MEDIUM: "--status-halftime",
  LOW: "--status-scheduled",
  NONE: "--status-unknown",
  UNKNOWN: "--status-unknown",
};

const OUTCOME_LABELS = { HOME: "Home win", DRAW: "Draw", AWAY: "Away win" } as const;

function teamName(insight: ImpactInsight, teamId: string): string {
  const candidates: TeamSummary[] = [insight.match.home_team, insight.match.away_team];
  return candidates.find((team) => team.id === teamId)?.short_name ?? "Another club";
}

/** Shows the server's signed gap maths without redoing it. */
function GapEffectRow({ effect, insight }: { readonly effect: GapEffect; readonly insight: ImpactInsight }) {
  // Display-only consistency check. If the server's own numbers disagree we say
  // so rather than quietly substituting our own arithmetic.
  const consistent = effect.gap_delta === effect.gap_after - effect.gap_before;
  const improves = effect.gap_delta > 0;

  return (
    <li className="rounded-md border border-line bg-surface-raised p-2.5 text-sm">
      <p className="font-semibold text-ink">{teamName(insight, effect.affected_team_id)}</p>
      <p className="mt-0.5 text-ink-muted">
        Gap <span className="font-mono tabular-nums">{effect.gap_before}</span> →{" "}
        <span className="font-mono tabular-nums">{effect.gap_after}</span>{" "}
        <span
          className="font-mono font-bold tabular-nums"
          style={{ color: `rgb(var(${improves ? "--status-finished" : "--status-live"}))` }}
        >
          ({effect.gap_delta > 0 ? "+" : ""}
          {effect.gap_delta})
        </span>
      </p>
      {!consistent ? (
        <p className="mt-1 text-xs font-semibold text-amber-700 dark:text-amber-300">
          The server&rsquo;s gap figures are not self-consistent, so they are shown as received and not
          recalculated.
        </p>
      ) : null}
      <p className="mt-0.5 text-xs text-ink-muted">
        {effect.position_change === null ? (
          // A null change must be explained, never shown as "no movement".
          <>{effect.position_note ?? "Position change is not available for this effect."}</>
        ) : (
          <>
            Your club&rsquo;s position change:{" "}
            <span className="font-mono tabular-nums">
              {effect.position_change > 0 ? "+" : ""}
              {effect.position_change}
            </span>
            {effect.position_note ? ` — ${effect.position_note}` : null}
          </>
        )}
      </p>
    </li>
  );
}

export function ImpactCard({ insight }: { readonly insight: ImpactInsight }) {
  const { match } = insight;
  const kickoff = formatKickoff(match.kickoff_at);
  const unverified = insight.relevance === "UNKNOWN" || insight.basis === "INSUFFICIENT_DATA";

  return (
    <article className="rounded-lg border border-line bg-surface-raised p-3">
      <div className="flex flex-wrap items-center gap-2">
        <CompetitionBadge brandKey={match.competition.brand_key} name={match.competition.name} />
        <StatusIndicator status={match.status} variant="compact" />
        <span
          className="rounded-full px-2 py-0.5 text-[0.6875rem] font-bold uppercase tracking-wide"
          style={{
            color: `rgb(var(${RELEVANCE_TONES[insight.relevance]}))`,
            backgroundColor: `rgb(var(${RELEVANCE_TONES[insight.relevance]}) / 0.12)`,
          }}
        >
          {RELEVANCE_LABELS[insight.relevance]}
        </span>
      </div>

      {/* The embedded match summary is authoritative; no extra fetch. */}
      <Link href={`/matches/${match.id}`} className="mt-2 block">
        <p className="text-sm font-bold text-ink">
          {match.home_team.short_name}
          <span className="mx-1 font-normal text-ink-muted">v</span>
          {match.away_team.short_name}
        </p>
        {kickoff ? (
          <p className="text-xs text-ink-muted">
            <time dateTime={machineDateTime(match.kickoff_at)}>{kickoff}</time>
          </p>
        ) : null}
      </Link>

      <p className="mt-2 flex flex-wrap items-center gap-1.5 text-sm text-ink-muted">
        {insight.summary_type === "AI_EXPLANATION" ? <DemoAiBadge /> : null}
        <span>{insight.summary}</span>
      </p>

      {insight.actual_outcome !== null ? (
        <p className="mt-2 text-sm">
          <span className="font-semibold text-ink">Confirmed result:</span>{" "}
          <span className="text-ink-muted">{OUTCOME_LABELS[insight.actual_outcome]}</span>
        </p>
      ) : null}

      {insight.scenarios.length > 0 ? (
        <div className="mt-3 space-y-2">
          {insight.scenarios.map((scenario) => (
            <section key={scenario.outcome}>
              <h4 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-ink-muted">
                {OUTCOME_LABELS[scenario.outcome]}
                <span
                  className={[
                    "rounded px-1.5 py-0.5 text-[0.625rem]",
                    scenario.is_hypothetical
                      ? "bg-surface-sunken text-ink-muted"
                      : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
                  ].join(" ")}
                >
                  {/* From the flag, never inferred from status. */}
                  {scenario.is_hypothetical ? "Hypothetical" : "Confirmed"}
                </span>
              </h4>
              <ul className="mt-1.5 space-y-1.5">
                {scenario.effects.map((effect) => (
                  <GapEffectRow key={effect.affected_team_id} effect={effect} insight={insight} />
                ))}
              </ul>
            </section>
          ))}
        </div>
      ) : unverified ? (
        <p className="mt-2 rounded-md border border-line bg-surface-sunken px-2.5 py-2 text-xs text-ink-muted">
          No scenarios are shown because the evidence to support them is not available. This is{" "}
          <strong className="font-semibold text-ink">not</strong> a statement that the result had no
          effect.
        </p>
      ) : null}

      {insight.caveats.length > 0 ? (
        <ul className="mt-2 space-y-1">
          {insight.caveats.map((caveat) => (
            <li key={caveat} className="text-xs text-ink-muted">
              {caveat}
            </li>
          ))}
        </ul>
      ) : null}

      {insight.sources.length > 0 ? (
        <p className="mt-2 flex flex-wrap gap-1.5">
          {insight.sources.map((source) => (
            <span
              key={source.ref}
              title={source.ref}
              className="rounded border border-line px-1.5 py-0.5 font-mono text-[0.625rem] text-ink-muted"
            >
              {source.label}
            </span>
          ))}
        </p>
      ) : null}
    </article>
  );
}
