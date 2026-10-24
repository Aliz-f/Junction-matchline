/**
 * Client providers (FE-02).
 *
 * The query cache defaults to never retaining anything across an identity
 * change. `AuthBoundary` watches the session and clears the whole cache on
 * login, logout, user switch or plan change, which is what CT-08 and CT-12
 * require: no cross-user cache leak, and private bodies gone at logout.
 */
"use client";

import { useEffect, useRef, useState } from "react";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { ApiError } from "@/lib/api/client";
import { useSession } from "@/lib/api/hooks";

function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Private data must not be served stale from a previous view.
        staleTime: 0,
        gcTime: 5 * 60_000,
        refetchOnWindowFocus: false,
        retry: (failureCount, error) => {
          // Never retry a decision the server already made deliberately.
          if (error instanceof ApiError) {
            if (error.status === 401 || error.status === 403 || error.status === 404) return false;
            if (error.status === 409 || error.status === 422) return false;
          }
          return failureCount < 2;
        },
      },
      mutations: { retry: 0 },
    },
  });
}

/**
 * Clears every cached response when the viewing identity changes.
 *
 * Keyed on user id *and* plan, because a plan change alters contextual
 * permissions (`can_post`, `can_create`) without changing the user id.
 */
function AuthBoundary({ children }: { readonly children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const { user } = useSession();
  const identity = user ? `${user.id}:${user.plan}:${user.role}` : "guest";
  const previous = useRef<string | null>(null);

  useEffect(() => {
    if (previous.current !== null && previous.current !== identity) {
      // Remove, not invalidate: the old identity's bodies must not be readable
      // even briefly while a refetch is in flight.
      queryClient.removeQueries();
    }
    previous.current = identity;
  }, [identity, queryClient]);

  return <>{children}</>;
}

export function Providers({ children }: { readonly children: React.ReactNode }) {
  // Created in state so each browser session gets exactly one client, and so it
  // is never shared between requests on the server.
  const [queryClient] = useState(makeQueryClient);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthBoundary>{children}</AuthBoundary>
    </QueryClientProvider>
  );
}
