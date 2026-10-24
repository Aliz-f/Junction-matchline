/**
 * Primary navigation rules (FE-01).
 *
 * The important guarantee is that `/` is the Journey and the map is a separate
 * destination — not the default landing screen.
 */
import { describe, expect, it } from "vitest";
import { NAV_ITEMS, isActive } from "@/lib/navigation";

describe("NAV_ITEMS", () => {
  it("routes the Journey at / and never makes the map the default", () => {
    const first = NAV_ITEMS[0];
    expect(first?.href).toBe("/");
    expect(first?.label).toBe("Journey");

    const map = NAV_ITEMS.find((item) => item.label === "Map");
    expect(map?.href).toBe("/map");
  });

  it("exposes the primary destinations the spec names, plus all-matches browse", () => {
    expect(NAV_ITEMS.map((item) => item.label)).toEqual([
      "Journey",
      "All matches",
      "Map",
      "My Team Impact",
      "Community",
      "Profile",
    ]);
  });

  it("has a unique href per item", () => {
    const hrefs = NAV_ITEMS.map((item) => item.href);
    expect(new Set(hrefs).size).toBe(hrefs.length);
  });
});

describe("isActive", () => {
  it("marks the Journey active only on exactly /", () => {
    expect(isActive("/", "/")).toBe(true);
    expect(isActive("/map", "/")).toBe(false);
    expect(isActive("/matches/abc", "/")).toBe(false);
  });

  it("marks a section active for its own route and its descendants", () => {
    expect(isActive("/community", "/community")).toBe(true);
    expect(isActive("/community/rooms/123", "/community")).toBe(true);
  });

  it("does not match a merely similar prefix", () => {
    expect(isActive("/community-guidelines", "/community")).toBe(false);
    expect(isActive("/mapping", "/map")).toBe(false);
  });
});
