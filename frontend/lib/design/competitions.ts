/**
 * FE-01 competition visual tokens.
 *
 * Competition identity controls colour and motif ONLY. It never encodes match
 * status: see `lib/design/status.ts`. Keys are manifest `brand_key` values, so
 * a competition the manifest does not describe falls back to a neutral token
 * instead of borrowing another competition's identity.
 *
 * Motifs are original generic shapes. No licensed competition logo, crest or
 * wordmark is reproduced here (AGENTS.md section 5).
 */

/** Original, non-licensed motif shapes drawn as inline SVG. */
export type CompetitionMotif = "pitch" | "star" | "cup" | "neutral";

export type CompetitionToken = {
  /** Stable token id, used for `data-competition` and CSS custom properties. */
  readonly key: string;
  /** Accessible short label shown next to the motif. */
  readonly label: string;
  readonly motif: CompetitionMotif;
  /** CSS custom-property suffix resolved in `app/globals.css`. */
  readonly accentVar: string;
};

const NEUTRAL: CompetitionToken = {
  key: "neutral",
  label: "Other competition",
  motif: "neutral",
  accentVar: "--competition-neutral",
};

/**
 * Only `pl_demo` exists in the frozen BE-00 manifest. The cup tokens are
 * declared so FE-03 can style a competition the backend later reports, but no
 * fixture is ever fabricated to populate them (FE-03 acceptance).
 */
const TOKENS: Readonly<Record<string, CompetitionToken>> = {
  pl_demo: { key: "pl", label: "Premier League", motif: "pitch", accentVar: "--competition-pl" },
  ucl_demo: { key: "ucl", label: "Champions League", motif: "star", accentVar: "--competition-ucl" },
  facup_demo: { key: "facup", label: "FA Cup", motif: "cup", accentVar: "--competition-facup" },
};

/** Resolves a manifest `brand_key` to its visual token, never throwing. */
export function competitionToken(brandKey: string | null | undefined): CompetitionToken {
  if (!brandKey) return NEUTRAL;
  return TOKENS[brandKey] ?? NEUTRAL;
}

/** Competition groupings behind the FE-03 All / League / Cup filter. */
export const COMPETITION_GROUPS = ["ALL", "LEAGUE", "CUP"] as const;
export type CompetitionGroup = (typeof COMPETITION_GROUPS)[number];

const GROUP_BY_KEY: Readonly<Record<string, CompetitionGroup>> = {
  pl: "LEAGUE",
  ucl: "CUP",
  facup: "CUP",
};

export function competitionGroup(token: CompetitionToken): CompetitionGroup | null {
  return GROUP_BY_KEY[token.key] ?? null;
}
