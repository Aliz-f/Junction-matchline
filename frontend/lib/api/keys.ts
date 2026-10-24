/**
 * Query keys, partitioned by identity (FE-02, CT-08 / CT-12).
 *
 * Every cached response that can differ between viewers is keyed under an
 * **identity scope**, so one account can never read another's cached data and a
 * guest can never read a signed-in user's. The scope is the authenticated user
 * id, or the literal `"guest"`.
 *
 * `publicKeys` is for data that is identical for everyone (competitions, teams,
 * matchdays). Anything contextual — rooms with `can_post`, own profile,
 * predictions, private What-if — must use `userKeys`.
 */

/** Identity scope for cache partitioning. */
export type IdentityScope = string;

export const GUEST_SCOPE: IdentityScope = "guest";

export function identityScope(userId: string | null | undefined): IdentityScope {
  return userId ?? GUEST_SCOPE;
}

/** Data that does not vary by viewer. */
export const publicKeys = {
  meta: () => ["meta"] as const,
  health: () => ["health"] as const,
  competitions: () => ["competitions"] as const,
  teams: (competition: string) => ["teams", competition] as const,
  matchdays: (competition: string, season: number) => ["matchdays", competition, season] as const,
  journey: (teamId: string, season: number) => ["journey", teamId, season] as const,
  matches: () => ["matches"] as const,
  stadiumMap: (date: string | null, matchday: number | null) =>
    ["map", "stadiums", date, matchday] as const,
  match: (matchId: string) => ["match", matchId] as const,
};

/**
 * Data that varies by viewer. The scope is always the first segment after
 * `"user"`, which makes a whole-identity eviction a single prefix removal.
 */
export const userKeys = {
  all: (scope: IdentityScope) => ["user", scope] as const,
  session: () => ["user", "session"] as const,
  profile: (scope: IdentityScope) => ["user", scope, "profile"] as const,
  badges: (scope: IdentityScope) => ["user", scope, "badges"] as const,
  predictions: (scope: IdentityScope) => ["user", scope, "predictions"] as const,
  currentPrediction: (scope: IdentityScope, matchId: string) =>
    ["user", scope, "prediction", matchId] as const,
  rooms: (scope: IdentityScope, matchId: string) => ["user", scope, "rooms", matchId] as const,
  room: (scope: IdentityScope, roomId: string) => ["user", scope, "room", roomId] as const,
  roomChanges: (scope: IdentityScope, roomId: string) => ["user", scope, "room", roomId, "changes"] as const,
  whatifThreads: (scope: IdentityScope) => ["user", scope, "whatif"] as const,
  whatifThread: (scope: IdentityScope, threadId: string) => ["user", scope, "whatif", threadId] as const,
};
