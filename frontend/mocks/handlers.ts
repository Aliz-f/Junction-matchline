/**
 * FE-00 frozen MSW handlers. Only endpoints whose complete Appendix A response
 * is determined by the BE-00 manifest are registered here; every other route is
 * deliberately unhandled until the gaps in `FE00_HANDOFF.md` are resolved, so
 * tests using `onUnhandledRequest: "error"` cannot silently rely on invented data.
 */
import { http, HttpResponse } from "msw";
import { competitionSummary, manifest, seasonMatchdays, teamSummaries } from "./fixtures";
import { errorResponse, PRIVATE_HEADERS } from "./errors";
import type { CompetitionSummary, HealthResponse, TeamSummary, UserPublic } from "@/lib/api/types";

/** Browser-facing same-origin base path (A1). */
export const API = "*/api/v1";

export const handlers = [
  http.get(`${API}/health`, () => HttpResponse.json<HealthResponse>({ status: "ok", database: "ok" })),

  // Guest session: no cookie handling exists before FE-02.
  http.get(`${API}/auth/me`, () =>
    HttpResponse.json<{ user: UserPublic | null }>({ user: null }, { headers: PRIVATE_HEADERS }),
  ),

  http.get(`${API}/competitions`, () =>
    HttpResponse.json<{ items: CompetitionSummary[] }>({ items: [competitionSummary()] }),
  ),

  http.get(`${API}/teams`, ({ request }) => {
    const competition = new URL(request.url).searchParams.get("competition");
    if (competition !== manifest.competition.code) {
      return errorResponse("INVALID_INPUT", "competition must be PL", { details: { field: "competition" } });
    }
    return HttpResponse.json<{ items: TeamSummary[] }>({ items: teamSummaries() });
  }),

  http.get(`${API}/competitions/:code/matchdays`, ({ params, request }) => {
    if (params.code !== manifest.competition.code) {
      return errorResponse("NOT_FOUND", "Competition not found");
    }
    const season = new URL(request.url).searchParams.get("season");
    if (season !== String(manifest.competition.season_start_year)) {
      return errorResponse("INVALID_INPUT", "season must be the Phase 1 default season", {
        details: { field: "season" },
      });
    }
    return HttpResponse.json<{ items: number[] }>({ items: seasonMatchdays() });
  }),
];
