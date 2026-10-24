/**
 * Event timeline (FE-04).
 *
 * Renders only what the feed supplied. A null minute is shown as unknown rather
 * than guessed, an event with no team is not attributed to one, and the
 * `source_ref` is surfaced so every line is traceable. Nothing is inferred:
 * there is no "score at minute" calculation and no invented commentary.
 */
import { NotInFeed } from "@/components/ui/States";
import type { MatchDetail, MatchEvent } from "@/lib/api/types";

const KIND_LABELS: Record<MatchEvent["kind"], string> = {
  GOAL: "Goal",
  SUB: "Substitution",
  CARD: "Card",
  OTHER: "Event",
};

function teamName(match: MatchDetail, teamId: string | null): string | null {
  if (!teamId) return null;
  if (teamId === match.home_team.id) return match.home_team.short_name;
  if (teamId === match.away_team.id) return match.away_team.short_name;
  return null;
}

export function EventTimeline({ match }: { readonly match: MatchDetail }) {
  if (!match.data_capabilities.events) {
    return <NotInFeed what="This provider does not supply an event timeline for this match." />;
  }

  if (match.events.length === 0) {
    return (
      <p className="rounded-md border border-line bg-surface-sunken px-3 py-2 text-sm text-ink-muted">
        No events were recorded for this match. The feed supports events, so this means none were
        reported — not that they are missing.
      </p>
    );
  }

  // Events with a known minute first, in order; unknown-minute events after,
  // rather than being silently placed at minute zero.
  const ordered = [...match.events].sort((a, b) => {
    if (a.minute === null && b.minute === null) return 0;
    if (a.minute === null) return 1;
    if (b.minute === null) return -1;
    return a.minute - b.minute;
  });

  return (
    <ol className="space-y-2">
      {ordered.map((event) => {
        const team = teamName(match, event.team_id);
        return (
          <li key={event.id} className="flex gap-3 rounded-md border border-line bg-surface-raised p-3">
            <span
              className="mt-0.5 w-12 shrink-0 font-mono text-sm font-bold tabular-nums text-ink-muted"
              aria-label={event.minute === null ? "Minute unknown" : `Minute ${event.minute}`}
            >
              {event.minute === null ? "—" : `${event.minute}'`}
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-ink">
                {KIND_LABELS[event.kind]}
                {team ? <span className="ml-1.5 font-normal text-ink-muted">· {team}</span> : null}
              </p>
              <p className="text-sm text-ink-muted">{event.description}</p>
              {event.player_name ? (
                <p className="mt-0.5 text-xs text-ink-muted">
                  {event.player_name}
                  {event.related_player_name ? ` → ${event.related_player_name}` : null}
                </p>
              ) : null}
              <p className="mt-1 font-mono text-[0.6875rem] text-ink-muted">ref: {event.source_ref}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
