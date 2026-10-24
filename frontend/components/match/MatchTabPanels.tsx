/**
 * Tab panel contents (FE-04).
 *
 * Every panel is now real: Overview and Events here, and Discuss, Predict,
 * Impact and What-if delegated to the components FE-07, FE-08, FE-06 and FE-09
 * own. A panel only renders when the backend says the section applies to this
 * match, which `matchTabs.ts` decides.
 */
import { EventTimeline } from "./EventTimeline";
import { MatchImpactPanel } from "@/components/impact/MatchImpactPanel";
import { MatchRoomsPanel } from "@/components/community/MatchRoomsPanel";
import { PredictionPanel } from "@/components/prediction/PredictionPanel";
import { WhatifPanel } from "@/components/whatif/WhatifPanel";
import { NotInFeed } from "@/components/ui/States";
import type { MatchTab } from "./matchTabs";
import type { MatchDetail } from "@/lib/api/types";

function Overview({ match }: { readonly match: MatchDetail }) {
  const pre = match.status === "SCHEDULED";
  const inPlay = match.status === "LIVE" || match.status === "HALFTIME";
  const finished = match.status === "FINISHED";

  return (
    <div className="space-y-4">
      {pre ? (
        <p className="text-sm text-ink-muted">
          This match has not kicked off. Predictions stay open until the server-authoritative
          kick-off time, and the pre-match room closes to new posts at the same moment.
        </p>
      ) : null}

      {inPlay ? (
        <p className="text-sm text-ink-muted">
          The match is in progress. The score above is what the source last reported and may change.
          Predictions are closed, and What-if analysis only opens once the result is confirmed.
        </p>
      ) : null}

      {finished ? (
        <p className="text-sm text-ink-muted">
          The result is confirmed. The pre-match room stays readable as an archive, and post-match
          What-if analysis is available.
        </p>
      ) : null}

      <div>
        <h3 className="text-sm font-semibold text-ink">Match statistics</h3>
        <div className="mt-2">
          {match.statistics === null ? (
            <NotInFeed what="This provider does not supply match statistics, so none are shown rather than estimated." />
          ) : (
            <pre className="overflow-x-auto rounded-md bg-surface-sunken p-3 text-xs text-ink">
              {JSON.stringify(match.statistics, null, 2)}
            </pre>
          )}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-ink">Line-ups</h3>
        <div className="mt-2">
          {match.lineups === null ? (
            <NotInFeed what="This provider does not supply line-ups or player-level detail for this match." />
          ) : (
            <pre className="overflow-x-auto rounded-md bg-surface-sunken p-3 text-xs text-ink">
              {JSON.stringify(match.lineups, null, 2)}
            </pre>
          )}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-ink">What this feed provides</h3>
        <ul className="mt-2 flex flex-wrap gap-1.5 text-xs">
          {(
            [
              ["Events", match.data_capabilities.events],
              ["Line-ups", match.data_capabilities.lineups],
              ["Player stats", match.data_capabilities.player_stats],
            ] as const
          ).map(([label, available]) => (
            <li
              key={label}
              className="rounded border border-line px-2 py-1 text-ink-muted"
            >
              {label}: <span className="font-semibold text-ink">{available ? "yes" : "no"}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export function MatchTabPanel({ tab, match }: { readonly tab: MatchTab; readonly match: MatchDetail }) {
  switch (tab) {
    case "overview":
      return <Overview match={match} />;

    case "events":
      return <EventTimeline match={match} />;

    case "discuss":
      return <MatchRoomsPanel matchId={match.id} />;

    case "predict":
      return <PredictionPanel match={match} />;

    case "impact":
      return <MatchImpactPanel matchId={match.id} />;

    case "whatif":
      return <WhatifPanel match={match} />;

    default:
      return null;
  }
}
