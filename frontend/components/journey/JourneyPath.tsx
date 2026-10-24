/**
 * The winding Journey board (FE-03).
 *
 * A serpentine trail down the page with one circular node per match: the
 * progress-map *layout* of a match-three game, drawn entirely from original
 * shapes. No proprietary artwork, tile, character or decorative asset is
 * reproduced.
 *
 * Accessibility is why the structure looks the way it does: the trail is a
 * single `aria-hidden` SVG sitting **behind** an ordinary `<ol>` of links in
 * chronological DOM order. Screen readers and keyboard users get a plain
 * ordered list; the board is presentation only.
 *
 * Geometry is computed, not hand-placed, so any number of fixtures lays out
 * correctly and the trail always joins the node centres.
 */
import { JourneyNode } from "./JourneyNode";
import type { MatchSummary } from "@/lib/api/types";

type Props = {
  readonly matches: readonly MatchSummary[];
  readonly teamId: string | null;
  /** Server clock. Picks the next upcoming fixture; never a local clock. */
  readonly serverNowUtc: string | null;
};

/** Vertical spacing per node, in pixels. */
const ROW = 184;
/** Horizontal swing either side of centre, as a percentage of board width. */
const SWING = 26;

/**
 * Node centre for index `i`.
 *
 * `sin(i · π/2)` gives the repeating centre → right → centre → left pattern
 * that makes the trail read as a winding route rather than a zigzag.
 */
export function nodePosition(index: number): { xPercent: number; yPx: number } {
  return {
    xPercent: 50 + SWING * Math.sin((index * Math.PI) / 2),
    yPx: ROW / 2 + index * ROW,
  };
}

/**
 * The first fixture that has not kicked off according to the **server** clock.
 *
 * Deliberately not `Date.now()`: in DEMO the clock is frozen, and the local
 * machine's time must not promote a SCHEDULED match or move the centred node.
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

/**
 * Smooth trail through every node centre.
 *
 * Cubic segments with vertical control handles, so the curve leaves and enters
 * each node straight down — that is what stops it looking like a zigzag.
 */
export function trailPath(count: number): string {
  if (count === 0) return "";
  const first = nodePosition(0);
  if (count === 1) return `M ${first.xPercent} ${first.yPx}`;

  let path = `M ${first.xPercent} ${first.yPx}`;
  for (let i = 0; i < count - 1; i += 1) {
    const from = nodePosition(i);
    const to = nodePosition(i + 1);
    const lift = ROW * 0.5;
    path += ` C ${from.xPercent} ${from.yPx + lift}, ${to.xPercent} ${to.yPx - lift}, ${to.xPercent} ${to.yPx}`;
  }
  return path;
}

export function JourneyPath({ matches, teamId, serverNowUtc }: Props) {
  const nextId = nextUpcomingId(matches, serverNowUtc);
  const height = Math.max(matches.length, 1) * ROW;
  const path = trailPath(matches.length);

  return (
    <div className="relative mx-auto w-full max-w-sm sm:max-w-md" style={{ height }}>
      {/*
        Decorative trail. `preserveAspectRatio="none"` lets the 0–100 x space
        stretch to the board width while `vectorEffect` keeps stroke widths
        constant, so the route looks the same at every size.
      */}
      <svg
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 h-full w-full"
        viewBox={`0 0 100 ${height}`}
        preserveAspectRatio="none"
        fill="none"
      >
        {/* The road. */}
        <path
          d={path}
          stroke="rgb(var(--surface-sunken))"
          strokeWidth="18"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
        {/* Its edge, for definition against the page. */}
        <path
          d={path}
          stroke="rgb(var(--line))"
          strokeWidth="19"
          strokeLinecap="round"
          strokeOpacity="0.5"
          vectorEffect="non-scaling-stroke"
          style={{ mixBlendMode: "multiply" }}
        />
        {/* Dashed centre line, like a route marker. */}
        <path
          d={path}
          stroke="rgb(var(--line))"
          strokeWidth="2"
          strokeDasharray="6 10"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>

      <ol className="absolute inset-0">
        {matches.map((match, index) => {
          const { xPercent, yPx } = nodePosition(index);
          return (
            <li
              key={match.id}
              className="absolute flex -translate-x-1/2 -translate-y-1/2 justify-center"
              style={{ left: `${xPercent}%`, top: yPx }}
            >
              <JourneyNode
                match={match}
                teamId={teamId}
                isNext={match.id === nextId}
                side={index % 2 === 0 ? "left" : "right"}
              />
            </li>
          );
        })}
      </ol>
    </div>
  );
}
