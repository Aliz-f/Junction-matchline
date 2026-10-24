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
  JourneyResponse,
  MatchDetail,
  MatchSummary,
  MetaView,
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
