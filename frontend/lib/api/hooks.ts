/**
 * Query and mutation hooks (FE-02).
 *
 * Each hook validates its response against the Appendix A schema, so a drifted
 * field fails loudly instead of rendering as `undefined`. Private reads are
 * keyed by identity scope; see `keys.ts`.
 */
"use client";

import { useMutation, useQuery, useQueryClient, type UseQueryResult } from "@tanstack/react-query";
import { z } from "zod";
import {
  AuthUserResponse,
  CompetitionSummary,
  ImpactInsight,
  JourneyResponse,
  MatchDetail,
  MatchSummary,
  MetaView,
  RoomSummary,
  StadiumMapResponse,
  StandingsResponse,
  TeamSummary,
  Uuid,
} from "./contract";
import { apiRequest, apiRequestVoid } from "./client";
import { identityScope, publicKeys, userKeys } from "./keys";
import type {
  CompetitionSummary as CompetitionSummaryType,
  MatchDetail as MatchDetailType,
  MetaView as MetaViewType,
  TeamSummary as TeamSummaryType,
  UserPublic,
} from "./types";

/** `GET /auth/me` always returns `{user: null | UserPublic}` (A1). */
const SessionResponse = z.object({ user: AuthUserResponse.shape.user.nullable() }).strict();
const TeamList = z.object({ items: z.array(TeamSummary) }).strict();
const CompetitionList = z.object({ items: z.array(CompetitionSummary) }).strict();
const FavoriteResponse = z.object({ favorite_team_id: Uuid.nullable() }).strict();
/** A1 page envelope: `{items, next_cursor}`. */
const MatchPage = z.object({ items: z.array(MatchSummary), next_cursor: z.string().nullable() }).strict();
const MatchdayList = z.object({ items: z.array(z.number().int()) }).strict();
const RoomPage = z.object({ items: z.array(RoomSummary), next_cursor: z.string().nullable() }).strict();
const RoomList = z.object({ items: z.array(RoomSummary) }).strict();
const ImpactPage = z.object({ items: z.array(ImpactInsight), next_cursor: z.string().nullable() }).strict();

/**
 * The current session.
 *
 * Deliberately not keyed by identity: this query *establishes* identity. It is
 * always `no-store` so a stale session is never shown after logout.
 */
export function useSession(): { user: UserPublic | null; isLoading: boolean; isError: boolean } {
  const query = useQuery({
    queryKey: userKeys.session(),
    queryFn: () => apiRequest("/auth/me", SessionResponse),
  });

  return {
    user: query.data?.user ?? null,
    isLoading: query.isLoading,
    isError: query.isError,
  };
}

/** `/meta`: server clock, mode and capabilities. Backend is authoritative. */
export function useMeta(): UseQueryResult<MetaViewType> {
  return useQuery({
    queryKey: publicKeys.meta(),
    queryFn: () => apiRequest("/meta", MetaView),
  });
}

export function useCompetitions(): UseQueryResult<{ items: CompetitionSummaryType[] }> {
  return useQuery({
    queryKey: publicKeys.competitions(),
    queryFn: () => apiRequest("/competitions", CompetitionList),
  });
}

/** Teams for the picker. Public, identical for every viewer. */
export function useTeams(competition = "PL"): UseQueryResult<{ items: TeamSummaryType[] }> {
  return useQuery({
    queryKey: publicKeys.teams(competition),
    queryFn: () => apiRequest("/teams", TeamList, { query: { competition } }),
  });
}

/**
 * The Journey for a team and season.
 *
 * Disabled until a team is known, so no request is sent with an empty
 * `team_id`. Browsing without a favourite is still possible via `/matches`.
 */
export function useJourney(teamId: string | null, season: number | null): UseQueryResult<z.infer<typeof JourneyResponse>> {
  return useQuery({
    queryKey: publicKeys.journey(teamId ?? "none", season ?? 0),
    queryFn: () =>
      apiRequest("/journey", JourneyResponse, { query: { team_id: teamId, season } }),
    enabled: Boolean(teamId) && Boolean(season),
  });
}

