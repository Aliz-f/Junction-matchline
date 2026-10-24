/**
 * FE-05 stadium marker rendering.
 *
 * The marker is built as an HTML string for Leaflet, so escaping and state
 * mapping are worth testing directly — a venue name goes straight into markup.
 */
import { describe, expect, it } from "vitest";
import { escapeHtml, stadiumMarkerHtml, stadiumMarkerTitle } from "@/components/map/stadiumMarker";
import { ILLUMINATION_TOKENS } from "@/lib/design/illumination";

const base = {
  name: "North London Demo Ground",
  illumination: "UPCOMING_ROUND",
  fixtureCount: 1,
  isFavoriteHome: false,
};

describe("escapeHtml", () => {
  it("escapes everything that could break out of the markup", () => {
    expect(escapeHtml('<script>"x"&\'y\'')).toBe(
      "&lt;script&gt;&quot;x&quot;&amp;&#39;y&#39;",
    );
  });

  it("leaves ordinary text alone", () => {
    expect(escapeHtml("North London Demo Ground")).toBe("North London Demo Ground");
  });
});

describe("stadiumMarkerHtml", () => {
  it("shows the stadium name, not a club identifier", () => {
    const html = stadiumMarkerHtml(base);
    expect(html).toContain("North London Demo Ground");
  });

  it("escapes a hostile venue name", () => {
    const html = stadiumMarkerHtml({ ...base, name: '<img src=x onerror="alert(1)">' });
    expect(html).not.toContain("<img");
    expect(html).toContain("&lt;img");
  });

  it("renders an inline stadium glyph rather than any logo asset", () => {
    const html = stadiumMarkerHtml(base);
    expect(html).toContain("<svg");
    // No external image is fetched for a crest or badge.
    expect(html).not.toContain("<img");
  });

  it("shows a fixture count only when there are fixtures", () => {
    expect(stadiumMarkerHtml({ ...base, fixtureCount: 3 })).toContain(">3<");
    expect(stadiumMarkerHtml({ ...base, fixtureCount: 0 })).not.toContain("matchline-marker__count");
  });

  it("outlines the viewer's club's home ground", () => {
    expect(stadiumMarkerHtml({ ...base, isFavoriteHome: true })).toContain("matchline-marker__ring");
    expect(stadiumMarkerHtml(base)).not.toContain("matchline-marker__ring");
  });

  it("dims a venue with no fixture in this selection", () => {
    const inactive = stadiumMarkerHtml({ ...base, illumination: "INACTIVE", fixtureCount: 0 });
    expect(inactive).toContain("opacity:0.55");
  });

  it("uses the token colour for each illumination state", () => {
    for (const [state, token] of Object.entries(ILLUMINATION_TOKENS)) {
      const html = stadiumMarkerHtml({ ...base, illumination: state });
      expect(html, state).toContain(token.toneVar);
    }
  });

  it("falls back to the unknown token for an unrecognised state", () => {
    const html = stadiumMarkerHtml({ ...base, illumination: "NOT_A_STATE" });
    expect(html).toContain(ILLUMINATION_TOKENS.UNKNOWN.toneVar);
  });
});

describe("stadiumMarkerTitle", () => {
  it("describes the ground, its state and its fixtures", () => {
    const title = stadiumMarkerTitle({ ...base, fixtureCount: 2 });
    expect(title).toContain("North London Demo Ground");
    expect(title).toContain("Upcoming");
    expect(title).toContain("2 fixtures");
  });

  it("says plainly when there is no fixture", () => {
    expect(stadiumMarkerTitle({ ...base, illumination: "INACTIVE", fixtureCount: 0 })).toContain(
      "no fixture in this selection",
    );
  });

  it("uses the singular for one fixture", () => {
    expect(stadiumMarkerTitle({ ...base, fixtureCount: 1 })).toContain("1 fixture");
  });

  it("mentions the viewer's home ground", () => {
    expect(stadiumMarkerTitle({ ...base, isFavoriteHome: true })).toContain("your club's home ground");
  });
});
