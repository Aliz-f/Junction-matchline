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

  async headers() {
    return [
      {
        // Belt-and-braces: never let a shared cache retain an API response.
        // The backend's own `private, no-store` / `Vary: Cookie` passes through
        // the rewrite untouched; this covers the demo handler too (CT-12).
        source: "/api/v1/:path*",
        headers: [
          { key: "Cache-Control", value: "private, no-store" },
          { key: "Vary", value: "Cookie" },
        ],
      },
    ];
  },
};

export default nextConfig;