/**
 * Every fixture, for browsing without a favourite club.
 *
 * Takes no team parameter on purpose: this list must not change with the
 * viewer's favourite.
 */
export function useAllMatches(): UseQueryResult<z.infer<typeof MatchPage>> {
  return useQuery({
    queryKey: publicKeys.matches(),
    queryFn: () => apiRequest("/matches", MatchPage),
  });
}

/**
 * Stadium map for exactly one selector.
 *
 * The caller must pass a `date` OR a `matchday`, never both: the backend
 * rejects the ambiguous case and the UI must not paper over it.
 */
/** A1 caps the page size at 100; request the maximum to minimise round trips. */
const IMPACT_PAGE_LIMIT = 100;

/**
 * All relevant other-team fixtures for a favourite club.
 *
 * Follows `next_cursor` to null inside the query function, because FE-06
 * requires the COMPLETE set: using only the first page would silently
 * under-report map overlays and the impact feed. A partial failure rejects the
 * whole query so the UI shows impact as unavailable rather than as a short list
 * that looks complete.
 */
export function useRelevantImpact(
  favoriteTeamId: string | null,
  season: number | null,
): UseQueryResult<{ items: z.infer<typeof ImpactInsight>[] }> {
  return useQuery({
    queryKey: publicKeys.relevantImpact(favoriteTeamId ?? "none", season ?? 0),
    enabled: Boolean(favoriteTeamId) && Boolean(season),
    queryFn: async () => {
      const items: z.infer<typeof ImpactInsight>[] = [];
      let cursor: string | null = null;
      // Bounded so a misbehaving cursor cannot loop forever.
      for (let page = 0; page < 50; page += 1) {
        const result: z.infer<typeof ImpactPage> = await apiRequest("/impact/relevant", ImpactPage, {
          query: {
            favorite_team_id: favoriteTeamId,
            competition: "PL",
            season,
            limit: IMPACT_PAGE_LIMIT,
            cursor,
          },
        });
        items.push(...result.items);
        cursor = result.next_cursor;
        if (cursor === null) return { items };
      }
      throw new Error("Impact pagination did not terminate");
    },
  });
}

/** Impact for one fixture, relative to the viewer's favourite club. */
export function useMatchImpact(
  matchId: string | null,
  favoriteTeamId: string | null,
): UseQueryResult<z.infer<typeof ImpactInsight>> {
  return useQuery({
    queryKey: publicKeys.matchImpact(matchId ?? "none", favoriteTeamId ?? "none"),
    enabled: Boolean(matchId) && Boolean(favoriteTeamId),
    queryFn: () =>
      apiRequest(`/matches/${matchId}/impact`, ImpactInsight, {
        query: { favorite_team_id: favoriteTeamId, competition: "PL" },
      }),
  });
}

/**
 * Discoverable rooms. Partitioned by identity, because `can_post` and
 * `can_create` are contextual permissions that differ per caller (CT-08).
 */
export function useRooms(): UseQueryResult<z.infer<typeof RoomPage>> {
  const { user } = useSession();
  const scope = identityScope(user?.id);
  return useQuery({
    queryKey: userKeys.roomsIndex(scope),
    queryFn: () => apiRequest("/rooms", RoomPage, { query: { competition: "PL" } }),
  });
}

/** Rooms for one match, for the match page's Discuss tab. */
export function useMatchRooms(matchId: string | null): UseQueryResult<z.infer<typeof RoomList>> {
  const { user } = useSession();
  const scope = identityScope(user?.id);
  return useQuery({
    queryKey: userKeys.rooms(scope, matchId ?? "none"),
    enabled: Boolean(matchId),
    queryFn: () => apiRequest(`/matches/${matchId}/rooms`, RoomList),
  });
}

