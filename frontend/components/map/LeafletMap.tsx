/**
 * Leaflet map (FE-05).
 *
 * Deliberately a progressive enhancement: the venue list beside it is the
 * canonical, accessible representation and is always rendered. If tiles fail to
 * load — offline, blocked, or rate-limited — the map says so and the list still
 * carries every fixture. The map is `aria-hidden` for exactly that reason;
 * duplicating the list into marker popups for screen readers would be noise.
 *
 * Grounds are drawn as original stadium glyphs with their names, never club
 * crests or competition logos.
 *
 * Leaflet is imported dynamically because it touches `window` at module scope.
 * OpenStreetMap's attribution is mandatory and must not be removed.
 */
"use client";

import { useEffect, useRef, useState } from "react";
// Leaflet's stylesheet is required for correct tile and marker positioning.
import "leaflet/dist/leaflet.css";
import { stadiumMarkerHtml, stadiumMarkerTitle } from "./stadiumMarker";
import { illuminationToken } from "@/lib/design/illumination";
import type { StadiumMapResponse } from "@/lib/api/types";

type Venue = StadiumMapResponse["stadiums"][number];

type Props = {
  readonly stadiums: readonly Venue[];
  /** Venues whose home club is the viewer's favourite get an outline. */
  readonly favoriteTeamId: string | null;
  readonly onSelect: (venueId: string) => void;
};

/** England, framed so the country fills the view on first paint. */
const ENGLAND_CENTRE: [number, number] = [52.9, -1.6];
/** Roughly Land's End to Berwick, so panning cannot wander off England. */
const ENGLAND_BOUNDS: [[number, number], [number, number]] = [
  [49.8, -6.5],
  [56.0, 2.2],
];

export function LeafletMap({ stadiums, favoriteTeamId, onSelect }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Leaflet types are only available after the dynamic import resolves
  const mapRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- as above
  const layerRef = useRef<any>(null);
  const [tilesFailed, setTilesFailed] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const node = containerRef.current;
    if (!node) return;

    void (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !containerRef.current) return;

      const map = L.map(node, {
        center: ENGLAND_CENTRE,
        zoom: 6,
        minZoom: 5,
        maxZoom: 12,
        maxBounds: ENGLAND_BOUNDS,
        maxBoundsViscosity: 0.9,
        scrollWheelZoom: false,
        // The list provides keyboard access; trapping arrow keys in the map
        // would fight with page scrolling.
        keyboard: false,
        attributionControl: true,
      });
      mapRef.current = map;
      map.fitBounds(ENGLAND_BOUNDS, { padding: [10, 10] });

      const tiles = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 12,
        // Required by the OSM tile usage policy.
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        className: "matchline-tiles",
      });
      tiles.on("tileerror", () => {
        if (!cancelled) setTilesFailed(true);
      });
      tiles.addTo(map);

      layerRef.current = L.layerGroup().addTo(map);
      setReady(true);
    })();

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      layerRef.current = null;
    };
  }, []);

  // Markers are redrawn whenever the selection changes.
  useEffect(() => {
    if (!ready) return;
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!map || !layer) return;

    let cancelled = false;
    void (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !layerRef.current) return;

      layer.clearLayers();

      for (const venue of stadiums) {
        const token = illuminationToken(venue.illumination_state);
        const isFavoriteHome =
          favoriteTeamId !== null && venue.home_team_ids.includes(favoriteTeamId);

        const options = {
          name: venue.name,
          illumination: venue.illumination_state,
          fixtureCount: venue.fixtures.length,
          isFavoriteHome,
        };

        const marker = L.marker([venue.lat, venue.lng], {
          icon: L.divIcon({
            html: stadiumMarkerHtml(options),
            className: "matchline-marker__wrapper",
            iconSize: [38, 32],
            iconAnchor: [19, 24],
          }),
          title: stadiumMarkerTitle(options),
          // A venue with no fixture in this selection is shown but inert.
          interactive: token.interactive,
          keyboard: false,
        });

        if (token.interactive) marker.on("click", () => onSelect(venue.venue_id));
        marker.addTo(layer);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [stadiums, favoriteTeamId, onSelect, ready]);

  return (
    <div className="space-y-2">
      <div
        ref={containerRef}
        // The list is the accessible equivalent; see the file comment.
        aria-hidden="true"
        className="matchline-map h-[26rem] w-full overflow-hidden rounded-xl border border-line bg-surface-sunken"
      />
      {tilesFailed ? (
        <p role="status" className="rounded-md border border-amber-500/50 bg-amber-500/10 px-3 py-2 text-sm text-amber-800 dark:text-amber-200">
          <strong className="font-semibold">Map tiles could not be loaded.</strong> The stadium list
          below is complete and unaffected.
        </p>
      ) : null}
    </div>
  );
}
