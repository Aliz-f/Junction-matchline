/**
 * FE-07 room synchronisation (CT-16 / CT-19).
 *
 * The change feed is where room UIs quietly corrupt themselves, so these cover
 * the ordering rules directly: cursor advancement on all-REMOVE pages,
 * idempotent duplicate REMOVEs, removals applied to older pages, reinstatement
 * by a genuinely newer UPSERT, and stable order for equal timestamps.
 */
import { describe, expect, it } from "vitest";
import {
  EMPTY_ROOM_STATE,
  applyChange,
  applyChangePage,
  initFromPage,
  orderedMessages,
  prependOlderPage,
  visibleCount,
} from "@/lib/rooms/sync";
import type { RoomChange, RoomMessage } from "@/lib/api/types";

const AUTHOR = {
  id: "50000000-0000-4000-8000-000000000001",
  display_name: "Supporter",
  public_badges: [],
};

function message(n: number, createdAt = `2026-10-24T12:00:${String(n).padStart(2, "0")}Z`): RoomMessage {
  return {
    id: `60000000-0000-4000-8000-${String(n).padStart(12, "0")}`,
    room_id: "70000000-0000-4000-8000-000000000010",
    body: `Message ${n}`,
    created_at: createdAt,
    author: AUTHOR,
    moderation_state: "VISIBLE",
  };
}

const upsert = (seq: number, msg: RoomMessage): RoomChange => ({
  seq,
  kind: "UPSERT",
  message_id: msg.id,
  message: msg,
});

const remove = (seq: number, id: string): RoomChange => ({
  seq,
  kind: "REMOVE",
  message_id: id,
  message: null,
});

describe("initFromPage", () => {
  it("seeds messages and takes the atomic sync_after_seq", () => {
    const state = initFromPage({
      items: [message(1), message(2)],
      next_cursor: "older",
      sync_after_seq: 42,
    });
    expect(visibleCount(state)).toBe(2);
    expect(state.afterSeq).toBe(42);
    expect(state.olderCursor).toBe("older");
  });

  it("accepts an empty room, which still carries a cursor", () => {
    const state = initFromPage({ items: [], next_cursor: null, sync_after_seq: 0 });
    expect(visibleCount(state)).toBe(0);
    expect(state.afterSeq).toBe(0);
  });
});

describe("ordering", () => {
  it("returns messages ascending by time", () => {
    const state = initFromPage({
      items: [message(3), message(1), message(2)],
      next_cursor: null,
      sync_after_seq: 0,
    });
    expect(orderedMessages(state).map((m) => m.body)).toEqual(["Message 1", "Message 2", "Message 3"]);
  });

  it("breaks equal timestamps by id, so the order is stable", () => {
    const same = "2026-10-24T12:00:00Z";
    const state = initFromPage({
      items: [message(9, same), message(2, same), message(5, same)],
      next_cursor: null,
      sync_after_seq: 0,
    });
    const ids = orderedMessages(state).map((m) => m.id);
    expect(ids).toEqual([...ids].sort());
    // And it is the same on a second call: no shuffling between polls.
    expect(orderedMessages(state).map((m) => m.id)).toEqual(ids);
  });

  it("never yields duplicates", () => {
    let state = initFromPage({ items: [message(1)], next_cursor: null, sync_after_seq: 0 });
    state = applyChange(state, upsert(1, message(1)));
    state = applyChange(state, upsert(2, message(1)));
    expect(visibleCount(state)).toBe(1);
  });
});

describe("applyChange", () => {
  it("adds a new message by UPSERT", () => {
    const state = applyChange(EMPTY_ROOM_STATE, upsert(1, message(1)));
    expect(visibleCount(state)).toBe(1);
    expect(state.afterSeq).toBe(1);
  });

  it("replaces an edited message in place", () => {
    const edited = { ...message(1), body: "Edited" };
    let state = initFromPage({ items: [message(1)], next_cursor: null, sync_after_seq: 0 });
    state = applyChange(state, upsert(5, edited));
    expect(visibleCount(state)).toBe(1);
    expect(orderedMessages(state)[0]!.body).toBe("Edited");
  });

  it("removes a message with no placeholder left behind", () => {
    let state = initFromPage({ items: [message(1), message(2)], next_cursor: null, sync_after_seq: 0 });
    state = applyChange(state, remove(3, message(1).id));
    expect(visibleCount(state)).toBe(1);
    expect(orderedMessages(state).map((m) => m.body)).toEqual(["Message 2"]);
  });

  it("treats a duplicate REMOVE as a no-op", () => {
    let state = initFromPage({ items: [message(1)], next_cursor: null, sync_after_seq: 0 });
    state = applyChange(state, remove(3, message(1).id));
    const after = applyChange(state, remove(3, message(1).id));
    expect(visibleCount(after)).toBe(0);
    expect(after.afterSeq).toBe(3);
  });

  it("records a REMOVE for a message it never held", () => {
    const state = applyChange(EMPTY_ROOM_STATE, remove(7, message(99).id));
    expect(state.removed.has(message(99).id)).toBe(true);
    expect(state.afterSeq).toBe(7);
  });

  it("ignores a stale operation with a lower seq", () => {
    let state = applyChange(EMPTY_ROOM_STATE, remove(10, message(1).id));
    state = applyChange(state, upsert(4, message(1)));
    // The older UPSERT must not resurrect it.
    expect(visibleCount(state)).toBe(0);
  });

  it("reinstates a removed message when a genuinely newer UPSERT arrives", () => {
    let state = applyChange(EMPTY_ROOM_STATE, remove(10, message(1).id));
    state = applyChange(state, upsert(11, message(1)));
    expect(visibleCount(state)).toBe(1);
    expect(state.removed.has(message(1).id)).toBe(false);
  });
});

