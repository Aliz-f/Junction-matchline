/**
 * Generic inline icons (FE-01).
 *
 * All shapes are original and deliberately plain: no competition crest,
 * league wordmark, broadcaster mark or third-party game artwork. Icons are
 * always `aria-hidden`, because every caller renders a real text label too.
 */
import type { StatusIcon } from "@/lib/design/status";
import type { CompetitionMotif } from "@/lib/design/competitions";

/** `| undefined` is explicit because `exactOptionalPropertyTypes` is on. */
type IconProps = { readonly className?: string | undefined };

const BASE = "h-full w-full";

function Svg({ className, children }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={className ?? BASE}
    >
      {children}
    </svg>
  );
}

const STATUS_PATHS: Record<StatusIcon, React.ReactNode> = {
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  play: <path d="M9 7.5v9l7-4.5-7-4.5z" fill="currentColor" stroke="none" />,
  pause: (
    <>
      <path d="M9.5 7v10" />
      <path d="M14.5 7v10" />
    </>
  ),
  check: <path d="M5 13l4.5 4.5L19 7" />,
  "calendar-off": (
    <>
      <path d="M4 7h16v13H4z" />
      <path d="M8 4v3M16 4v3" />
      <path d="M5 18l14-9" />
    </>
  ),
  ban: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M6 18L18 6" />
    </>
  ),
  alert: (
    <>
      <path d="M12 4l9 16H3z" />
      <path d="M12 10v4" />
      <circle cx="12" cy="17" r="0.6" fill="currentColor" stroke="none" />
    </>
  ),
  question: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.6 9.3a2.5 2.5 0 114 2.1c-.9.7-1.6 1.2-1.6 2.3" />
      <circle cx="12" cy="17" r="0.6" fill="currentColor" stroke="none" />
    </>
  ),
};

export function StatusGlyph({ icon, className }: IconProps & { icon: StatusIcon }) {
  return <Svg className={className}>{STATUS_PATHS[icon]}</Svg>;
}

/** Original competition motifs: a pitch outline, a star, a cup, a plain disc. */
const MOTIF_PATHS: Record<CompetitionMotif, React.ReactNode> = {
  pitch: (
    <>
      <rect x="3.5" y="5.5" width="17" height="13" rx="1.5" />
      <path d="M12 5.5v13" />
      <circle cx="12" cy="12" r="2.6" />
    </>
  ),
  star: <path d="M12 4.5l2.3 4.9 5.2.7-3.8 3.6 1 5.2-4.7-2.6-4.7 2.6 1-5.2L4.5 10l5.2-.7z" />,
  cup: (
    <>
      <path d="M8 5h8v4a4 4 0 01-8 0z" />
      <path d="M8 6.5H6a2 2 0 002 2M16 6.5h2a2 2 0 01-2 2" />
      <path d="M12 13v4M9 19.5h6" />
    </>
  ),
  neutral: <circle cx="12" cy="12" r="7" />,
};

export function CompetitionGlyph({ motif, className }: IconProps & { motif: CompetitionMotif }) {
  return <Svg className={className}>{MOTIF_PATHS[motif]}</Svg>;
}

const NAV_PATHS = {
  journey: (
    <>
      <path d="M7 20c0-3 10-3 10-8s-8-3-8-6" />
      <circle cx="7" cy="20" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="9" cy="6" r="1.4" fill="currentColor" stroke="none" />
    </>
  ),
  matches: (
    <>
      <rect x="3.5" y="5" width="17" height="14" rx="2" />
      <path d="M3.5 9.5h17" />
      <path d="M8 13h8M8 16h5" />
    </>
  ),
  map: (
    <>
      <path d="M12 21s6-5.3 6-10a6 6 0 10-12 0c0 4.7 6 10 6 10z" />
      <circle cx="12" cy="11" r="2.2" />
    </>
  ),
  impact: (
    <>
      <path d="M4 19h16" />
      <path d="M7 19v-6M12 19V7M17 19v-9" />
    </>
  ),
  community: (
    <>
      <path d="M4 18v-1a4 4 0 014-4h2a4 4 0 014 4v1" />
      <circle cx="9" cy="8" r="3" />
      <path d="M16 13.5a3.5 3.5 0 014 3.3V18" />
      <circle cx="16.5" cy="8.5" r="2.2" />
    </>
  ),
  profile: (
    <>
      <circle cx="12" cy="8.5" r="3.5" />
      <path d="M5.5 19.5a6.5 6.5 0 0113 0" />
    </>
  ),
} as const;

export type NavIcon = keyof typeof NAV_PATHS;

export function NavGlyph({ icon, className }: IconProps & { icon: NavIcon }) {
  return <Svg className={className}>{NAV_PATHS[icon]}</Svg>;
}
