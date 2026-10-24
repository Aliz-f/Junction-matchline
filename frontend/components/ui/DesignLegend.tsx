/**
 * Status and competition legend (FE-01).
 *
 * Doubles as the readable status legend FE-03 requires and as live proof that
 * the two scales are independent: the same competition accent is shown against
 * several statuses, and the same status against several competitions, so colour
 * alone never identifies state.
 */
import { MatchStatus } from "@/lib/api/contract";
import { competitionToken } from "@/lib/design/competitions";
import { StatusIndicator } from "./StatusIndicator";
import { CompetitionBadge } from "./CompetitionBadge";
import { statusToken } from "@/lib/design/status";

const BRAND_KEYS = ["pl_demo", "ucl_demo", "facup_demo", "unmapped_competition"] as const;

export function DesignLegend() {
  return (
    <section aria-labelledby="legend-heading" className="space-y-6">
      <div>
        <h2 id="legend-heading" className="text-lg font-bold text-ink">
          Status and competition legend
        </h2>
        <p className="mt-1 max-w-prose text-sm text-ink-muted">
          Competition controls colour and motif. Status controls icon, tone, animation and label. The two are read
          separately, and every status carries text, so neither colour nor motion is ever the only signal.
        </p>
      </div>

      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Match status</h3>
        <ul className="mt-2 grid gap-2 sm:grid-cols-2">
          {MatchStatus.options.map((status) => {
            const token = statusToken(status);
            return (
              <li
                key={status}
                className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md border border-line bg-surface-raised px-3 py-2"
              >
                <StatusIndicator status={status} variant="compact" />
                <span className="min-w-0 flex-1 text-xs text-ink-muted">{token.description}</span>
              </li>
            );
          })}
        </ul>
      </div>

      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Competition</h3>
        <ul className="mt-2 flex flex-wrap gap-2">
          {BRAND_KEYS.map((brandKey) => (
            <li key={brandKey}>
              <CompetitionBadge brandKey={brandKey} />
            </li>
          ))}
        </ul>
        <p className="mt-2 max-w-prose text-xs text-ink-muted">
          Only the Premier League exists in the frozen demo manifest. The cup tokens are styling only — no fixture is
          ever invented to populate them, and an unrecognised competition renders the neutral token shown last.
        </p>
      </div>

      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
          Independence check: one competition, many statuses
        </h3>
        <ul className="mt-2 flex flex-wrap items-center gap-2">
          {(["SCHEDULED", "LIVE", "FINISHED", "CANCELLED"] as const).map((status) => (
            <li
              key={status}
              className="flex items-center gap-2 rounded-md border border-line bg-surface-raised px-2 py-1.5"
              style={{ borderLeftWidth: 4, borderLeftColor: `rgb(var(${competitionToken("pl_demo").accentVar}))` }}
            >
              <CompetitionBadge brandKey="pl_demo" />
              <StatusIndicator status={status} variant="compact" />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
