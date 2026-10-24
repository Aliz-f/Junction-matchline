/**
 * Illustrated England map (FE-05).
 *
 * An inline SVG landmass rather than a tile map: Phase 1 is one English
 * competition, so a world map with everything outside England greyed out was
 * showing far more than the product needs. This draws England alone, as an
 * illustrated relief island sitting in the sea.
 *
 * What is real and what is ornament, kept clearly apart:
 *  - **Real:** the coastline (public-domain Natural Earth, `lib/geo/england.ts`)
 *    and every venue marker, projected with the same Web Mercator transform the
 *    outline was generated with, so a verified coordinate lands where it is.
 *  - **Ornament:** the terrain scatter, cliff strata and sea. Decorative only,
 *    clipped to the coastline, and carrying no information — see `terrain.ts`.
 *
 * Grounds are drawn as an original stadium glyph. No club crest or competition
 * logo appears anywhere (AGENTS.md section 5).
 *
 * Accessibility: the figure is `aria-hidden`. The venue list beside it is the
 * canonical representation and carries every fixture, so nothing is lost to a
 * screen reader, and there are no tiles to fail.
 */
"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { ENGLAND_PATHS, ENGLAND_VIEWBOX, projectToEngland } from "@/lib/geo/england";
import { illuminationToken } from "@/lib/design/illumination";
import { buildTerrain } from "./terrain";
import type { StadiumMapResponse } from "@/lib/api/types";

type Venue = StadiumMapResponse["stadiums"][number];

type Props = {
  readonly stadiums: readonly Venue[];
  readonly favoriteTeamId: string | null;
  readonly onSelect: (venueId: string) => void;
  readonly selectedVenueId: string | null;
  /** Shown on the map's banner, from the server's own data. */
  readonly competitionName?: string | null;
  readonly seasonStartYear?: number | null;
};

/** Total depth of the cliff base, in viewBox units. */
const EXTRUDE = 46;
/** Rock strata bands making up that base. */
const STRATA = [
  { offset: 0.18, fill: "#8a6b47" },
  { offset: 0.38, fill: "#7a5c3c" },
  { offset: 0.58, fill: "#6a4e33" },
  { offset: 0.78, fill: "#5b422b" },
  { offset: 1.0, fill: "#4a3522" },
];

const MIN_ZOOM = 1;
const MAX_ZOOM = 5;
/** Breathing room around the island so the sea is visible. */
const MARGIN = 70;

const PATCH_TONES = ["#7cc268", "#5fae53", "#8fd07c"];

const TERRAIN = buildTerrain(ENGLAND_VIEWBOX.width, ENGLAND_VIEWBOX.height);

