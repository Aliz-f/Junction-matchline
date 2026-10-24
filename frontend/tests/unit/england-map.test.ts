/**
 * FE-05 England outline and projection.
 *
 * The map is illustrated, but the geography underneath it must stay real: a
 * venue marker has to land where the coordinate actually is. These assert the
 * projection against known British cities rather than the outline's own points.
 */
import { describe, expect, it } from "vitest";
import { ENGLAND_PATHS, ENGLAND_VIEWBOX, projectToEngland } from "@/lib/geo/england";
import { manifest } from "@/mocks/fixtures";

const CITIES = {
  newcastle: { lat: 54.9757, lng: -1.6216 },
  liverpool: { lat: 53.4308, lng: -2.9608 },
  birmingham: { lat: 52.4862, lng: -1.8904 },
  london: { lat: 51.5072, lng: -0.1276 },
  plymouth: { lat: 50.3755, lng: -4.1427 },
  norwich: { lat: 52.6309, lng: 1.2974 },
};

describe("outline", () => {
  it("has at least the mainland", () => {
    expect(ENGLAND_PATHS.length).toBeGreaterThanOrEqual(1);
  });

  it("produces closed SVG paths", () => {
    for (const path of ENGLAND_PATHS) {
      expect(path.startsWith("M")).toBe(true);
      expect(path.trimEnd().endsWith("Z")).toBe(true);
    }
  });

  it("is portrait, as England is taller than it is wide", () => {
    expect(ENGLAND_VIEWBOX.height).toBeGreaterThan(ENGLAND_VIEWBOX.width);
  });

  it("stays small enough to inline comfortably", () => {
    const total = ENGLAND_PATHS.join("").length;
    expect(total).toBeLessThan(20_000);
  });
});

describe("projectToEngland", () => {
  it("places northern cities above southern ones", () => {
    const newcastle = projectToEngland(CITIES.newcastle.lat, CITIES.newcastle.lng);
    const birmingham = projectToEngland(CITIES.birmingham.lat, CITIES.birmingham.lng);
    const london = projectToEngland(CITIES.london.lat, CITIES.london.lng);
    // SVG y grows downward.
    expect(newcastle.y).toBeLessThan(birmingham.y);
    expect(birmingham.y).toBeLessThan(london.y);
  });

  it("places western cities left of eastern ones", () => {
    const plymouth = projectToEngland(CITIES.plymouth.lat, CITIES.plymouth.lng);
    const liverpool = projectToEngland(CITIES.liverpool.lat, CITIES.liverpool.lng);
    const norwich = projectToEngland(CITIES.norwich.lat, CITIES.norwich.lng);
    expect(plymouth.x).toBeLessThan(liverpool.x);
    expect(liverpool.x).toBeLessThan(norwich.x);
  });

  it("keeps English cities inside the drawn area", () => {
    for (const [name, city] of Object.entries(CITIES)) {
      const { x, y } = projectToEngland(city.lat, city.lng);
      expect(x, name).toBeGreaterThanOrEqual(0);
      expect(x, name).toBeLessThanOrEqual(ENGLAND_VIEWBOX.width);
      expect(y, name).toBeGreaterThanOrEqual(0);
      expect(y, name).toBeLessThanOrEqual(ENGLAND_VIEWBOX.height);
    }
  });

  it("places every manifest venue inside the drawn area", () => {
    for (const venue of manifest.venues) {
      const { x, y } = projectToEngland(venue.lat, venue.lng);
      expect(x, venue.name).toBeGreaterThanOrEqual(0);
      expect(x, venue.name).toBeLessThanOrEqual(ENGLAND_VIEWBOX.width);
      expect(y, venue.name).toBeGreaterThanOrEqual(0);
      expect(y, venue.name).toBeLessThanOrEqual(ENGLAND_VIEWBOX.height);
    }
  });

  it("is monotonic, so ordering can never invert", () => {
    const south = projectToEngland(51, -1);
    const north = projectToEngland(55, -1);
    expect(north.y).toBeLessThan(south.y);

    const west = projectToEngland(53, -4);
    const east = projectToEngland(53, 1);
    expect(west.x).toBeLessThan(east.x);
  });

  it("separates venues that are genuinely close together", () => {
    // The manifest's three grounds are all in London, so they must not collapse
    // onto one point — the map has to show them as distinct.
    const points = manifest.venues.map((v) => projectToEngland(v.lat, v.lng));
    const keys = new Set(points.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`));
    expect(keys.size).toBe(manifest.venues.length);
  });
});
