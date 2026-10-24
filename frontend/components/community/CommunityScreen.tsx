/**
 * Community room index (FE-07).
 *
 * Works without a favourite club: room discovery is global, so a guest with no
 * club selected still sees every discoverable room.
 *
 * Room creation is premium-only, but a FREE account must still be able to
 * contribute to existing rooms — so the explanation never implies that reading
 * or posting needs an upgrade.
 */
"use client";

import { useRooms, useSession } from "@/lib/api/hooks";
import { ApiError } from "@/lib/api/client";
import { EmptyState, ErrorState, SkeletonList } from "@/components/ui/States";
import { RoomCard } from "./RoomCard";
import Link from "next/link";

export function CommunityScreen() {
  const { user } = useSession();
  const rooms = useRooms();

  const canCreateAny = (rooms.data?.items ?? []).some((room) => room.can_create);

  return (
    <div className="space-y-5">
      {rooms.isLoading ? <SkeletonList rows={3} /> : null}

      {rooms.isError ? (
        <ErrorState
          title="Could not load rooms"
          description="The request failed. Nothing was changed."
          envelope={rooms.error instanceof ApiError ? rooms.error.envelope : null}
          onRetry={() => void rooms.refetch()}
        />
      ) : null}

      {rooms.data ? (
        rooms.data.items.length === 0 ? (
          <EmptyState
            title="No rooms yet"
            description="No discussion rooms are open at the moment. Rooms appear here as matches approach."
          />
        ) : (
          <ul className="space-y-2">
            {rooms.data.items.map((room) => (
              <li key={room.id}>
                <RoomCard room={room} />
              </li>
            ))}
          </ul>
        )
      ) : null}

      {/* Creation rights come from can_create, not from the plan alone. */}
      {rooms.data && !canCreateAny ? (
        <p className="rounded-md border border-line bg-surface-sunken px-3 py-2 text-sm text-ink-muted">
          {user === null ? (
            <>
              <Link href="/login" className="font-semibold text-ink underline">
                Sign in
              </Link>{" "}
              to join a discussion. Anyone can read these rooms, and a free account can post in any
              open one.
            </>
          ) : (
            <>
              <span className="font-semibold text-ink">Creating rooms needs a premium account.</span>{" "}
              Your account can still post in any open room above. See{" "}
              <Link href="/premium" className="font-semibold text-ink underline">
                what premium adds
              </Link>
              .
            </>
          )}
        </p>
      ) : null}
    </div>
  );
}
