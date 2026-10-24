/**
 * What-if queries (FE-09).
 *
 * Every one of these is private and identity-scoped: another user's thread must
 * surface as not-found, and a cached thread must disappear on an account switch.
 */
"use client";

import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { z } from "zod";
import { WhatifThread, WhatifThreadDetail } from "@/lib/api/contract";
import { apiRequest } from "@/lib/api/client";
import { identityScope, userKeys } from "@/lib/api/keys";
import { useSession } from "@/lib/api/hooks";

const ThreadList = z.object({ items: z.array(WhatifThread), next_cursor: z.string().nullable() }).strict();

/** Threads for one match, owned by the caller. */
export function useWhatifThreads(matchId: string | null): UseQueryResult<z.infer<typeof ThreadList>> {
  const { user } = useSession();
  const scope = identityScope(user?.id);
  return useQuery({
    queryKey: [...userKeys.whatifThreads(scope), "match", matchId ?? "none"],
    enabled: Boolean(matchId) && user !== null,
    queryFn: () => apiRequest(`/matches/${matchId}/whatif/threads`, ThreadList),
  });
}

/** Every thread the caller owns, for the profile list. */
export function useAllWhatifThreads(): UseQueryResult<z.infer<typeof ThreadList>> {
  const { user } = useSession();
  const scope = identityScope(user?.id);
  return useQuery({
    queryKey: userKeys.whatifThreads(scope),
    enabled: user !== null,
    queryFn: () => apiRequest("/users/me/whatif/threads", ThreadList),
  });
}

/** One thread with its messages. */
export function useWhatifThread(
  threadId: string | null,
): UseQueryResult<z.infer<typeof WhatifThreadDetail>> {
  const { user } = useSession();
  const scope = identityScope(user?.id);
  return useQuery({
    queryKey: userKeys.whatifThread(scope, threadId ?? "none"),
    enabled: Boolean(threadId) && user !== null,
    queryFn: () => apiRequest(`/whatif/threads/${threadId}`, WhatifThreadDetail),
  });
}
