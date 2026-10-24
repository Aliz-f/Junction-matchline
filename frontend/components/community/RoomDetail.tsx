/**
 * Room detail (FE-07).
 *
 * Behaviours that matter:
 *  - The room is fetched by id, never looked up in the index, so a direct link
 *    survives a refresh. A hidden room and an unknown id give the same 404.
 *  - `can_post` governs the composer, not the plan. A FREE account posting in an
 *    open room must never meet a premium wall.
 *  - A 409 `ROOM_CLOSED` or 403 wins over whatever the page believed, and the
 *    draft is preserved so no message is silently lost.
 *  - Messages are never written to browser storage (CT-12); only the unsent
 *    draft is, and that is the author's own text.
 */
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useMeta, useRoom, useSession } from "@/lib/api/hooks";
import { useRoomFeed } from "@/lib/rooms/useRoomFeed";
import { orderedMessages } from "@/lib/rooms/sync";
import { ApiError, apiRequest } from "@/lib/api/client";
import { RoomMessage as RoomMessageSchema } from "@/lib/api/contract";
import { EmptyState, ErrorState, SkeletonList } from "@/components/ui/States";
import { StatusIndicator } from "@/components/ui/StatusIndicator";
import { CompetitionBadge } from "@/components/ui/CompetitionBadge";
import { MessageList } from "./MessageList";
import { formatKickoff, machineDateTime } from "@/lib/time";

const DRAFT_PREFIX = "matchline:room-draft:";

