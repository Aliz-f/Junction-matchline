/** Contextual community-room pop-up for one Journey node. */
"use client";

import { useEffect } from "react";
import Link from "next/link";
import { createPortal } from "react-dom";
import { useMatchRooms } from "@/lib/api/hooks";
import type { RoomKind } from "@/lib/api/types";

const labels: Record<RoomKind, string> = {
  PRE_MATCH: "Pre-match discussion",
  POST_MATCH: "Post-match discussion",
};

export function JourneyRoomPopover({
  matchId,
  kind,
  onClose,
}: {
  readonly matchId: string;
  readonly kind: RoomKind;
  readonly onClose: () => void;
}) {
  const rooms = useMatchRooms(matchId);
  const matching = (rooms.data?.items ?? []).filter((room) => room.kind === kind);

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  const dialog = (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={`journey-room-${matchId}-${kind}`}
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/55 p-4 sm:items-center"
      onMouseDown={onClose}
    >
      <section
        className="w-full max-w-sm rounded-2xl border border-line bg-surface-raised p-5 shadow-2xl"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-ink-muted">Community room</p>
            <h2 id={`journey-room-${matchId}-${kind}`} className="mt-1 text-lg font-black text-ink">
              {labels[kind]}
            </h2>
          </div>
          <button type="button" onClick={onClose} className="rounded-md px-2 py-1 text-sm font-semibold text-ink">
            Close
          </button>
        </div>

        {rooms.isLoading ? <p className="mt-4 text-sm text-ink-muted">Loading discussion…</p> : null}
        {rooms.isError ? <p className="mt-4 text-sm text-ink-muted">This discussion could not be loaded.</p> : null}
        {!rooms.isLoading && !rooms.isError && matching.length === 0 ? (
          <p className="mt-4 text-sm text-ink-muted">This room is not discoverable right now.</p>
        ) : null}
        {matching.map((room) => (
          <Link
            key={room.id}
            href={`/community/rooms/${room.id}`}
            className="mt-4 block rounded-xl border border-line bg-surface-sunken p-3 hover:bg-surface-raised"
          >
            <strong className="block text-sm text-ink">{room.title}</strong>
            <span className="mt-1 block text-xs text-ink-muted">
              {room.message_count} {room.message_count === 1 ? "message" : "messages"} · {room.status === "OPEN" ? "Open" : "Read-only"}
            </span>
          </Link>
        ))}
      </section>
    </div>
  );

  // Journey nodes sit in transformed, absolutely positioned list items. A
  // portal prevents that containing block from shrinking a fixed dialog into a
  // tiny card beside the node.
  if (typeof document === "undefined") return null;
  return createPortal(dialog, document.body);
}