describe("applyChangePage", () => {
  it("applies operations in seq order regardless of array order", () => {
    const state = applyChangePage(EMPTY_ROOM_STATE, {
      items: [remove(2, message(1).id), upsert(1, message(1))],
      next_after_seq: 2,
      has_more: false,
    });
    // seq 1 adds, seq 2 removes: the net result is removed.
    expect(visibleCount(state)).toBe(0);
  });

  it("advances the cursor on an all-REMOVE page (CT-19)", () => {
    let state = initFromPage({ items: [message(1)], next_cursor: null, sync_after_seq: 5 });
    state = applyChangePage(state, {
      items: [remove(6, message(1).id), remove(7, message(2).id)],
      next_after_seq: 20,
      has_more: false,
    });
    expect(state.afterSeq).toBe(20);
    expect(visibleCount(state)).toBe(0);
  });

  it("advances the cursor even on an entirely empty page", () => {
    const state = applyChangePage(EMPTY_ROOM_STATE, {
      items: [],
      next_after_seq: 99,
      has_more: false,
    });
    expect(state.afterSeq).toBe(99);
  });

  it("never lets the cursor go backwards", () => {
    let state = initFromPage({ items: [], next_cursor: null, sync_after_seq: 50 });
    state = applyChangePage(state, { items: [], next_after_seq: 10, has_more: false });
    expect(state.afterSeq).toBe(50);
  });

  it("handles 20 redactions followed by a later valid UPSERT (CT-19)", () => {
    const originals = Array.from({ length: 20 }, (_, i) => message(i + 1));
    let state = initFromPage({ items: originals, next_cursor: null, sync_after_seq: 20 });
    expect(visibleCount(state)).toBe(20);

    // Every original is redacted, each retaining its own event seq.
    state = applyChangePage(state, {
      items: originals.map((m, i) => remove(21 + i, m.id)),
      next_after_seq: 40,
      has_more: false,
    });
    expect(visibleCount(state)).toBe(0);
    expect(state.afterSeq).toBe(40);

    // A later legitimate message still arrives and is shown.
    const fresh = message(50, "2026-10-24T13:00:00Z");
    state = applyChangePage(state, {
      items: [upsert(41, fresh)],
      next_after_seq: 41,
      has_more: false,
    });
    expect(visibleCount(state)).toBe(1);
    expect(orderedMessages(state)[0]!.id).toBe(fresh.id);
  });
});

describe("prependOlderPage", () => {
  it("prepends older messages and keeps chronological order", () => {
    let state = initFromPage({
      items: [message(5), message(6)],
      next_cursor: "c1",
      sync_after_seq: 10,
    });
    state = prependOlderPage(state, {
      items: [message(1), message(2)],
      next_cursor: null,
      sync_after_seq: 10,
    });
    expect(orderedMessages(state).map((m) => m.body)).toEqual([
      "Message 1",
      "Message 2",
      "Message 5",
      "Message 6",
    ]);
    expect(state.olderCursor).toBeNull();
  });

  it("will not reintroduce a message already removed by a change", () => {
    let state = initFromPage({ items: [], next_cursor: "c1", sync_after_seq: 0 });
    state = applyChange(state, remove(3, message(1).id));
    state = prependOlderPage(state, {
      items: [message(1), message(2)],
      next_cursor: null,
      sync_after_seq: 0,
    });
    // Page >5 case: a hidden message must stay hidden when paging backwards.
    expect(visibleCount(state)).toBe(1);
    expect(orderedMessages(state)[0]!.body).toBe("Message 2");
  });

  it("does not duplicate a message already loaded", () => {
    let state = initFromPage({ items: [message(1)], next_cursor: "c1", sync_after_seq: 0 });
    state = prependOlderPage(state, {
      items: [message(1)],
      next_cursor: null,
      sync_after_seq: 0,
    });
    expect(visibleCount(state)).toBe(1);
  });

  it("does not regress the change cursor", () => {
    let state = initFromPage({ items: [], next_cursor: "c1", sync_after_seq: 30 });
    state = prependOlderPage(state, { items: [], next_cursor: null, sync_after_seq: 2 });
    expect(state.afterSeq).toBe(30);
  });
});

describe("empty room then a burst at the page limit", () => {
  it("absorbs 45 messages arriving after an empty initial page", () => {
    let state = initFromPage({ items: [], next_cursor: null, sync_after_seq: 0 });
    expect(visibleCount(state)).toBe(0);

    const burst = Array.from({ length: 45 }, (_, i) =>
      message(i + 1, `2026-10-24T12:${String(i).padStart(2, "0")}:00Z`),
    );

    // Delivered across pages, as a limit-20 feed would.
    for (let page = 0; page < 3; page += 1) {
      const slice = burst.slice(page * 20, page * 20 + 20);
      if (slice.length === 0) break;
      state = applyChangePage(state, {
        items: slice.map((m, i) => upsert(page * 20 + i + 1, m)),
        next_after_seq: page * 20 + slice.length,
        has_more: page < 2,
      });
    }

    expect(visibleCount(state)).toBe(45);
    expect(state.afterSeq).toBe(45);
    const ordered = orderedMessages(state);
    expect(new Set(ordered.map((m) => m.id)).size).toBe(45);
    expect(ordered[0]!.body).toBe("Message 1");
    expect(ordered[44]!.body).toBe("Message 45");
  });
});
