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
  demoMatchImpact,
  demoMeta,
  demoRelevantImpact,
  demoRoom,
  demoRoomChanges,
  demoRoomMessages,
  demoRooms,
  demoMatchRooms,
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
 * Private, session-scoped endpoints.
 *
 * Demo mode has no session, so the caller is always a guest and the honest
 * contract answer is 401 `UNAUTHENTICATED` — not a provider error. This makes
 * the UI's sign-in-required paths real rather than hypothetical.
 */
function requiresSignIn(): NextResponse {
  return fail("UNAUTHENTICATED", "Sign in to use this feature");
}

/** True for any path whose response depends on who is asking. */
function isPrivatePath(path: readonly string[]): boolean {
  const route = `/${path.join("/")}`;
  if (route.startsWith("/users/me")) return true;
  // GET /matches/{id}/predictions/me
  if (path.length === 4 && path[0] === "matches" && path[2] === "predictions" && path[3] === "me") {
    return true;
  }
  if (route.startsWith("/whatif/")) return true;
  // GET /matches/{id}/whatif/threads
  if (path.length === 4 && path[0] === "matches" && path[2] === "whatif") return true;
  return false;
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

    case "/impact/relevant": {
      const favorite = url.searchParams.get("favorite_team_id");
      const season = url.searchParams.get("season");
      const limitRaw = url.searchParams.get("limit");
      if (!favorite) return fail("INVALID_INPUT", "favorite_team_id is required", { field: "favorite_team_id" });
      if (!season || !/^\d{4}$/.test(season)) {
        return fail("INVALID_INPUT", "season must be a four-digit year", { field: "season" });
      }
      const limit = limitRaw === null ? 20 : Number(limitRaw);
      // A1 caps the page size at 100.
      if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
        return fail("INVALID_INPUT", "limit must be between 1 and 100", { field: "limit" });
      }
      const page = demoRelevantImpact(favorite, Number(season), limit, url.searchParams.get("cursor"));
      if (!page) return fail("NOT_FOUND", "No impact for that club and season");
      return ok(page);
    }

    case "/rooms":
      return ok(demoRooms());

    case "/standings":
      // Deliberately unimplemented: see the Impact note in lib/demo/responses.ts.
      // Gap G7 means there is no standings evidence, and inventing a table is
      // exactly what the rules forbid.
      return notYetAvailable("/standings");

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
      if (isPrivatePath(path)) return requiresSignIn();

      // GET /rooms/{id} | /rooms/{id}/messages | /rooms/{id}/changes
      //
      // A HIDDEN template returns the SAME 404 as an unknown id on every one of
      // these, so knowing the UUID reveals nothing about whether it exists.
      if (path.length >= 2 && path[0] === "rooms") {
        const roomId = path[1] ?? "";
        const leaf = path[2];

        if (path.length === 2) {
          const room = demoRoom(roomId);
          return room ? ok(room) : fail("NOT_FOUND", "Room not found");
        }

        if (path.length === 3 && leaf === "messages") {
          const page = demoRoomMessages(roomId);
          return page ? ok(page) : fail("NOT_FOUND", "Room not found");
        }

        if (path.length === 3 && leaf === "changes") {
          const afterRaw = url.searchParams.get("after_seq");
          const afterSeq = afterRaw === null ? 0 : Number(afterRaw);
          if (!Number.isInteger(afterSeq) || afterSeq < 0) {
            return fail("INVALID_INPUT", "after_seq must be a non-negative integer", {
              field: "after_seq",
            });
          }
          const changes = demoRoomChanges(roomId, afterSeq);
          return changes ? ok(changes) : fail("NOT_FOUND", "Room not found");
        }

        return fail("NOT_FOUND", "Room not found");
      }

      // GET /matches/{id}/rooms
      if (path.length === 3 && path[0] === "matches" && path[2] === "rooms") {
        const rooms = demoMatchRooms(path[1] ?? "");
        return rooms ? ok(rooms) : fail("NOT_FOUND", "Match not found");
      }

      // GET /matches/{id}/impact?favorite_team_id=UUID
      if (path.length === 3 && path[0] === "matches" && path[2] === "impact") {
        const favorite = url.searchParams.get("favorite_team_id");
        if (!favorite) {
          return fail("INVALID_INPUT", "favorite_team_id is required", { field: "favorite_team_id" });
        }
        const insight = demoMatchImpact(path[1] ?? "", favorite);
        if (!insight) return fail("NOT_FOUND", "Match not found");
        return ok(insight);
      }

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
  const route = `/${path.join("/")}`;

  // Everything that mutates user state needs a session, and demo mode has
  // none. 401 is the contract-correct answer for a guest, so the UI's
  // sign-in prompts are exercised for real.
  const needsSession =
    route.startsWith("/users/me") ||
    route.startsWith("/whatif/") ||
    route.startsWith("/reports") ||
    (path[0] === "matches" && (path[2] === "predictions" || path[2] === "whatif" || path[2] === "rooms")) ||
    (path[0] === "rooms" && path[2] === "messages");

  if (needsSession) return requiresSignIn();
  return notYetAvailable(route);
}

export const POST = refuseWrite;
export const PUT = refuseWrite;
export const PATCH = refuseWrite;
export const DELETE = refuseWrite;
