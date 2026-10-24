/**
 * Stadium markers for the map (FE-05).
 *
 * Each venue is drawn as an original stadium glyph — an oval bowl with stands
 * and floodlights — rather than a club crest. No competition or club logo is
 * reproduced anywhere on the map (AGENTS.md section 5), and the glyph also says
 * something the crest would not: the marker shows the *ground*, which is what
 * this map is about.
 *
 * Returned as an HTML string for Leaflet's `divIcon`, so the marker inherits
 * the page's CSS custom properties and themes correctly in light and dark.
 */
import { illuminationToken } from "@/lib/design/illumination";

/** Escapes text interpolated into the marker HTML. */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export type StadiumMarkerOptions = {
  readonly name: string;
  readonly illumination: string;
  readonly fixtureCount: number;
  /** Outlines the ground when it is the viewer's club's home. */
  readonly isFavoriteHome: boolean;
};

/** The stadium glyph itself: bowl, stands, pitch and floodlights. */
function stadiumSvg(tone: string): string {
  return `
<svg viewBox="0 0 48 40" width="38" height="32" aria-hidden="true" focusable="false">
  <ellipse cx="24" cy="26" rx="19" ry="11" fill="${tone}" opacity="0.18"/>
  <ellipse cx="24" cy="24" rx="19" ry="11" fill="${tone}"/>
  <ellipse cx="24" cy="24" rx="12.5" ry="6.5" fill="#ffffff" opacity="0.9"/>
  <path d="M11.5 24h25" stroke="${tone}" stroke-width="1" opacity="0.45"/>
  <circle cx="24" cy="24" r="2.4" fill="none" stroke="${tone}" stroke-width="1" opacity="0.45"/>
  <g stroke="${tone}" stroke-width="1.8" stroke-linecap="round">
    <path d="M8 16v-5M40 16v-5"/>
  </g>
  <g fill="${tone}">
    <rect x="5" y="7" width="6" height="3.4" rx="1.2"/>
    <rect x="37" y="7" width="6" height="3.4" rx="1.2"/>
  </g>
</svg>`.trim();
}

/**
 * Builds the marker's HTML.
 *
 * The name sits under the glyph the way the reference layout places a label by
 * each ground, so the map is readable without opening anything.
 */
export function stadiumMarkerHtml(options: StadiumMarkerOptions): string {
  const token = illuminationToken(options.illumination);
  const tone = `rgb(var(${token.toneVar}))`;
  const name = escapeHtml(options.name);
  const dimmed = token.interactive ? "" : "opacity:0.55;";

  const badge =
    options.fixtureCount > 0
      ? `<span class="matchline-marker__count" style="background:${tone}">${options.fixtureCount}</span>`
      : "";

  const favorite = options.isFavoriteHome
    ? `<span class="matchline-marker__ring" aria-hidden="true"></span>`
    : "";

  return `
<div class="matchline-marker" style="${dimmed}">
  <div class="matchline-marker__glyph">
    ${favorite}
    ${stadiumSvg(tone)}
    ${badge}
  </div>
  <span class="matchline-marker__label">${name}</span>
</div>`.trim();
}

/** Accessible text for the marker's tooltip. */
export function stadiumMarkerTitle(options: StadiumMarkerOptions): string {
  const token = illuminationToken(options.illumination);
  const fixtures =
    options.fixtureCount === 0
      ? "no fixture in this selection"
      : `${options.fixtureCount} ${options.fixtureCount === 1 ? "fixture" : "fixtures"}`;
  const home = options.isFavoriteHome ? " — your club's home ground" : "";
  return `${options.name}: ${token.label}, ${fixtures}${home}`;
}
