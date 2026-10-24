#!/usr/bin/env python3
"""Regenerate lib/geo/england.ts from Natural Earth.

Natural Earth is public domain, so the generated outline carries no attribution
or usage obligations. Run from the frontend directory:

    curl -sO https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_admin_0_map_subunits.geojson
    python3 scripts/build_england.py ne_50m_admin_0_map_subunits.geojson lib/geo/england.ts

Keep the simplification tolerance in step with the rendered size: too coarse and
the coastline stops reading as England, too fine and the path bloats the bundle.
"""
import json, math, sys

src, out = sys.argv[1], sys.argv[2]
data = json.load(open(src))
feat = next(f for f in data["features"] if f["properties"].get("SUBUNIT") == "England")

polys = feat["geometry"]["coordinates"]
if feat["geometry"]["type"] == "Polygon":
    polys = [polys]

def ring_area(r):
    a = 0.0
    for i in range(len(r) - 1):
        a += r[i][0] * r[i + 1][1] - r[i + 1][0] * r[i][1]
    return abs(a) / 2

# Outer ring of each polygon, largest first.
rings = sorted((p[0] for p in polys), key=ring_area, reverse=True)
biggest = ring_area(rings[0])
# Keep the mainland plus islands at least 0.4% of its area (keeps Wight/Man-sized).
rings = [r for r in rings if ring_area(r) >= biggest * 0.004]

def rdp(points, eps):
    if len(points) < 3:
        return points
    def perp(p, a, b):
        dx, dy = b[0] - a[0], b[1] - a[1]
        if dx == 0 and dy == 0:
            return math.hypot(p[0] - a[0], p[1] - a[1])
        t = ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy)
        t = max(0, min(1, t))
        return math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy))
    dmax, idx = 0.0, 0
    for i in range(1, len(points) - 1):
        d = perp(points[i], points[0], points[-1])
        if d > dmax:
            dmax, idx = d, i
    if dmax > eps:
        return rdp(points[: idx + 1], eps)[:-1] + rdp(points[idx:], eps)
    return [points[0], points[-1]]

sys.setrecursionlimit(10000)
rings = [rdp(r, 0.012) for r in rings]

# Web Mercator, so markers and outline share one projection.
def merc(lon, lat):
    return lon, math.degrees(math.log(math.tan(math.pi / 4 + math.radians(lat) / 2)))

proj = [[merc(x, y) for x, y in r] for r in rings]
xs = [p[0] for r in proj for p in r]
ys = [p[1] for r in proj for p in r]
minx, maxx, miny, maxy = min(xs), max(xs), min(ys), max(ys)

WIDTH = 1000.0
scale = WIDTH / (maxx - minx)
height = (maxy - miny) * scale

def to_svg(p):
    # SVG y grows downward, Mercator y grows upward.
    return (p[0] - minx) * scale, (maxy - p[1]) * scale

paths = []
for r in proj:
    pts = [to_svg(p) for p in r]
    d = "M" + " L".join(f"{x:.1f},{y:.1f}" for x, y in pts) + " Z"
    paths.append(d)

total = sum(len(p) for p in paths)
print(f"rings={len(paths)} points={sum(len(r) for r in rings)} chars={total}", file=sys.stderr)

module = f'''/**
 * England outline for the stadium map (FE-05).
 *
 * Derived from Natural Earth 1:50m `admin_0_map_subunits`, which is in the
 * **public domain** (naturalearthdata.com terms: "no permission needed"), so no
 * attribution or tile-usage policy applies. Simplified with Douglas-Peucker at
 * ~0.012 degrees: enough coastline to be recognisably England, small enough to
 * inline.
 *
 * Generated, not hand-drawn: the geography is real, which matters because the
 * venue markers are positioned with the same projection used to build it.
 * Regenerate with `scripts/build_england.py` rather than editing by hand.
 *
 * Projection is Web Mercator, normalised so the outline fills
 * `0..{WIDTH:.0f}` horizontally.
 */

/** The SVG viewBox this path set is authored against. */
export const ENGLAND_VIEWBOX = {{ width: {WIDTH:.0f}, height: {height:.1f} }} as const;

/** Mercator bounds used to build the paths, for projecting coordinates onto them. */
export const ENGLAND_PROJECTION = {{
  minX: {minx:.6f},
  maxY: {maxy:.6f},
  scale: {scale:.6f},
}} as const;

/** Mainland first, then islands large enough to read at this size. */
export const ENGLAND_PATHS: readonly string[] = [
{chr(10).join(f"  {json.dumps(p)}," for p in paths)}
];

/**
 * Projects a WGS84 coordinate into the outline's SVG space.
 *
 * Uses the same Web Mercator transform the paths were generated with, so a
 * verified venue coordinate lands where it actually is.
 */
export function projectToEngland(lat: number, lng: number): {{ x: number; y: number }} {{
  const mercY = (Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360)) * 180) / Math.PI;
  return {{
    x: (lng - ENGLAND_PROJECTION.minX) * ENGLAND_PROJECTION.scale,
    y: (ENGLAND_PROJECTION.maxY - mercY) * ENGLAND_PROJECTION.scale,
  }};
}}
'''
open(out, "w").write(module)
