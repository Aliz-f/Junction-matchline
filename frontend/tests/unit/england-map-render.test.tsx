/**
 * FE-05 illustrated map rendering.
 *
 * Verifies the layers actually render and, more importantly, that markers land
 * at their projected positions and that decoration never carries information.
 */
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EnglandMap } from "@/components/map/EnglandMap";
import { projectToEngland } from "@/lib/geo/england";
import { demoStadiumMap } from "@/lib/demo/responses";
import { manifest } from "@/mocks/fixtures";

const map = demoStadiumMap({ date: null, matchday: 9 })!;
const venues = map.stadiums;

function renderMap(overrides: Partial<React.ComponentProps<typeof EnglandMap>> = {}) {
  return render(
    <EnglandMap
      stadiums={venues}
      favoriteTeamId={null}
      onSelect={vi.fn()}
      selectedVenueId={null}
      {...overrides}
    />,
  );
}

describe("layers", () => {
  it("draws the sea, cliff base and land", () => {
    const { container } = renderMap();
    expect(container.querySelector("#ml-sea")).not.toBeNull();
    expect(container.querySelector("#ml-land")).not.toBeNull();
    expect(container.querySelector("#ml-shore")).not.toBeNull();
  });

  it("clips decoration to the real coastline", () => {
    const { container } = renderMap();
    expect(container.querySelector("#ml-land-clip")).not.toBeNull();
    expect(container.querySelector('[clip-path="url(#ml-land-clip)"]')).not.toBeNull();
  });

  it("hides the whole figure from assistive technology", () => {
    const { container } = renderMap();
    const svg = container.querySelector("svg");
    expect(svg?.getAttribute("aria-hidden")).toBe("true");
  });

  it("uses no raster image, so nothing external is fetched", () => {
    const { container } = renderMap();
    expect(container.querySelector("img")).toBeNull();
    expect(container.querySelector("image")).toBeNull();
  });
});

describe("markers", () => {
  it("places each ground at its projected position", () => {
    const { container } = renderMap();
    for (const venue of venues) {
      const { x, y } = projectToEngland(venue.lat, venue.lng);
      const node = container.querySelector(
        `g[transform="translate(${x} ${y}) scale(1)"]`,
      );
      expect(node, venue.name).not.toBeNull();
    }
  });

  it("labels each ground by stadium name", () => {
    renderMap();
    for (const venue of venues) {
      expect(screen.getByText(venue.name)).toBeInTheDocument();
    }
  });

  it("shows a fixture count only where there are fixtures", () => {
    const { container } = renderMap();
    const hosting = venues.filter((v) => v.fixtures.length > 0);
    for (const venue of hosting) {
      expect(container.textContent).toContain(String(venue.fixtures.length));
    }
  });

  it("selects an interactive ground on click", async () => {
    const onSelect = vi.fn();
    const { container } = renderMap({ onSelect });
    const active = venues.find((v) => v.fixtures.length > 0)!;
    const { x, y } = projectToEngland(active.lat, active.lng);
    const node = container.querySelector(`g[transform="translate(${x} ${y}) scale(1)"]`)!;
    await userEvent.click(node);
    expect(onSelect).toHaveBeenCalledWith(active.venue_id);
  });

  it("does not select a venue with no fixture in this selection", async () => {
    const onSelect = vi.fn();
    const { container } = renderMap({ onSelect });
    const inert = venues.find((v) => v.fixtures.length === 0)!;
    const { x, y } = projectToEngland(inert.lat, inert.lng);
    const node = container.querySelector(`g[transform="translate(${x} ${y}) scale(1)"]`)!;
    await userEvent.click(node);
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("outlines the viewer's club's home ground", () => {
    const home = venues.find((v) => v.home_team_ids.length > 0)!;
    const { container } = renderMap({ favoriteTeamId: home.home_team_ids[0]! });
    expect(container.querySelector('circle[stroke="#f59e0b"]')).not.toBeNull();
  });
});

describe("zoom controls", () => {
  it("offers labelled, keyboard-reachable controls", () => {
    renderMap();
    expect(screen.getByRole("button", { name: "Zoom in" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Zoom out" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reset the map view" })).toBeInTheDocument();
  });

  it("starts fully zoomed out, so zoom out and reset are disabled", () => {
    renderMap();
    expect(screen.getByRole("button", { name: "Zoom out" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Reset the map view" })).toBeDisabled();
  });

  it("zooms in and keeps markers the same on-screen size", async () => {
    const { container } = renderMap();
    await userEvent.click(screen.getByRole("button", { name: "Zoom in" }));
    // A marker scale below 1 cancels the viewBox zoom.
    expect(container.innerHTML).toContain("scale(0.6666666666666666)");
    expect(screen.getByRole("button", { name: "Zoom out" })).toBeEnabled();
  });
});

describe("banner", () => {
  it("uses the server's competition name rather than hardcoded branding", () => {
    renderMap({ competitionName: manifest.competition.name, seasonStartYear: 2026 });
    expect(screen.getByText(/Premier League demo/)).toBeInTheDocument();
    expect(screen.getByText(/2026\/27/)).toBeInTheDocument();
  });

  it("omits the banner when no competition name is supplied", () => {
    renderMap();
    expect(screen.queryByText(/England\s*$/)).toBeNull();
  });

  it("credits the coastline source and marks terrain decorative", () => {
    renderMap();
    expect(screen.getByText(/Natural Earth/)).toBeInTheDocument();
    expect(screen.getByText(/Terrain is decorative/)).toBeInTheDocument();
  });
});
