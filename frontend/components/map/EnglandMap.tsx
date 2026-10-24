/**
 * Illustrated England map (FE-05).
 *
 * An inline SVG landmass rather than a tile map: Phase 1 is one English
 * competition, so a world map with everything outside England greyed out was
 * showing far more than the product needs. This draws England alone on the page
 * background, in the style of an illustrated poster map.
 *
 * The geography is real. The outline is generated from public-domain Natural
 * Earth data (`lib/geo/england.ts`) and venue markers are placed with the same
 * Web Mercator projection used to build it, so a verified coordinate lands
 * where it actually is — no decorative repositioning.
 *
 * Grounds are drawn as an original stadium glyph. No club crest or competition
 * logo appears anywhere (AGENTS.md section 5).
 *
 * Accessibility: this whole figure is `aria-hidden`. The venue list beside it is
 * the canonical representation and carries every fixture, so nothing is lost to
 * a screen reader, and there are no tiles to fail.
 */
"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { ENGLAND_PATHS, ENGLAND_VIEWBOX, projectToEngland } from "@/lib/geo/england";
import { illuminationToken } from "@/lib/design/illumination";
import type { StadiumMapResponse } from "@/lib/api/types";

type Venue = StadiumMapResponse["stadiums"][number];

type Props = {
  readonly stadiums: readonly Venue[];
  readonly favoriteTeamId: string | null;
  readonly onSelect: (venueId: string) => void;
  readonly selectedVenueId: string | null;
};

/** Depth of the extruded edge under the landmass, in viewBox units. */
const EXTRUDE = 22;
const MIN_ZOOM = 1;
const MAX_ZOOM = 5;

