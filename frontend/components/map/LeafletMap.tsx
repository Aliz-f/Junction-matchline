/**
 * Leaflet map (FE-05).
 *
 * Deliberately a progressive enhancement: the venue list beside it is the
 * canonical, accessible representation and is always rendered. If tiles fail to
 * load — offline, blocked, or rate-limited — the map says so and the list still
 * carries every fixture. The map is `aria-hidden` for exactly that reason;
 * duplicating the list into marker popups for screen readers would be noise.
 *
 * Leaflet is imported dynamically because it touches `window` at module scope.
 * OpenStreetMap's attribution is mandatory and must not be removed.
 */
"use client";

import { useEffect, useRef, useState } from "react";
// Leaflet's stylesheet is required for correct tile and marker positioning.
import "leaflet/dist/leaflet.css";
import { illuminationToken } from "@/lib/design/illumination";
import type { StadiumMapResponse } from "@/lib/api/types";

type Venue = StadiumMapResponse["stadiums"][number];

type Props = {
  readonly stadiums: readonly Venue[];
  /** Venues whose home club is the viewer's favourite get an outline. */
  readonly favoriteTeamId: string | null;
  readonly onSelect: (venueId: string) => void;
};

/** England, roughly centred, so the first paint is never mid-ocean. */
const ENGLAND_CENTRE: [number, number] = [52.8, -1.6];

export function LeafletMap({ stadiums, favoriteTeamId, onSelect }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Leaflet types are only available after the dynamic import resolves
  const mapRef = useRef<any>(null);
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
        scrollWheelZoom: false,
        // The list provides keyboard access; trapping arrow keys in the map
        // would fight with page scrolling.
        keyboard: false,
        attributionControl: true,
      });
      mapRef.current = map;

      const tiles = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 18,
        // Required by the OSM tile usage policy.
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      });
      tiles.on("tileerror", () => {
        if (!cancelled) setTilesFailed(true);
      });
      tiles.addTo(map);

      setReady(true);
    })();

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  // Markers are redrawn when the selection changes.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;

    let cancelled = false;
    void (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !mapRef.current) return;

      const layer = L.layerGroup().addTo(map);

      for (const venue of stadiums) {
        const token = illuminationToken(venue.illumination_state);
        const isFavoriteHome =
          favoriteTeamId !== null && venue.home_team_ids.includes(favoriteTeamId);

        const marker = L.circleMarker([venue.lat, venue.lng], {
          radius: isFavoriteHome ? 11 : 8,
          color: isFavoriteHome ? "#f59e0b" : "#334155",
          weight: isFavoriteHome ? 3 : 1.5,
          fillColor: `rgb(${getComputedStyle(document.documentElement).getPropertyValue(token.toneVar).trim() || "100 116 139"})`,
          fillOpacity: token.interactive ? 0.9 : 0.35,
          // An INACTIVE venue is visible but not clickable.
          interactive: token.interactive,
        });

        const fixtureCount = venue.fixtures.length;
        marker.bindTooltip(
          `${venue.name} — ${token.label}${fixtureCount ? ` (${fixtureCount})` : ""}`,
        );
        if (token.interactive) marker.on("click", () => onSelect(venue.venue_id));
        marker.addTo(layer);
      }

      return () => layer.remove();
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
        className="h-[22rem] w-full overflow-hidden rounded-lg border border-line bg-surface-sunken"
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
