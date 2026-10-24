/**
 * Match detail screen (FE-04).
 *
 * Tabs are real links carrying `?tab=`, not client-only state, so a deep link
 * survives a refresh, can be shared, and works with the back button. The tab
 * set comes from the backend's `features` and `data_capabilities`; a request for
 * a tab this match does not have falls back to Overview *with an explanation*
 * rather than silently redirecting.
 */
"use client";

import Link from "next/link";
import { useMatch } from "@/lib/api/hooks";
import { ApiError } from "@/lib/api/client";
import { ErrorState, SkeletonList } from "@/components/ui/States";
import { MatchHeader } from "./MatchHeader";
import { MatchTabPanel } from "./MatchTabPanels";
import { TAB_LABELS, availableTabs, resolveTab, unavailableReason, type MatchTab } from "./matchTabs";

type Props = {
  readonly matchId: string;
  readonly requestedTab: MatchTab;
};

export function MatchDetailScreen({ matchId, requestedTab }: Props) {
  const query = useMatch(matchId);

  if (query.isLoading) return <SkeletonList rows={4} />;

  if (query.isError) {
    const error = query.error;
    const isMissing = error instanceof ApiError && error.status === 404;

    return (
      <ErrorState
        title={isMissing ? "Match not found" : "Could not load this match"}
        description={
          isMissing
            ? "No match exists with that id. The link may be out of date."
            : error instanceof ApiError && !error.conformed
              ? "The server replied in a shape this build does not recognise. That is a contract mismatch, not a connection problem."
              : "The request failed. Nothing was changed."
        }
        envelope={error instanceof ApiError ? error.envelope : null}
        {...(isMissing ? {} : { onRetry: () => void query.refetch() })}
      />
    );
  }

  const match = query.data;
  if (!match) return null;

  const tabs = availableTabs(match);
  const { tab, unavailable } = resolveTab(match, requestedTab);

  return (
    <div className="space-y-6">
      <MatchHeader match={match} />

      {/*
        Tabs as links. `aria-current` marks the active one, so the state is not
        carried by colour alone.
      */}
      <nav aria-label="Match sections" className="border-b border-line">
        <ul className="-mb-px flex flex-wrap gap-1 overflow-x-auto">
          {tabs.map((candidate) => {
            const isActive = candidate === tab;
            return (
              <li key={candidate}>
                <Link
                  href={`/matches/${match.id}?tab=${candidate}`}
                  scroll={false}
                  aria-current={isActive ? "page" : undefined}
                  className={[
                    "inline-block border-b-2 px-3 py-2 text-sm font-semibold transition-colors",
                    isActive
                      ? "border-ink text-ink"
                      : "border-transparent text-ink-muted hover:border-line hover:text-ink",
                  ].join(" ")}
                >
                  {TAB_LABELS[candidate]}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {unavailable ? (
        <p role="status" className="rounded-md border border-line bg-surface-sunken px-3 py-2 text-sm text-ink-muted">
          <span className="font-semibold text-ink">{TAB_LABELS[unavailable]} is not available.</span>{" "}
          {unavailableReason(match, unavailable)}
        </p>
      ) : null}

      <section aria-label={TAB_LABELS[tab]}>
        <MatchTabPanel tab={tab} match={match} />
      </section>
    </div>
  );
}