export function EnglandMap({ stadiums, favoriteTeamId, onSelect, selectedVenueId }: Props) {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const drag = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null);

  const { width, height } = ENGLAND_VIEWBOX;

  // Panning is expressed in viewBox units so it is zoom-independent.
  const viewBox = useMemo(() => {
    const w = width / zoom;
    const h = (height + EXTRUDE) / zoom;
    const x = (width - w) / 2 + pan.x;
    const y = (height + EXTRUDE - h) / 2 + pan.y;
    return `${x} ${y} ${w} ${h}`;
  }, [zoom, pan, width, height]);

  const clampPan = useCallback(
    (next: { x: number; y: number }, atZoom: number) => {
      // Keep the landmass from being dragged entirely out of view.
      const limitX = (width - width / atZoom) / 2;
      const limitY = (height + EXTRUDE - (height + EXTRUDE) / atZoom) / 2;
      return {
        x: Math.max(-limitX, Math.min(limitX, next.x)),
        y: Math.max(-limitY, Math.min(limitY, next.y)),
      };
    },
    [width, height],
  );

  function changeZoom(next: number) {
    const clamped = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, next));
    setZoom(clamped);
    setPan((previous) => clampPan(previous, clamped));
  }

  function onPointerDown(event: React.PointerEvent<SVGSVGElement>) {
    if (zoom === 1) return;
    drag.current = { x: event.clientX, y: event.clientY, panX: pan.x, panY: pan.y };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function onPointerMove(event: React.PointerEvent<SVGSVGElement>) {
    const start = drag.current;
    if (!start) return;
    const rect = event.currentTarget.getBoundingClientRect();
    // Convert pixel movement into viewBox units at the current zoom.
    const perPixel = width / zoom / rect.width;
    setPan(
      clampPan(
        {
          x: start.panX - (event.clientX - start.x) * perPixel,
          y: start.panY - (event.clientY - start.y) * perPixel,
        },
        zoom,
      ),
    );
  }

  function endDrag() {
    drag.current = null;
  }

  return (
    <div className="relative">
      <svg
        viewBox={viewBox}
        className="matchline-england h-[30rem] w-full touch-none select-none"
        role="presentation"
        aria-hidden="true"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        style={{ cursor: zoom > 1 ? "grab" : "default" }}
      >
        <defs>
          <linearGradient id="ml-land" x1="0" y1="0" x2="0.3" y2="1">
            <stop offset="0%" stopColor="#8fcf7a" />
            <stop offset="45%" stopColor="#6fb95e" />
            <stop offset="100%" stopColor="#4e9a48" />
          </linearGradient>
          <linearGradient id="ml-side" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6b4f32" />
            <stop offset="100%" stopColor="#4a3521" />
          </linearGradient>
          <radialGradient id="ml-sheen" cx="0.35" cy="0.25" r="0.75">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </radialGradient>
          <filter id="ml-shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="10" stdDeviation="12" floodColor="#0f172a" floodOpacity="0.28" />
          </filter>
        </defs>

        {/* Extruded side, giving the landmass thickness. */}
        <g filter="url(#ml-shadow)">
          {ENGLAND_PATHS.map((d, index) => (
            <path key={`side-${index}`} d={d} fill="url(#ml-side)" transform={`translate(0 ${EXTRUDE})`} />
          ))}
          {ENGLAND_PATHS.map((d, index) => (
            <path key={`land-${index}`} d={d} fill="url(#ml-land)" />
          ))}
        </g>

        {/* Soft top-left sheen, clipped to the land by reusing the path. */}
        {ENGLAND_PATHS.map((d, index) => (
          <path key={`sheen-${index}`} d={d} fill="url(#ml-sheen)" />
        ))}

        {/* Coastline. */}
        {ENGLAND_PATHS.map((d, index) => (
          <path
            key={`coast-${index}`}
            d={d}
            fill="none"
            stroke="#2f6b35"
            strokeWidth={2.5}
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        ))}

        {/* Grounds. */}
        {stadiums.map((venue) => {
          const { x, y } = projectToEngland(venue.lat, venue.lng);
          const token = illuminationToken(venue.illumination_state);
          const tone = `rgb(var(${token.toneVar}))`;
          const isFavoriteHome =
            favoriteTeamId !== null && favoriteTeamId.length > 0 && venue.home_team_ids.includes(favoriteTeamId);
          const isSelected = venue.venue_id === selectedVenueId;
          // Markers keep a constant on-screen size as the map zooms.
          const s = 1 / zoom;

          return (
            <g
              key={venue.venue_id}
              transform={`translate(${x} ${y}) scale(${s})`}
              className={token.interactive ? "matchline-pin" : "matchline-pin matchline-pin--inert"}
              onClick={token.interactive ? () => onSelect(venue.venue_id) : undefined}
              style={{ cursor: token.interactive ? "pointer" : "default" }}
            >
              {isFavoriteHome ? (
                <circle r={34} fill="none" stroke="#f59e0b" strokeWidth={4} opacity={0.95} />
              ) : null}
              {isSelected ? <circle r={42} fill={tone} opacity={0.18} /> : null}

              {/* Original stadium glyph: bowl, pitch and floodlights. */}
              <g opacity={token.interactive ? 1 : 0.55}>
                <ellipse cx={0} cy={6} rx={26} ry={9} fill="#0f172a" opacity={0.25} />
                <ellipse cx={0} cy={0} rx={26} ry={15} fill={tone} />
                <ellipse cx={0} cy={-2} rx={17} ry={9} fill="#ffffff" opacity={0.92} />
                <ellipse cx={0} cy={-2} rx={17} ry={9} fill="none" stroke={tone} strokeWidth={1.5} opacity={0.5} />
                <path d={`M-17 -2 H17`} stroke={tone} strokeWidth={1.2} opacity={0.45} />
                <circle cx={0} cy={-2} r={3.4} fill="none" stroke={tone} strokeWidth={1.2} opacity={0.45} />
                <g stroke={tone} strokeWidth={2.6} strokeLinecap="round">
                  <path d="M-24 -10 V-22" />
                  <path d="M24 -10 V-22" />
                </g>
                <rect x={-28} y={-27} width={8} height={5} rx={2} fill={tone} />
                <rect x={20} y={-27} width={8} height={5} rx={2} fill={tone} />
              </g>

              {venue.fixtures.length > 0 ? (
                <g transform="translate(20 -18)">
                  <circle r={10} fill={tone} stroke="#ffffff" strokeWidth={2.5} />
                  <text
                    textAnchor="middle"
                    dominantBaseline="central"
                    fontSize={12}
                    fontWeight={800}
                    fill="#ffffff"
                  >
                    {venue.fixtures.length}
                  </text>
                </g>
              ) : null}

              {/* Ground name, never a club badge. */}
              <g transform="translate(0 32)">
                <text
                  textAnchor="middle"
                  fontSize={17}
                  fontWeight={700}
                  stroke="#ffffff"
                  strokeWidth={5}
                  strokeLinejoin="round"
                  paintOrder="stroke"
                  fill="#0f172a"
                >
                  {venue.name}
                </text>
              </g>
            </g>
          );
        })}
      </svg>

      {/* Zoom controls. Real buttons, so they are reachable by keyboard. */}
      <div className="absolute right-2 top-2 flex flex-col gap-1">
        <button
          type="button"
          onClick={() => changeZoom(zoom + 0.5)}
          disabled={zoom >= MAX_ZOOM}
          aria-label="Zoom in"
          className="h-8 w-8 rounded-md border border-line bg-surface-raised text-lg font-bold text-ink disabled:opacity-40"
        >
          +
        </button>
        <button
          type="button"
          onClick={() => changeZoom(zoom - 0.5)}
          disabled={zoom <= MIN_ZOOM}
          aria-label="Zoom out"
          className="h-8 w-8 rounded-md border border-line bg-surface-raised text-lg font-bold text-ink disabled:opacity-40"
        >
          −
        </button>
        <button
          type="button"
          onClick={() => {
            setZoom(1);
            setPan({ x: 0, y: 0 });
          }}
          disabled={zoom === 1 && pan.x === 0 && pan.y === 0}
          aria-label="Reset the map view"
          className="h-8 w-8 rounded-md border border-line bg-surface-raised text-xs font-bold text-ink disabled:opacity-40"
        >
          ⟲
        </button>
      </div>

      <p className="mt-1 text-right text-[0.625rem] text-ink-muted">
        Outline from Natural Earth (public domain)
      </p>
    </div>
  );
}
