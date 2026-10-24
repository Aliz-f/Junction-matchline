/**
 * Demo-mode `/api/v1` handler (FE-01).
 *
 * Only reached when `MATCHLINE_API_BASE_URL` is unset. When it IS set, the
 * `beforeFiles` rewrite in `next.config.ts` proxies to the real backend and
 * this file never runs — so integration needs an env var, not a code change.
 *
 * This is NOT a backend implementation and is not authoritative for anything.
 * It replays the frozen BE-00 manifest for the endpoints that manifest fully
 * determines, and returns an explicit `PROVIDER_UNAVAILABLE` envelope naming
 * the blocking handoff gap for everything else. It never invents an Appendix A
 * response, and it never claims a gate has passed.
 */
import { NextResponse } from "next/server";
import {
  DEMO_COMPETITION_CODE,
  DEMO_SEASON,
  demoAuthMe,
  demoCompetitions,
  demoErrorEnvelope,
  demoHealth,
  demoJourney,
  demoMatchDetail,
  demoMatchdays,
  demoMatches,
  demoMeta,
  demoStadiumMap,
  demoTeams,
} from "@/lib/demo/responses";
import type { ErrorCode } from "@/lib/api/contract";

/** Demo data is static, but responses stay uncacheable to mirror A1/CT-12. */
export const dynamic = "force-dynamic";

/** A1 privacy headers. Preserved identically by the real-backend rewrite. */
const PRIVATE_HEADERS = { "Cache-Control": "private, no-store", Vary: "Cookie" } as const;

function ok(body: unknown, headers: Record<string, string> = {}): NextResponse {
  return NextResponse.json(body, { headers: { ...PRIVATE_HEADERS, ...headers } });
}

function fail(code: ErrorCode, message: string, details: Record<string, unknown> = {}): NextResponse {
  const { body, status } = demoErrorEnvelope(code, message, details);
  return NextResponse.json(body, { status, headers: PRIVATE_HEADERS });
}

/**
 * Endpoints the frozen manifest does not fully determine. Returning a contract
 * error that names the gap is honest; returning invented data would not be.
 */
function notYetAvailable(route: string): NextResponse {
  return fail(
    "PROVIDER_UNAVAILABLE",
    `Demo mode cannot serve ${route}: the frozen BE-00 manifest does not determine this response. ` +
      "Set MATCHLINE_API_BASE_URL to proxy the real backend.",
    { route, demo_mode: true, see: "frontend/FE00_HANDOFF.md" },
  );
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ path?: string[] }> },
): Promise<NextResponse> {
  const { path = [] } = await context.params;
  const url = new URL(_request.url);
  const route = `/${path.join("/")}`;

  switch (route) {
    case "/health":
      return ok(demoHealth(), { "Cache-Control": "no-store" });

    case "/meta":
      return ok(demoMeta());

    case "/auth/me":
      return ok(demoAuthMe());

    case "/competitions":
      return ok(demoCompetitions());

    case "/teams": {
      const competition = url.searchParams.get("competition");
      if (competition !== DEMO_COMPETITION_CODE) {
        return fail("INVALID_INPUT", `competition must be ${DEMO_COMPETITION_CODE}`, { field: "competition" });
      }
      return ok(demoTeams());
    }

    case "/journey": {
      const teamId = url.searchParams.get("team_id");
      const season = url.searchParams.get("season");
      if (!teamId) return fail("INVALID_INPUT", "team_id is required", { field: "team_id" });
      if (!season || !/^\d{4}$/.test(season)) {
        return fail("INVALID_INPUT", "season must be a four-digit year", { field: "season" });
      }
      const journey = demoJourney(teamId, Number(season));
      // An unknown team or an out-of-range season is a 404, not an empty path:
      // an empty list would imply "this team genuinely has no fixtures".
      if (!journey) return fail("NOT_FOUND", "No journey for that team and season");
      return ok(journey);
    }

    case "/matches":
      return ok(demoMatches());

    case "/map/stadiums": {
      const date = url.searchParams.get("date");
      const matchdayRaw = url.searchParams.get("matchday");
      if ((date === null) === (matchdayRaw === null)) {
        return fail("INVALID_INPUT", "Supply exactly one of date or matchday", {
          field: date === null ? "date" : "matchday",
        });
      }
      if (date !== null && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return fail("INVALID_INPUT", "date must be YYYY-MM-DD", { field: "date" });
      }
      const matchday = matchdayRaw === null ? null : Number(matchdayRaw);
      if (matchday !== null && (!Number.isInteger(matchday) || matchday < 1)) {
        return fail("INVALID_INPUT", "matchday must be a positive integer", { field: "matchday" });
      }
      const map = demoStadiumMap({ date, matchday });
      if (!map) return fail("INVALID_INPUT", "Supply exactly one of date or matchday");
      return ok(map);
    }

    default: {
      // GET /matches/{id}
      if (path.length === 2 && path[0] === "matches") {
        const detail = demoMatchDetail(path[1] ?? "");
        if (!detail) return fail("NOT_FOUND", "Match not found");
        return ok(detail);
      }

      // GET /competitions/{code}/matchdays?season=YYYY
      if (path.length === 3 && path[0] === "competitions" && path[2] === "matchdays") {
        if (path[1] !== DEMO_COMPETITION_CODE) return fail("NOT_FOUND", "Competition not found");
        if (url.searchParams.get("season") !== String(DEMO_SEASON)) {
          return fail("INVALID_INPUT", "season must be the Phase 1 default season", { field: "season" });
        }
        return ok(demoMatchdays());
      }
      return notYetAvailable(route);
    }
  }
}

/**
 * No demo writes. Register/login/logout, predictions, room posts and What-if
 * turns are all backend-authoritative, so demo mode refuses them rather than
 * faking a success the server never granted.
 */
async function refuseWrite(
  _request: Request,
  context: { params: Promise<{ path?: string[] }> },
): Promise<NextResponse> {
  const { path = [] } = await context.params;
  return notYetAvailable(`/${path.join("/")}`);
}

export const POST = refuseWrite;
export const PUT = refuseWrite;
export const PATCH = refuseWrite;
export const DELETE = refuseWrite;
