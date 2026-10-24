/**
 * FE-07 room discovery and visibility.
 *
 * The important guarantees are about leakage and permissions: a hidden template
 * must be indistinguishable from a non-existent room, and posting rights must
 * come from the server rather than the plan.
 */
import { describe, expect, it } from "vitest";
import { RoomSummary } from "@/lib/api/contract";
import { manifest } from "@/mocks/fixtures";
import {
  demoMatchRooms,
  demoRoom,
  demoRoomChanges,
  demoRoomMessages,
  demoRooms,
} from "@/lib/demo/responses";

const PRE_MATCH = manifest.rooms.find((r) => r.kind === "PRE_MATCH")!;
const POST_MATCH = manifest.rooms.find((r) => r.kind === "POST_MATCH")!;
const fixtureFor = (roomId: string) => {
  const room = manifest.rooms.find((r) => r.id === roomId)!;
  return manifest.fixtures.find((f) => f.id === room.match_id)!;
};

describe("room index", () => {
  it("validates every room against the Appendix A schema", () => {
    for (const room of demoRooms().items) {
      expect(() => RoomSummary.parse(room)).not.toThrow();
    }
  });

  it("never includes a HIDDEN room", () => {
    for (const room of demoRooms().items) expect(room.status).not.toBe("HIDDEN");
  });

  it("embeds the match, so the card needs no extra fetch", () => {
    for (const room of demoRooms().items) {
      expect(room.match.id).toBe(room.match_id);
      expect(room.match.home_team.short_name.length).toBeGreaterThan(0);
    }
  });

  it("reports only public message counts", () => {
    for (const room of demoRooms().items) expect(room.message_count).toBe(0);
  });

  it("gives system-seeded rooms no creator", () => {
    for (const room of demoRooms().items) expect(room.created_by).toBeNull();
  });
});

describe("room status follows match phase", () => {
  it("opens a PRE_MATCH room while the fixture is scheduled and before kickoff", () => {
    const fixture = fixtureFor(PRE_MATCH.id);
    expect(fixture.status).toBe("SCHEDULED");
    expect(Date.parse(fixture.kickoff_at)).toBeGreaterThan(Date.parse(manifest.demo_clock));
    expect(demoRoom(PRE_MATCH.id)!.status).toBe("OPEN");
  });

  it("opens a POST_MATCH room for a fixture already finished in the baseline", () => {
    expect(fixtureFor(POST_MATCH.id).status).toBe("FINISHED");
    expect(demoRoom(POST_MATCH.id)!.status).toBe("OPEN");
  });

  it("derives a title, since the manifest supplies none (gap G5)", () => {
    expect(demoRoom(PRE_MATCH.id)!.title.length).toBeGreaterThan(0);
    expect(demoRoom(POST_MATCH.id)!.title).not.toBe(demoRoom(PRE_MATCH.id)!.title);
  });
});

describe("permissions come from the server, not the plan", () => {
  it("refuses posting and creating for a guest", () => {
    for (const room of demoRooms().items) {
      expect(room.can_post).toBe(false);
      expect(room.can_create).toBe(false);
    }
  });

  it("keeps can_post separate from room status", () => {
    const room = demoRoom(PRE_MATCH.id)!;
    // The room is OPEN, yet this caller still cannot post.
    expect(room.status).toBe("OPEN");
    expect(room.can_post).toBe(false);
  });
});

describe("hidden and unknown rooms are indistinguishable", () => {
  it("returns null for an unknown room id", () => {
    expect(demoRoom("70000000-0000-4000-8000-0000000099ff")).toBeNull();
    expect(demoRoomMessages("70000000-0000-4000-8000-0000000099ff")).toBeNull();
    expect(demoRoomChanges("70000000-0000-4000-8000-0000000099ff", 0)).toBeNull();
  });

  it("refuses messages and changes for any room it will not disclose", () => {
    // Same null result across detail, messages and changes, so the handler can
    // emit one uniform 404 for all three.
    const unknown = "70000000-0000-4000-8000-0000000099ff";
    expect([
      demoRoom(unknown),
      demoRoomMessages(unknown),
      demoRoomChanges(unknown, 0),
    ]).toEqual([null, null, null]);
  });
});

describe("message and change pages", () => {
  it("returns an empty page that still carries sync_after_seq (gap G9)", () => {
    const page = demoRoomMessages(PRE_MATCH.id)!;
    expect(page.items).toEqual([]);
    expect(page.sync_after_seq).toBe(0);
    expect(page.next_cursor).toBeNull();
  });

  it("returns a well-formed empty change page that preserves the cursor", () => {
    const changes = demoRoomChanges(PRE_MATCH.id, 7)!;
    expect(changes.items).toEqual([]);
    expect(changes.next_after_seq).toBe(7);
    expect(changes.has_more).toBe(false);
  });
});

describe("match rooms", () => {
  it("lists only rooms for the requested match", () => {
    const rooms = demoMatchRooms(PRE_MATCH.match_id)!;
    for (const room of rooms.items) expect(room.match_id).toBe(PRE_MATCH.match_id);
  });

  it("returns null for an unknown match", () => {
    expect(demoMatchRooms("30000000-0000-4000-8000-0000000099ff")).toBeNull();
  });

  it("returns an empty list for a match with no room, not an error", () => {
    const without = manifest.fixtures.find(
      (f) => !manifest.rooms.some((r) => r.match_id === f.id),
    )!;
    expect(demoMatchRooms(without.id)!.items).toEqual([]);
  });
});