/**
 * One room by id.
 *
 * Always fetched directly rather than looked up in the index, so a direct link
 * works after a refresh (FE-07) and a hidden room 404s uniformly.
 */
export function useRoom(roomId: string | null): UseQueryResult<z.infer<typeof RoomSummary>> {
  const { user } = useSession();
  const scope = identityScope(user?.id);
  return useQuery({
    queryKey: userKeys.room(scope, roomId ?? "none"),
    enabled: Boolean(roomId),
    queryFn: () => apiRequest(`/rooms/${roomId}`, RoomSummary),
  });
}

/** The live league table. Positions and maths come from the server only. */
export function useStandings(
  competition: string,
  season: number | null,
): UseQueryResult<z.infer<typeof StandingsResponse>> {
  return useQuery({
    queryKey: publicKeys.standings(competition, season ?? 0),
    enabled: season !== null,
    queryFn: () =>
      apiRequest("/standings", StandingsResponse, { query: { competition, season } }),
  });
}

/** Matchdays available for explicit selection on the map. */
export function useMatchdays(
  competition: string,
  season: number | null,
): UseQueryResult<{ items: number[] }> {
  return useQuery({
    queryKey: publicKeys.matchdays(competition, season ?? 0),
    queryFn: () =>
      apiRequest(`/competitions/${competition}/matchdays`, MatchdayList, { query: { season } }),
    enabled: season !== null,
  });
}

export function useStadiumMap(
  selector: { date: string | null; matchday: number | null },
): UseQueryResult<z.infer<typeof StadiumMapResponse>> {
  const { date, matchday } = selector;
  const exactlyOne = (date === null) !== (matchday === null);

  return useQuery({
    queryKey: publicKeys.stadiumMap(date, matchday),
    queryFn: () =>
      apiRequest("/map/stadiums", StadiumMapResponse, {
        query: date !== null ? { date } : { matchday },
      }),
    enabled: exactlyOne,
  });
}

export function useMatch(matchId: string | null): UseQueryResult<MatchDetailType> {
  return useQuery({
    queryKey: publicKeys.match(matchId ?? "none"),
    queryFn: () => apiRequest(`/matches/${matchId}`, MatchDetail),
    enabled: Boolean(matchId),
  });
}

/**
 * Sets the authenticated user's favourite team.
 *
 * `null` is a valid value meaning "no favourite", so it is sent as-is rather
 * than being treated as "no change".
 */
export function useSetFavoriteTeam() {
  const queryClient = useQueryClient();
  const { user } = useSession();
  const scope = identityScope(user?.id);

  return useMutation({
    mutationFn: (teamId: string | null) =>
      apiRequest("/users/me/favorite-team", FavoriteResponse, {
        method: "PUT",
        body: { team_id: teamId },
      }),
    onSuccess: async () => {
      // The session carries `favorite_team_id`, and the Journey depends on it.
      await queryClient.invalidateQueries({ queryKey: userKeys.session() });
      await queryClient.invalidateQueries({ queryKey: userKeys.all(scope) });
      await queryClient.invalidateQueries({ queryKey: ["journey"] });
    },
  });
}

export function useLogin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { email: string; password: string }) =>
      apiRequest("/auth/login", AuthUserResponse, { method: "POST", body: payload }),
    onSuccess: async () => {
      // Identity changed: AuthBoundary clears the cache once the session
      // refetch lands.
      await queryClient.invalidateQueries({ queryKey: userKeys.session() });
    },
  });
}

export function useRegister() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { email: string; display_name: string; password: string }) =>
      apiRequest("/auth/register", AuthUserResponse, { method: "POST", body: payload }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: userKeys.session() });
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => apiRequestVoid("/auth/logout", { method: "POST" }),
    onSuccess: async () => {
      // Drop every private body immediately, then re-establish the guest session.
      queryClient.removeQueries();
      await queryClient.invalidateQueries({ queryKey: userKeys.session() });
    },
  });
}
