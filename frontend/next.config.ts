import type { NextConfig } from "next";

/**
 * Same-origin-only browser networking (FE-01).
 *
 * The browser always calls the relative path `/api/v1/...`. There is no
 * `NEXT_PUBLIC_API_BASE_URL`: the backend origin is a server-only variable, so
 * no FastAPI origin is ever reachable from, or visible in, the browser bundle.
 *
 * Resolution order for `/api/v1/*`:
 *  1. `MATCHLINE_API_BASE_URL` set  -> `beforeFiles` rewrite proxies to the real
 *     backend, which wins over the filesystem route below.
 *  2. unset                         -> falls through to the demo route handler
 *     in `app/api/v1/[...path]/route.ts`, which replays the frozen BE-00
 *     manifest and labels every response `DEMO_SYNTHETIC`.
 *
 * Integration (G1) therefore needs one env var, not a code change.
 */
const backendBaseUrl = process.env.MATCHLINE_API_BASE_URL?.replace(/\/+$/, "");

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Fail the build on type or lint errors rather than shipping them.
  typescript: { ignoreBuildErrors: false },
  eslint: { ignoreDuringBuilds: false },

  async rewrites() {
    if (!backendBaseUrl) return { beforeFiles: [], afterFiles: [], fallback: [] };
    return {
      beforeFiles: [{ source: "/api/v1/:path*", destination: `${backendBaseUrl}/api/v1/:path*` }],
      afterFiles: [],
      fallback: [],
    };
  },

  // No `headers()` entry for `/api/v1/*`, deliberately.
  //
  // CT-12 requires the frontend to PRESERVE the backend's
  // `Cache-Control: private, no-store` and `Vary: Cookie` through this rewrite.
  // Verified against BE-01: upstream response headers pass through the rewrite
  // untouched (a backend `X-Request-ID` arrives intact), so that obligation is
  // met by the rewrite itself.
  //
  // Two things were tried and removed as ineffective: a `headers()` entry here,
  // and a `middleware.ts`. Neither applies to a `beforeFiles` rewrite to an
  // external origin -- a proxied `/auth/me` still returned no `Cache-Control`.
  // Adding a no-op would imply protection that is not there.
  //
  // BE-01 currently sends NO cache headers on private routes, which is a
  // backend A1/CT-12 gap, reported in FE01_HANDOFF.md. If the frontend ever has
  // to enforce this itself, the rewrite must be replaced by an explicit proxy
  // route handler that fetches upstream and sets the headers on the way out.
};

export default nextConfig;