export function RoomDetail({ roomId }: { readonly roomId: string }) {
  const { user } = useSession();
  const meta = useMeta();
  const room = useRoom(roomId);

  // A scenario or baseline change invalidates cached messages and cursors.
  const revision = meta.data ? (meta.data.scenario_revision ?? 0) + (meta.data.demo_epoch ?? 0) : null;
  const feed = useRoomFeed(roomId, revision);

  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<ApiError | null>(null);

  // The draft is the author's own unsent text, so keeping it is appropriate.
  useEffect(() => {
    try {
      setDraft(window.localStorage.getItem(`${DRAFT_PREFIX}${roomId}`) ?? "");
    } catch {
      // Storage unavailable; the draft simply does not persist.
    }
  }, [roomId]);

  function rememberDraft(value: string) {
    setDraft(value);
    try {
      if (value) window.localStorage.setItem(`${DRAFT_PREFIX}${roomId}`, value);
      else window.localStorage.removeItem(`${DRAFT_PREFIX}${roomId}`);
    } catch {
      // Ignored.
    }
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const body = draft.trim();
    if (!body || sending) return;

    setSending(true);
    setSendError(null);
    try {
      await apiRequest(`/rooms/${roomId}/messages`, RoomMessageSchema, {
        method: "POST",
        body: { body },
      });
      rememberDraft("");
      // Pick the new message up through the change feed rather than guessing.
      await feed.poll();
    } catch (caught) {
      if (caught instanceof ApiError) {
        setSendError(caught);
        // The server's decision wins; refresh the room's own state.
        if (caught.status === 409 || caught.status === 403) await room.refetch();
      }
      // The draft is deliberately kept so nothing is lost.
    } finally {
      setSending(false);
    }
  }

  if (room.isLoading || feed.status === "loading") return <SkeletonList rows={4} />;

  // Unknown and hidden are indistinguishable by design.
  const notFound =
    feed.status === "gone" || (room.isError && room.error instanceof ApiError && room.error.status === 404);

  if (notFound) {
    return (
      <ErrorState
        title="Room not found"
        description="No room exists at this address, or it is not open for discussion yet."
      />
    );
  }

  if (room.isError) {
    return (
      <ErrorState
        title="Could not load this room"
        description="The request failed. Nothing was changed."
        envelope={room.error instanceof ApiError ? room.error.envelope : null}
        onRetry={() => void room.refetch()}
      />
    );
  }

  const summary = room.data;
  if (!summary) return null;

  const messages = orderedMessages(feed.state);
  const kickoff = formatKickoff(summary.match.kickoff_at);

  return (
    <div className="space-y-5">
      <header className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <CompetitionBadge
            brandKey={summary.match.competition.brand_key}
            name={summary.match.competition.name}
          />
          <StatusIndicator status={summary.match.status} variant="compact" />
          {summary.status === "READ_ONLY" ? (
            <span className="rounded bg-surface-sunken px-2 py-0.5 text-[0.6875rem] font-bold uppercase tracking-wide text-ink-muted">
              Read-only archive
            </span>
          ) : null}
        </div>
        <h2 className="text-lg font-bold text-ink">{summary.title}</h2>
        <p className="text-sm text-ink-muted">
          <Link href={`/matches/${summary.match_id}`} className="font-semibold text-ink underline">
            {summary.match.home_team.short_name} v {summary.match.away_team.short_name}
          </Link>
          {kickoff ? (
            <>
              {" · "}
              <time dateTime={machineDateTime(summary.match.kickoff_at)}>{kickoff}</time>
            </>
          ) : null}
        </p>
      </header>

      {feed.state.olderCursor ? (
        <button
          type="button"
          onClick={() => void feed.loadOlder()}
          disabled={feed.loadingOlder}
          className="rounded-md border border-line px-3 py-1.5 text-sm font-semibold text-ink disabled:opacity-60"
        >
          {feed.loadingOlder ? "Loading…" : "Load earlier messages"}
        </button>
      ) : null}

      {messages.length === 0 ? (
        <EmptyState
          title="No messages yet"
          description="Nothing has been posted in this room. New messages appear here automatically."
        />
      ) : (
        <MessageList messages={messages} canReport={user !== null} />
      )}

      {/* Composer. Governed by can_post, never by plan. */}
      {summary.status === "READ_ONLY" ? (
        <p role="status" className="rounded-md border border-line bg-surface-sunken px-3 py-2 text-sm text-ink-muted">
          <span className="font-semibold text-ink">This room is closed to new posts.</span> It stays
          readable as an archive.
        </p>
      ) : summary.can_post ? (
        <form onSubmit={submit} className="space-y-2">
          <label htmlFor="room-message" className="block text-sm font-semibold text-ink">
            Add a message
          </label>
          <textarea
            id="room-message"
            value={draft}
            onChange={(event) => rememberDraft(event.target.value)}
            rows={3}
            className="w-full rounded-md border border-line bg-surface-raised px-3 py-2 text-sm text-ink"
          />
          <div className="flex items-center gap-2">
            <button
              type="submit"
              disabled={sending || draft.trim().length === 0}
              className="rounded-md bg-ink px-3 py-1.5 text-sm font-semibold text-surface-raised disabled:opacity-60"
            >
              {sending ? "Sending…" : "Post"}
            </button>
            {draft.trim().length > 0 ? (
              <span className="text-xs text-ink-muted">Your draft is kept if sending fails.</span>
            ) : null}
          </div>
        </form>
      ) : user === null ? (
        <p className="rounded-md border border-line bg-surface-sunken px-3 py-2 text-sm text-ink-muted">
          <Link href="/login" className="font-semibold text-ink underline">
            Sign in
          </Link>{" "}
          to join this discussion. Reading is open to everyone.
        </p>
      ) : (
        <p className="rounded-md border border-line bg-surface-sunken px-3 py-2 text-sm text-ink-muted">
          You cannot post in this room at the moment. The server decides this from the room&rsquo;s
          state and your account.
        </p>
      )}

      {sendError ? (
        <ErrorState
          title={
            sendError.code === "ROOM_CLOSED"
              ? "This room closed before your message was posted"
              : sendError.code === "PREMIUM_REQUIRED"
                ? "That action needs a premium account"
                : "Your message was not posted"
          }
          description={
            sendError.code === "ROOM_CLOSED"
              ? "The server closed the room at kick-off. Your draft has been kept."
              : "Your draft has been kept so you can try again."
          }
          envelope={sendError.envelope}
        />
      ) : null}
    </div>
  );
}
