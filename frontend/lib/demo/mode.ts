/**
 * Server-side data-mode resolution (FE-01).
 *
 * `MATCHLINE_API_BASE_URL` is intentionally NOT prefixed `NEXT_PUBLIC_`: the
 * backend origin must never reach the browser bundle. The browser only ever
 * calls the relative path `/api/v1`.
 */
import { demoMeta } from "./responses";
import type { MetaView } from "@/lib/api/types";

export type DataMode = "DEMO_FIXTURES" | "BACKEND_PROXY";

/** Server-only. Do not call from a client component. */
export function backendBaseUrl(): string | null {
  const raw = process.env.MATCHLINE_API_BASE_URL?.trim();
  return raw ? raw.replace(/\/+$/, "") : null;
}

export function dataMode(): DataMode {
  return backendBaseUrl() ? "BACKEND_PROXY" : "DEMO_FIXTURES";
}

/**
 * Loads `/meta` for the app shell.
 *
 * In demo mode the manifest-derived view is returned directly rather than
 * self-fetching the route handler, so both paths share one source of truth. In
 * proxy mode this is a server-to-server call to the configured backend, which
 * is permitted — the same-origin rule constrains the BROWSER, not the server.
 *
 * Returns null on any failure so the shell renders an honest "unavailable"
 * indicator instead of a fabricated as-of time.
 */
export async function loadMeta(): Promise<{ mode: DataMode; meta: MetaView | null }> {
  const base = backendBaseUrl();
  if (!base) return { mode: "DEMO_FIXTURES", meta: demoMeta() };

  try {
    const response = await fetch(`${base}/api/v1/meta`, { cache: "no-store" });
    if (!response.ok) return { mode: "BACKEND_PROXY", meta: null };
    return { mode: "BACKEND_PROXY", meta: (await response.json()) as MetaView };
  } catch {
    return { mode: "BACKEND_PROXY", meta: null };
  }
}

/**
 * NOTE for FE-02 and later: do not add a root `app/loading.tsx`.
 *
 * A loading file wraps its whole segment in a Suspense boundary, so the HTML
 * response begins streaming with status 200 before the page body renders. A
 * later `notFound()` then renders the not-found UI with a 200 status, which
 * breaks the "unknown UUID returns 404" requirement (FE-04 acceptance).
 *
 * Add loading boundaries to leaf segments that do NOT call `notFound()`, or
 * render a skeleton inside the page instead.
 */
