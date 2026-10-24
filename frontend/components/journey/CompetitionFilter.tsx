/**
 * All / League / Cup filter (FE-03).
 *
 * A group with no fixtures is shown **disabled with its count**, not hidden and
 * not silently empty. Only the Premier League exists in the current data set, so
 * the Cup tab explains that rather than implying cup fixtures are being
 * withheld — and no fixture is ever fabricated to populate it.
 */
"use client";

import { COMPETITION_GROUPS, type CompetitionGroup } from "@/lib/design/competitions";

const LABELS: Record<CompetitionGroup, string> = {
  ALL: "All",
  LEAGUE: "League",
  CUP: "Cup",
};

type Props = {
  readonly value: CompetitionGroup;
  readonly onChange: (group: CompetitionGroup) => void;
  readonly counts: Record<CompetitionGroup, number>;
};

export function CompetitionFilter({ value, onChange, counts }: Props) {
  return (
    <div>
      <div role="group" aria-label="Filter by competition" className="flex flex-wrap gap-1.5">
        {COMPETITION_GROUPS.map((group) => {
          const count = counts[group];
          const unavailable = count === 0;
          const isActive = value === group;

          return (
            <button
              key={group}
              type="button"
              onClick={() => onChange(group)}
              disabled={unavailable}
              aria-pressed={isActive}
              title={unavailable ? `No ${LABELS[group].toLowerCase()} fixtures in the current data set` : undefined}
              className={[
                "rounded-md border px-3 py-1.5 text-sm font-semibold transition-colors",
                "disabled:cursor-not-allowed disabled:opacity-50",
                isActive ? "border-ink bg-surface-sunken text-ink" : "border-line text-ink-muted hover:text-ink",
              ].join(" ")}
            >
              {LABELS[group]}
              <span className="ml-1.5 font-mono text-xs tabular-nums text-ink-muted">{count}</span>
            </button>
          );
        })}
      </div>

      {counts.CUP === 0 ? (
        <p className="mt-1.5 text-xs text-ink-muted">
          The current data set covers the Premier League only, so there are no cup fixtures to show.
        </p>
      ) : null}
    </div>
  );
}
