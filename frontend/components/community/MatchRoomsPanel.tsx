/**
 * Rooms for one match (FE-07), shown in the match page's Discuss tab.
 *
 * A finished match keeps its pre-match room visible as a read-only archive, so
 * both kinds can appear here at once.
 */
"use client";

import { useMatchRooms } from "@/lib/api/hooks";
import { ApiError } from "@/lib/api/client";
import { EmptyState, ErrorState, SkeletonList } from "@/components/ui/States";
import { RoomCard } from "./RoomCard";

export function MatchRoomsPanel({ matchId }: { readonly matchId: string }) {
  const rooms = useMatchRooms(matchId);

  if (rooms.isLoading) return <SkeletonList rows={2} />;

  if (rooms.isError) {
    return (
      <ErrorState
        title="Could not load rooms"
        description="The request failed. Nothing was changed."
        envelope={rooms.error instanceof ApiError ? rooms.error.envelope : null}
        onRetry={() => void rooms.refetch()}
      />
    );
  }

  const items = rooms.data?.items ?? [];

  if (items.length === 0) {
    return (
      <EmptyState
        title="No room for this match yet"
        description="A pre-match room opens before kick-off, and a post-match room becomes available once the result is confirmed."
      />
    );
  }

  return (
    <ul className="space-y-2">
      {items.map((room) => (
        <li key={room.id}>
          <RoomCard room={room} />
        </li>
      ))}
    </ul>
  );
}
