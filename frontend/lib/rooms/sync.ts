/**
 * Room message synchronisation (FE-07, CT-16 / CT-19).
 *
 * A pure reducer, deliberately separate from React, because the ordering rules
 * are where room feeds go wrong and they deserve direct tests:
 *
 * - The initial page is the latest N public messages **ascending**, with an
 *   atomic `sync_after_seq` that is present even when the room is empty.
 * - Older messages arrive via `next_cursor` and are **prepended**.
 * - Live changes arrive as ordered UPSERT/REMOVE operations and must be applied
 *   to **every** loaded page, not just the newest one.
 * - `next_after_seq` always advances, **including for an all-REMOVE page**, so
 *   the cursor never stalls on redactions.
 * - A duplicate REMOVE is idempotent, and a REMOVE of something never loaded is
 *   still recorded, so a later older page cannot reintroduce it.
 * - A genuinely newer UPSERT for a previously removed id **reinstates** it:
 *   redaction is not permanent if the server later publishes a higher `seq`.
 *
 * Ordering is by `created_at`, tie-broken by id, so equal timestamps give a
 * stable order with no duplicates and no shuffling between polls.
 */
import type { RoomChange, RoomChangePage, RoomMessage, RoomMessagesPage } from "@/lib/api/types";

export type RoomSyncState = {
  /** Live messages by id. */
  readonly byId: ReadonlyMap<string, RoomMessage>;
  /** Highest `seq` applied per message, so stale operations are ignored. */
  readonly lastSeqById: ReadonlyMap<string, number>;
  /** Ids whose most recent operation was a REMOVE. */
  readonly removed: ReadonlySet<string>;
  /** Cursor for the next `/changes` request. */
  readonly afterSeq: number;
  /** Cursor for loading older messages, or null when fully loaded. */
  readonly olderCursor: string | null;
};

export const EMPTY_ROOM_STATE: RoomSyncState = {
  byId: new Map(),
  lastSeqById: new Map(),
  removed: new Set(),
  afterSeq: 0,
  olderCursor: null,
};

/** Ascending by time, then id. Stable for equal timestamps. */
export function orderedMessages(state: RoomSyncState): RoomMessage[] {
  return [...state.byId.values()].sort(
    (a, b) => Date.parse(a.created_at) - Date.parse(b.created_at) || a.id.localeCompare(b.id),
  );
}

/**
 * Seeds state from the initial page.
 *
 * `sync_after_seq` is taken as-is, including 0 for an empty room, because it is
 * the atomic point the change feed must resume from.
 */
export function initFromPage(page: RoomMessagesPage): RoomSyncState {
  const byId = new Map<string, RoomMessage>();
  for (const message of page.items) byId.set(message.id, message);

  return {
    byId,
    lastSeqById: new Map(),
    removed: new Set(),
    afterSeq: page.sync_after_seq,
    olderCursor: page.next_cursor,
  };
}

/**
 * Prepends an older page.
 *
 * Messages already removed by a change event are skipped, so paging backwards
 * can never resurrect redacted content. The change cursor never regresses.
 */
export function prependOlderPage(state: RoomSyncState, page: RoomMessagesPage): RoomSyncState {
  const byId = new Map(state.byId);
  for (const message of page.items) {
    if (state.removed.has(message.id)) continue;
    if (!byId.has(message.id)) byId.set(message.id, message);
  }

  return {
    ...state,
    byId,
    afterSeq: Math.max(state.afterSeq, page.sync_after_seq),
    olderCursor: page.next_cursor,
  };
}

/** Applies one operation. Exported for direct testing of the ordering rules. */
export function applyChange(state: RoomSyncState, change: RoomChange): RoomSyncState {
  const previousSeq = state.lastSeqById.get(change.message_id);

  // Stale or duplicate: a replayed REMOVE lands here and is a no-op.
  if (previousSeq !== undefined && change.seq <= previousSeq) {
    return { ...state, afterSeq: Math.max(state.afterSeq, change.seq) };
  }

  const byId = new Map(state.byId);
  const lastSeqById = new Map(state.lastSeqById);
  const removed = new Set(state.removed);

  if (change.kind === "UPSERT") {
    byId.set(change.message_id, change.message);
    // A newer UPSERT reinstates a previously removed message.
    removed.delete(change.message_id);
  } else {
    byId.delete(change.message_id);
    // Recorded even if it was never loaded, so an older page cannot reintroduce it.
    removed.add(change.message_id);
  }

  lastSeqById.set(change.message_id, change.seq);

  return {
    ...state,
    byId,
    lastSeqById,
    removed,
    afterSeq: Math.max(state.afterSeq, change.seq),
  };
}

/**
 * Applies a change page in `seq` order.
 *
 * The cursor is advanced to the server's `next_after_seq` regardless of what the
 * page contained — an all-REMOVE page still moves it forward (CT-19), which is
 * what stops polling from looping on redactions.
 */
export function applyChangePage(state: RoomSyncState, page: RoomChangePage): RoomSyncState {
  const ordered = [...page.items].sort((a, b) => a.seq - b.seq);
  let next = state;
  for (const change of ordered) next = applyChange(next, change);

  return { ...next, afterSeq: Math.max(next.afterSeq, page.next_after_seq) };
}

/** Public message count. Removed messages are excluded, with no placeholder. */
export function visibleCount(state: RoomSyncState): number {
  return state.byId.size;
}
