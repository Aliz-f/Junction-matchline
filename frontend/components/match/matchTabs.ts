/**
 * Which match tabs exist, and when (FE-04).
 *
 * Availability is decided by the backend's `features` flags and
 * `data_capabilities`, plus the authoritative `status` — never by guessing from
 * the clock or from the presence of data. Keeping this as a pure function means
 * the rules are testable and the UI has only one place to get them wrong.
 *
 * The What-if tab is the one with a hard safety rule: it must not appear before
 * a match is authoritatively FINISHED, so a deep link to `?tab=whatif` on a
 * scheduled match is refused rather than rendered.
 */
import type { MatchDetail } from "@/lib/api/types";

export const MATCH_TABS = ["overview", "events", "discuss", "predict", "impact", "whatif"] as const;
export type MatchTab = (typeof MATCH_TABS)[number];

export const TAB_LABELS: Record<MatchTab, string> = {
  overview: "Overview",
  events: "Events",
  discuss: "Discuss",
  predict: "Predict",
  impact: "Impact",
  whatif: "What-if",
};

export function isMatchTab(value: string | null | undefined): value is MatchTab {
  return MATCH_TABS.includes((value ?? "") as MatchTab);
}

/** Parses `?tab=`, falling back to overview for anything unrecognised. */
export function parseTab(raw: string | string[] | undefined): MatchTab {
  const value = Array.isArray(raw) ? raw[0] : raw;
  return isMatchTab(value) ? value : "overview";
}

export function availableTabs(match: MatchDetail): MatchTab[] {
  const tabs: MatchTab[] = ["overview"];

  // The feed says whether event data exists for this match at all. An empty
  // timeline with the capability set is a legitimate "no events recorded".
  if (match.data_capabilities.events) tabs.push("events");

  // Room existence, not posting rights (`can_post` governs writing).
  if (match.features.pre_match_room || match.features.post_match_room) tabs.push("discuss");

  if (match.features.predictions_open) tabs.push("predict");

  // Impact is a property of the fixture, available in every state.
  tabs.push("impact");

  // Hard rule: post-match analysis only, and only when the backend says so.
  if (match.features.whatif_available) tabs.push("whatif");

  return tabs;
}

/**
 * Resolves the tab actually shown.
 *
 * Returns the requested tab when it is available, otherwise overview plus the
 * reason, so a stale or hand-edited link gets an explanation instead of
 * silently landing somewhere else.
 */
export function resolveTab(
  match: MatchDetail,
  requested: MatchTab,
): { tab: MatchTab; unavailable: MatchTab | null } {
  const tabs = availableTabs(match);
  if (tabs.includes(requested)) return { tab: requested, unavailable: null };
  return { tab: "overview", unavailable: requested };
}

/** Why a requested tab is not available, phrased for the reader. */
export function unavailableReason(match: MatchDetail, tab: MatchTab): string {
  switch (tab) {
    case "whatif":
      return "What-if analysis opens once the match is finished and the result is confirmed.";
    case "predict":
      return match.status === "SCHEDULED"
        ? "Predictions for this match are closed."
        : "Predictions close at kick-off, so they are no longer open for this match.";
    case "discuss":
      return "This match has no discussion room yet.";
    case "events":
      return "This feed does not provide an event timeline for this match.";
    default:
      return "That section is not available for this match.";
  }
}
