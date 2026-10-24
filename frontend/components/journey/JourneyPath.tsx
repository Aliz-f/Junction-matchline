/**
 * The winding match path (FE-03).
 *
 * Candy-Crush-*inspired* only: a meandering vertical route with one node per
 * match. None of the artwork is copied — the path is a single generated SVG
 * curve and the nodes are plain shapes from our own icon set.
 *
 * Structure matters for accessibility: the decorative curve is an `aria-hidden`
 * SVG positioned *behind* an ordinary `<ol>` of links, so screen readers and
 * keyboard users get a plain ordered list of matches in chronological order.
 */
import { MatchNode } from "./MatchNode";
import type { MatchSummary } from "@/lib/api/types";

type Props = {
  readonly matches: readonly MatchSummary[];
  readonly teamId: string | null;
  /** Server clock. Used to pick the next upcoming fixture, never a local clock. */
  readonly serverNowUtc: string | null;
};

/**
 * The first fixture that has not kicked off according to the **server** clock.
 *
 * Deliberately not `Date.now()`: in DEMO the clock is frozen, and the local
 * machine's time must not promote a SCHEDULED match or shift the centred node.
 */
export function nextUpcomingId(
  matches: readonly MatchSummary[],
  serverNowUtc: string | null,
): string | null {
  if (!serverNowUtc) return null;
  const now = Date.parse(serverNowUtc);
  if (Number.isNaN(now)) return null;

  const upcoming = matches
    .filter((match) => Date.parse(match.kickoff_at) > now)
    .sort((a, b) => Date.parse(a.kickoff_at) - Date.parse(b.kickoff_at));

  return upcoming[0]?.id ?? null;
}

export function JourneyPath({ matches, teamId, serverNowUtc }: Props) {
  const nextId = nextUpcomingId(matches, serverNowUtc);

  return (
    <div className="relative">
      {/*
        Decorative connector. On small screens it is a straight rail down the
        left; from `sm` it is the winding centre line. Purely visual.
      */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div
          className="absolute bottom-0 left-4 top-0 w-1 -translate-x-1/2 rounded bg-surface-sunken sm:hidden"
        />
        <svg
          className="absolute inset-0 hidden h-full w-full sm:block"
          preserveAspectRatio="none"
          viewBox="0 0 100 1000"
          fill="none"
        >
          <path
            d={wavePath(Math.max(matches.length, 1))}
            stroke="rgb(var(--line))"
            strokeWidth="1.2"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      </div>

      <ol className="relative space-y-5">
        {matches.map((match, index) => (
          <MatchNode
            key={match.id}
            match={match}
            teamId={teamId}
            isNext={match.id === nextId}
            side={index % 2 === 0 ? "left" : "right"}
          />
        ))}
      </ol>
    </div>
  );
}

/**
 * Builds a gentle S-curve down the centre, one bend per node.
 *
 * The `viewBox` is a fixed 0–1000 and stretched by `preserveAspectRatio="none"`,
 * so the curve always spans the real list height whatever that turns out to be.
 */
function wavePath(nodeCount: number): string {
  const segment = 1000 / nodeCount;
  let path = `M 50 0`;
  for (let i = 0; i < nodeCount; i += 1) {
    const y = segment * (i + 1);
    const controlX = i % 2 === 0 ? 86 : 14;
    path += ` Q ${controlX} ${y - segment / 2} 50 ${y}`;
  }
  return path;
}