export function EnglandMap({
  stadiums,
  favoriteTeamId,
  onSelect,
  selectedVenueId,
  competitionName,
  seasonStartYear,
}: Props) {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const drag = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null);

  const { width, height } = ENGLAND_VIEWBOX;
  const fullWidth = width + MARGIN * 2;
  const fullHeight = height + EXTRUDE + MARGIN * 2;

  const viewBox = useMemo(() => {
    const w = fullWidth / zoom;
    const h = fullHeight / zoom;
    const x = -MARGIN + (fullWidth - w) / 2 + pan.x;
    const y = -MARGIN + (fullHeight - h) / 2 + pan.y;
    return `${x} ${y} ${w} ${h}`;
  }, [zoom, pan, fullWidth, fullHeight]);

  const clampPan = useCallback(
    (next: { x: number; y: number }, atZoom: number) => {
      const limitX = (fullWidth - fullWidth / atZoom) / 2;
      const limitY = (fullHeight - fullHeight / atZoom) / 2;
      return {
        x: Math.max(-limitX, Math.min(limitX, next.x)),
        y: Math.max(-limitY, Math.min(limitY, next.y)),
      };
    },
    [fullWidth, fullHeight],
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
    const perPixel = fullWidth / zoom / rect.width;
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
    <div className="relative overflow-hidden rounded-xl border border-line">
      <svg
        viewBox={viewBox}
        className="matchline-england block h-[32rem] w-full touch-none select-none"
        role="presentation"
        aria-hidden="true"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        style={{ cursor: zoom > 1 ? "grab" : "default" }}
      >
        <defs>
          <linearGradient id="ml-sea" x1="0" y1="0" x2="0.4" y2="1">
            <stop offset="0%" stopColor="#7fd4e8" />
            <stop offset="55%" stopColor="#3fb3d4" />
            <stop offset="100%" stopColor="#1f8db5" />
          </linearGradient>
          <linearGradient id="ml-land" x1="0.2" y1="0" x2="0.7" y2="1">
            <stop offset="0%" stopColor="#9ad97f" />
            <stop offset="40%" stopColor="#74bd5e" />
            <stop offset="100%" stopColor="#4f9a49" />
          </linearGradient>
          <radialGradient id="ml-sheen" cx="0.3" cy="0.18" r="0.8">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="ml-shore" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f2e2b8" />
            <stop offset="100%" stopColor="#dcc794" />
          </linearGradient>
          <filter id="ml-shadow" x="-25%" y="-25%" width="150%" height="160%">
            <feDropShadow dx="0" dy="16" stdDeviation="18" floodColor="#083344" floodOpacity="0.35" />
          </filter>
          <filter id="ml-soft" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="14" />
          </filter>

          {/* Everything decorative is clipped to the real coastline. */}
          <clipPath id="ml-land-clip">
            {ENGLAND_PATHS.map((d, index) => (
              <path key={`clip-${index}`} d={d} />
            ))}
          </clipPath>
        </defs>

        {/* Sea. */}
        <rect
          x={-MARGIN}
          y={-MARGIN}
          width={fullWidth}
          height={fullHeight}
          fill="url(#ml-sea)"
        />

        {/* Wave rings echoing the coastline. */}
        <g opacity={0.33}>
          {[14, 30, 50].map((spread, ring) =>
            ENGLAND_PATHS.map((d, index) => (
              <path
                key={`wave-${ring}-${index}`}
                d={d}
                fill="none"
                stroke="#ffffff"
                strokeWidth={2.5}
                strokeLinejoin="round"
                opacity={0.85 - ring * 0.22}
                style={{
                  transform: `scale(${1 + spread / 900})`,
                  transformOrigin: `${width / 2}px ${height / 2}px`,
                }}
              />
            )),
          )}
        </g>

        <g filter="url(#ml-shadow)">
          {/* Cliff base: stacked strata give the island thickness. */}
          {STRATA.map((band, bandIndex) =>
            ENGLAND_PATHS.map((d, index) => (
              <path
                key={`strata-${bandIndex}-${index}`}
                d={d}
                fill={band.fill}
                transform={`translate(0 ${EXTRUDE * band.offset})`}
              />
            )),
          )}

          {/* Sandy shore just under the land, so the cliff is not abrupt. */}
          {ENGLAND_PATHS.map((d, index) => (
            <path key={`shore-${index}`} d={d} fill="url(#ml-shore)" transform="translate(0 7)" />
          ))}

          {/* The land itself. */}
          {ENGLAND_PATHS.map((d, index) => (
            <path key={`land-${index}`} d={d} fill="url(#ml-land)" />
          ))}
        </g>

        {/* Decorative relief, clipped to the coastline. Carries no meaning. */}
        <g clipPath="url(#ml-land-clip)">
          <g filter="url(#ml-soft)" opacity={0.5}>
            {TERRAIN.patches.map((patch, index) => (
              <ellipse
                key={`patch-${index}`}
                cx={patch.x}
                cy={patch.y}
                rx={patch.rx}
                ry={patch.ry}
                fill={PATCH_TONES[patch.tone] ?? PATCH_TONES[0]}
              />
            ))}
          </g>

          {TERRAIN.hills.map((hill, index) => (
            <g key={`hill-${index}`}>
              <ellipse cx={hill.x} cy={hill.y + hill.r * 0.5} rx={hill.r} ry={hill.r * 0.4} fill="#2f6b35" opacity={0.22} />
              <path
                d={`M${hill.x - hill.r} ${hill.y + hill.r * 0.45} Q${hill.x - hill.r * 0.4} ${hill.y - hill.r} ${hill.x} ${hill.y - hill.r * 0.95} Q${hill.x + hill.r * 0.5} ${hill.y - hill.r} ${hill.x + hill.r} ${hill.y + hill.r * 0.45} Z`}
                fill="#5aa54e"
              />
              <path
                d={`M${hill.x - hill.r * 0.5} ${hill.y + hill.r * 0.1} Q${hill.x - hill.r * 0.2} ${hill.y - hill.r * 0.8} ${hill.x} ${hill.y - hill.r * 0.9} L${hill.x} ${hill.y + hill.r * 0.45} Z`}
                fill="#7cc268"
                opacity={0.85}
              />
            </g>
          ))}

          {/* Inner coastal rim, lightening the edge like a beach. */}
          {ENGLAND_PATHS.map((d, index) => (
            <path
              key={`rim-${index}`}
              d={d}
              fill="none"
              stroke="#e8d5a4"
              strokeWidth={9}
              strokeLinejoin="round"
              opacity={0.6}
            />
          ))}
        </g>

        {/* Top-left sheen over the land. */}
        {ENGLAND_PATHS.map((d, index) => (
          <path key={`sheen-${index}`} d={d} fill="url(#ml-sheen)" />
        ))}

        {/* Coastline. */}
        {ENGLAND_PATHS.map((d, index) => (
          <path
            key={`coast-${index}`}
            d={d}
            fill="none"
            stroke="#2d6b3a"
            strokeWidth={2.5}
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        ))}

        {/* Grounds: the only other thing on the map carrying information. */}
        {stadiums.map((venue) => {
          const { x, y } = projectToEngland(venue.lat, venue.lng);
          const token = illuminationToken(venue.illumination_state);
          const tone = `rgb(var(${token.toneVar}))`;
          const isFavoriteHome =
            favoriteTeamId !== null &&
            favoriteTeamId.length > 0 &&
            venue.home_team_ids.includes(favoriteTeamId);
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
              {isSelected ? <circle r={46} fill={tone} opacity={0.2} /> : null}
              {isFavoriteHome ? (
                <circle r={36} fill="none" stroke="#f59e0b" strokeWidth={4.5} opacity={0.95} />
              ) : null}

              <g opacity={token.interactive ? 1 : 0.5}>
                {/* Ground shadow on the land. */}
                <ellipse cx={0} cy={9} rx={27} ry={8} fill="#1f3d1f" opacity={0.3} />
                {/* Bowl. */}
                <ellipse cx={0} cy={0} rx={26} ry={15} fill={tone} />
                <ellipse cx={0} cy={-3} rx={26} ry={15} fill={tone} opacity={0.75} />
                {/* Pitch. */}
                <ellipse cx={0} cy={-4} rx={16} ry={8} fill="#ffffff" opacity={0.94} />
                <path d="M-16 -4 H16" stroke={tone} strokeWidth={1.2} opacity={0.5} />
                <circle cx={0} cy={-4} r={3.2} fill="none" stroke={tone} strokeWidth={1.2} opacity={0.5} />
                {/* Floodlights. */}
                <g stroke={tone} strokeWidth={2.6} strokeLinecap="round">
                  <path d="M-24 -12 V-24" />
                  <path d="M24 -12 V-24" />
                </g>
                <rect x={-28} y={-29} width={9} height={5} rx={2} fill={tone} />
                <rect x={19} y={-29} width={9} height={5} rx={2} fill={tone} />
              </g>

              {venue.fixtures.length > 0 ? (
                <g transform="translate(21 -20)">
                  <circle r={10.5} fill={tone} stroke="#ffffff" strokeWidth={2.5} />
                  <text textAnchor="middle" dominantBaseline="central" fontSize={12} fontWeight={800} fill="#ffffff">
                    {venue.fixtures.length}
                  </text>
                </g>
              ) : null}

              {/* Ground name, never a club badge. */}
              <g transform="translate(0 34)">
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

      {/* Banner, from the server's data rather than hardcoded branding. */}
      {competitionName ? (
        <div className="pointer-events-none absolute left-3 top-3">
          <p className="rounded-lg bg-slate-900/80 px-3 py-1.5 text-sm font-black uppercase tracking-wide text-white shadow">
            England
            <span className="ml-2 font-semibold normal-case tracking-normal text-white/85">
              {competitionName}
              {seasonStartYear ? ` · ${seasonStartYear}/${String((seasonStartYear + 1) % 100).padStart(2, "0")}` : ""}
            </span>
          </p>
        </div>
      ) : null}

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

      <p className="pointer-events-none absolute bottom-1.5 right-2 text-[0.625rem] text-white/80">
        Coastline: Natural Earth (public domain). Terrain is decorative.
      </p>
    </div>
  );
}
