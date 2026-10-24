/**
 * FE-01 match-status tokens.
 *
 * Status controls icon, ring, animation and textual label ONLY, so status is
 * never conveyed by competition colour alone (FE-01 acceptance). Every status
 * carries a real text label, which is what assistive technology and
 * reduced-motion users rely on instead of the animation.
 *
 * Covers all eight A1 `MatchStatus` values, including SUSPENDED and UNKNOWN,
 * which the BE-00 edge corpus does not yet exercise (gap G8 in FE00_HANDOFF).
 */
import type { MatchStatus } from "@/lib/api/types";

/** Generic icon names; no competition or broadcaster iconography. */
export type StatusIcon = "clock" | "play" | "pause" | "check" | "calendar-off" | "ban" | "alert" | "question";

export type StatusToken = {
  /** Human-readable label. Always rendered as text, never icon-only. */
  readonly label: string;
  /** Longer description used for `title`/screen-reader context. */
  readonly description: string;
  readonly icon: StatusIcon;
  /** Pulse is suppressed under `prefers-reduced-motion`; the label remains. */
  readonly animated: boolean;
  /** CSS custom-property suffix resolved in `app/globals.css`. */
  readonly toneVar: string;
  /** True when the fixture reports no trustworthy result to display. */
  readonly withoutResult: boolean;
};

export const STATUS_TOKENS: Readonly<Record<MatchStatus, StatusToken>> = {
  SCHEDULED: {
    label: "Scheduled",
    description: "Kick-off has not happened yet.",
    icon: "clock",
    animated: false,
    toneVar: "--status-scheduled",
    withoutResult: true,
  },
  LIVE: {
    label: "Live",
    description: "The match is in progress; the score may still change.",
    icon: "play",
    animated: true,
    toneVar: "--status-live",
    withoutResult: false,
  },
  HALFTIME: {
    label: "Half-time",
    description: "The match is paused at half-time.",
    icon: "pause",
    animated: true,
    toneVar: "--status-halftime",
    withoutResult: false,
  },
  FINISHED: {
    label: "Finished",
    description: "The match is complete and the score is confirmed.",
    icon: "check",
    animated: false,
    toneVar: "--status-finished",
    withoutResult: false,
  },
  POSTPONED: {
    label: "Postponed",
    description: "The match was postponed; there is no result.",
    icon: "calendar-off",
    animated: false,
    toneVar: "--status-disrupted",
    withoutResult: true,
  },
  CANCELLED: {
    label: "Cancelled",
    description: "The match was cancelled; there is no result.",
    icon: "ban",
    animated: false,
    toneVar: "--status-disrupted",
    withoutResult: true,
  },
  SUSPENDED: {
    label: "Suspended",
    description: "The match was suspended after kick-off; any score is provisional.",
    icon: "alert",
    animated: false,
    toneVar: "--status-disrupted",
    withoutResult: false,
  },
  UNKNOWN: {
    label: "Status unknown",
    description: "The source did not report a usable status for this match.",
    icon: "question",
    animated: false,
    toneVar: "--status-unknown",
    withoutResult: true,
  },
};

/**
 * Resolves a status the backend reported. An unrecognised value degrades to
 * UNKNOWN rather than being presented as SCHEDULED (FE-03 acceptance:
 * "UNKNOWN not silently scheduled").
 */
export function statusToken(status: string): StatusToken {
  return STATUS_TOKENS[status as MatchStatus] ?? STATUS_TOKENS.UNKNOWN;
}
