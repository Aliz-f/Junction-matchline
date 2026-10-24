/**
 * Tab panel contents (FE-04).
 *
 * Overview and Events are real here. Discuss, Predict, Impact and What-if are
 * delivered by FE-07, FE-08, FE-06 and FE-09 respectively, so each states what
 * it will hold and which endpoints it needs — but only when the backend says
 * the section applies to this match, so the tab set itself is already correct.
 */
import Link from "next/link";
import { EventTimeline } from "./EventTimeline";
import { PlannedSurface } from "@/components/ui/PlannedSurface";
import { NotInFeed } from "@/components/ui/States";
import { DemoAiBadge } from "@/components/ui/SourceBadge";
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
      return (
        <PlannedSurface
          task="FE-07"
          gate="G2"
          title={match.status === "FINISHED" ? "Match rooms, including the pre-match archive" : "Pre-match room"}
          summary="The message feed with incremental sync, server-decided posting rights, the kick-off cutoff, reporting and moderation. A room that has closed is shown read-only rather than as a failed post."
          needs={["GET /matches/{id}/rooms", "GET /rooms/{id}/messages", "GET /rooms/{id}/changes"]}
        />
      );

    case "predict":
      return (
        <PlannedSurface
          task="FE-08"
          gate="G3"
          title="Prediction entry"
          summary="Pick an outcome with an optional exact score, editable until the server-authoritative kick-off. Scoring is settled deterministically afterwards; the server's cutoff always wins over anything the page believes."
          needs={["GET /matches/{id}/predictions/me", "POST /matches/{id}/predictions"]}
        />
      );

    case "impact":
      return (
        <PlannedSurface
          task="FE-06"
          gate="G2"
          title="What this result means for your club"
          summary="Points-gap effects per affected team, with hypothetical outcomes before the match and one confirmed case afterwards when trustworthy standings snapshots exist. No position is asserted without full tiebreaks."
          needs={["GET /matches/{id}/impact", "GET /standings"]}
        />
      );

    case "whatif":
      return (
        <div className="space-y-3">
          <p className="flex flex-wrap items-center gap-2 text-sm text-ink-muted">
            <DemoAiBadge />
            <span>
              Private, multi-turn post-match analysis. Conclusions are reasoned arguments about an
              alternative scenario — they are never verifiable results.
            </span>
          </p>
          <PlannedSurface
            task="FE-09"
            gate="G4"
            title="Private What-if analysis"
            summary="Put a hypothesis to the AI and get supporting and conflicting verified evidence back, with its uncertainty stated. Threads are private to you, multi-turn, and never published."
            needs={["POST /matches/{id}/whatif/threads", "POST /whatif/threads/{id}/messages"]}
          />
          <p className="text-xs text-ink-muted">
            Your threads are listed on your{" "}
            <Link href="/profile" className="font-semibold text-ink underline">
              profile
            </Link>{" "}
            once FE-09 lands.
          </p>
        </div>
      );

    default:
      return null;
  }
}
