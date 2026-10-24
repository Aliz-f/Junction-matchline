/**
 * Room feed with incremental sync (FE-07, CT-16 / CT-19).
 *
 * Polling policy, from the task file:
 *  - on entry
 *  - every 15 seconds **while the tab is foreground and online**
 *  - on focus and on reconnect
 *  - when `/meta` reports a new `scenario_revision` or `demo_epoch`
 *  - after a 409 on a write
 *
 * It keeps polling while `has_more`, possibly across cycles, so a large backlog
 * is drained without skipping events.
 *
 * Nothing here is written to `localStorage` or any shared cache: room bodies are
 * private per CT-12 and live only in component state for the session.
 */
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { RoomChangePage, RoomMessagesPage } from "@/lib/api/contract";
import { ApiError, apiRequest } from "@/lib/api/client";
import {
  EMPTY_ROOM_STATE,
  applyChangePage,
  initFromPage,
  prependOlderPage,
  type RoomSyncState,
} from "./sync";

const POLL_INTERVAL_MS = 15_000;
/** Bound on draining `has_more` in one cycle, so a bad feed cannot spin. */
const MAX_DRAIN_PAGES = 20;

type FeedStatus = "loading" | "ready" | "error" | "gone";

export function useRoomFeed(roomId: string, revision: number | null) {
  const [state, setState] = useState<RoomSyncState>(EMPTY_ROOM_STATE);
  const [status, setStatus] = useState<FeedStatus>("loading");
  const [error, setError] = useState<ApiError | null>(null);
  const [loadingOlder, setLoadingOlder] = useState(false);

  // Read inside callbacks without making them depend on every state change.
  const seqRef = useRef(0);
  seqRef.current = state.afterSeq;

  /** Full reload. Used on entry and whenever the demo baseline changes. */
  const reload = useCallback(async () => {
    setStatus("loading");
    setError(null);
    try {
      const page = await apiRequest(`/rooms/${roomId}/messages`, RoomMessagesPage);
      const next = initFromPage(page);
      seqRef.current = next.afterSeq;
      setState(next);
      setStatus("ready");
    } catch (caught) {
      if (caught instanceof ApiError) {
        setError(caught);
        // 404 covers both an unknown room and a hidden template.
        setStatus(caught.status === 404 ? "gone" : "error");
      } else {
        setStatus("error");
      }
    }
  }, [roomId]);

  /** Drains `/changes` while the server reports more. */
  const poll = useCallback(async () => {
    try {
      for (let i = 0; i < MAX_DRAIN_PAGES; i += 1) {
        const page = await apiRequest(`/rooms/${roomId}/changes`, RoomChangePage, {
          query: { after_seq: seqRef.current },
        });
        // Applied to all loaded pages, and the cursor advances even if the page
        // held only REMOVEs.
        setState((previous) => {
          const next = applyChangePage(previous, page);
          seqRef.current = next.afterSeq;
          return next;
        });
        seqRef.current = Math.max(seqRef.current, page.next_after_seq);
        if (!page.has_more) return;
      }
    } catch (caught) {
      if (caught instanceof ApiError && caught.status === 404) setStatus("gone");
      // Other failures are transient; the next tick retries.
    }
  }, [roomId]);

  const loadOlder = useCallback(async () => {
    if (!state.olderCursor || loadingOlder) return;
    setLoadingOlder(true);
    try {
      const page = await apiRequest(`/rooms/${roomId}/messages`, RoomMessagesPage, {
        query: { cursor: state.olderCursor },
      });
      setState((previous) => prependOlderPage(previous, page));
    } catch {
      // Leave the cursor in place so the user can retry.
    } finally {
      setLoadingOlder(false);
    }
  }, [roomId, state.olderCursor, loadingOlder]);

  // Entry, and a full reset whenever the demo baseline/scenario changes.
  useEffect(() => {
    void reload();
  }, [reload, revision]);

  // Interval polling, suspended while hidden or offline.
  useEffect(() => {
    if (status !== "ready") return;

    let timer: ReturnType<typeof setInterval> | null = null;

    const start = () => {
      if (timer !== null) return;
      timer = setInterval(() => {
        if (document.visibilityState === "visible" && navigator.onLine) void poll();
      }, POLL_INTERVAL_MS);
    };
    const stop = () => {
      if (timer !== null) clearInterval(timer);
      timer = null;
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        void poll();
        start();
      } else {
        stop();
      }
    };
    const onOnline = () => {
      void poll();
      start();
    };

    if (document.visibilityState === "visible") start();
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("focus", onVisibility);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", stop);

    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("focus", onVisibility);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", stop);
    };
  }, [status, poll]);

  return { state, status, error, loadOlder, loadingOlder, poll, reload };
}
