/**
 * Stadium illumination tokens (FE-05).
 *
 * `illumination_state` is a **backend aggregate**. The map renders it and never
 * recomputes it from fixture status or from browser time — which is the point of
 * the enum: it stays authoritative even when the demo clock is frozen.
 *
 * UNKNOWN deliberately gets a neutral, unresolved look rather than the upcoming
 * glow, because it covers the overdue-but-still-SCHEDULED case where the feed
 * has stopped telling us the truth.
 */
import type { Illumination } from "@/lib/api/types";

export type IlluminationToken = {
  readonly label: string;
  readonly description: string;
  /** CSS custom-property suffix for the marker fill. */
  readonly toneVar: string;
  /** Pulses only for in-play venues; suppressed under reduced motion. */
  readonly animated: boolean;
  /** INACTIVE venues are shown but are not interactive. */
  readonly interactive: boolean;
};

export const ILLUMINATION_TOKENS: Readonly<Record<Illumination, IlluminationToken>> = {
  UPCOMING_ROUND: {
    label: "Upcoming",
    description: "A scheduled fixture is still to be played here.",
    toneVar: "--status-scheduled",
    animated: false,
    interactive: true,
  },
  LIVE: {
    label: "Live",
    description: "A match is in progress at this stadium.",
    toneVar: "--status-live",
    animated: true,
    interactive: true,
  },
  COMPLETED: {
    label: "Completed",
    description: "Every selected fixture here has finished.",
    toneVar: "--status-finished",
    animated: false,
    interactive: true,
  },
  INACTIVE: {
    label: "No fixtures",
    description: "No fixture here in the current selection.",
    toneVar: "--status-unknown",
    animated: false,
    interactive: false,
  },
  POSTPONED_OR_CANCELLED: {
    label: "Disrupted",
    description: "A fixture here was postponed or cancelled, so there is no result.",
    toneVar: "--status-disrupted",
    animated: false,
    interactive: true,
  },
  UNKNOWN: {
    label: "Unresolved",
    description:
      "The source has not reported a usable state, including a fixture still marked scheduled after its kick-off passed.",
    toneVar: "--status-unknown",
    animated: false,
    interactive: true,
  },
};

/** Resolves a backend value, degrading to UNKNOWN rather than guessing. */
export function illuminationToken(state: string): IlluminationToken {
  return ILLUMINATION_TOKENS[state as Illumination] ?? ILLUMINATION_TOKENS.UNKNOWN;
}
