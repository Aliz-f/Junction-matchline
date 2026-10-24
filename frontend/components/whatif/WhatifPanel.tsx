/**
 * Private What-if analysis (FE-09), shown in the match page's What-if tab.
 *
 * Only reachable when the backend reports `features.whatif_available`, i.e. the
 * match is authoritatively FINISHED — the tab itself is gated in `matchTabs.ts`.
 *
 * Threads are private to the signed-in user and are never published: there is no
 * share control anywhere in this component, and `/meta.capabilities
 * .whatif_sharing` stays false for all of Phase 1.
 */
"use client";

import { useState } from "react";
import Link from "next/link";
import { useSession } from "@/lib/api/hooks";
import { useWhatifThreads } from "@/lib/whatif/useWhatif";
import { ApiError } from "@/lib/api/client";
import { EmptyState, ErrorState, SkeletonList } from "@/components/ui/States";
import { DemoAiBadge } from "@/components/ui/SourceBadge";
import { WhatifThreadView } from "./WhatifThreadView";
import type { MatchDetail } from "@/lib/api/types";

export function WhatifPanel({ match }: { readonly match: MatchDetail }) {
  const { user, isLoading } = useSession();
  const threads = useWhatifThreads(match.id);
  const [openThreadId, setOpenThreadId] = useState<string | null>(null);

  if (isLoading) return <SkeletonList rows={2} />;

  if (user === null) {
    return (
      <EmptyState
        title="Sign in to open a What-if thread"
        description="What-if conversations are private to your account, so they need you to be signed in. They are never shared or published."
        action={
          <Link href="/login" className="rounded-md bg-ink px-3 py-1.5 text-sm font-semibold text-surface-raised">
            Sign in
          </Link>
        }
      />
    );
  }

  if (openThreadId !== null) {
    return (
      <div className="space-y-3">
        <button
          type="button"
          onClick={() => setOpenThreadId(null)}
          className="text-sm font-semibold text-ink underline"
        >
          ← All threads for this match
        </button>
        <WhatifThreadView threadId={openThreadId} userId={user.id} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="flex flex-wrap items-center gap-2 text-sm text-ink-muted">
        <DemoAiBadge />
        <span>
          Put a hypothesis about this match to the AI. It will weigh supporting and conflicting
          verified evidence and say what it cannot know. Conclusions are arguments, not results.
        </span>
      </p>

      {threads.isLoading ? <SkeletonList rows={2} /> : null}

      {threads.isError ? (
        <ErrorState
          title="Could not load your threads"
          description="Your private threads could not be read."
          envelope={threads.error instanceof ApiError ? threads.error.envelope : null}
          onRetry={() => void threads.refetch()}
        />
      ) : null}

      {threads.data ? (
        threads.data.items.length === 0 ? (
          <EmptyState
            title="No threads yet"
            description="Start one to ask what might have happened differently in this match."
          />
        ) : (
          <ul className="space-y-2">
            {threads.data.items.map((thread) => (
              <li key={thread.id}>
                <button
                  type="button"
                  onClick={() => setOpenThreadId(thread.id)}
                  className="w-full rounded-lg border border-line bg-surface-raised p-3 text-left hover:bg-surface-sunken"
                >
                  <p className="text-sm font-bold text-ink">{thread.title}</p>
                  <p className="mt-0.5 text-xs text-ink-muted">Private to you</p>
                </button>
              </li>
            ))}
          </ul>
        )
      ) : null}
    </div>
  );
}
