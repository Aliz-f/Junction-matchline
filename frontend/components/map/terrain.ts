/**
 * Decorative terrain for the illustrated map (FE-05).
 *
 * These shapes are **ornament, not geography**. They are scattered over the
 * landmass and clipped to its coastline so the map reads as an illustrated
 * relief rather than a flat silhouette — the same idea as the reference poster
 * style. They do not represent real hills, woodland or settlements, and nothing
 * on the map is positioned from them.
 *
 * Only the coastline and the venue markers carry real information: the outline
 * comes from Natural Earth and markers are projected from verified coordinates.
 *
 * Generated from a fixed seed so every render is identical. That matters for
 * more than tidiness: a random layout would differ between the server and
 * client renders and cause a hydration mismatch.
 */

/** Small deterministic PRNG, so the scatter is stable across renders. */
function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type Hill = { readonly x: number; readonly y: number; readonly r: number };
export type Patch = { readonly x: number; readonly y: number; readonly rx: number; readonly ry: number; readonly tone: number };

/**
 * Scatters shapes across the outline's bounding box.
 *
 * Clipping to the coastline is done in SVG, so anything landing in the sea
 * simply disappears and no point-in-polygon test is needed here.
 */
function scatter(width: number, height: number, seed: number) {
  const random = mulberry32(seed);

  // Broad colour patches, which break up the flat green.
  const patches: Patch[] = Array.from({ length: 46 }, () => ({
    x: random() * width,
    y: random() * height,
    rx: 40 + random() * 110,
    ry: 30 + random() * 80,
    tone: Math.floor(random() * 3),
  }));

  // Upland bumps. Denser toward the north and west, which is roughly where
  // England's higher ground sits, so the ornament is at least not misleading.
  const hills: Hill[] = [];
  for (let i = 0; i < 150; i += 1) {
    const x = random() * width;
    const y = random() * height;
    const northness = 1 - y / height;
    const westness = 1 - x / width;
    const likelihood = 0.25 + northness * 0.5 + westness * 0.25;
    if (random() < likelihood) {
      hills.push({ x, y, r: 7 + random() * 13 });
    }
  }

  return { patches, hills };
}

/** Built once at module load, from a fixed seed. */
export function buildTerrain(width: number, height: number) {
  return scatter(width, height, 20261024);
}
