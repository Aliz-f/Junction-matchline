/**
 * One What-if thread (FE-09).
 *
 * The send path is the careful part:
 *
 * - The attempt envelope (`client_message_id`, idempotency key, exact text) is
 *   saved before sending and reconciled after a reload, so a refresh mid-flight
 *   never re-charges a model call. A retry reuses the **original** key and
 *   byte-identical text; a replacement key is never minted for a saved turn.
 * - 200 is a completed turn, 202 means still running (poll, never add a second
 *   bubble), 503 `AI_UNAVAILABLE` keeps the failed turn and the draft for a
 *   same-key retry, and 409 `IDEMPOTENCY_CONFLICT` is a genuine client error.
 * - 409 `WHATIF_THREAD_BUSY` shows a non-destructive "finish the current
 *   response first" state with the server's `retry_after_seconds`, and does not
 *   allocate a new key.
 * - 409 `WHATIF_THREAD_LIMIT` offers a new thread rather than a retry.
 * - 429 shows the server's reset time; quota is never enforced client-side.
 */
"use client";

import { useEffect, useRef, useState } from "react";
import { useWhatifThread } from "@/lib/whatif/useWhatif";
import { ApiError, apiRequest } from "@/lib/api/client";
import { WhatifTurnResponse } from "@/lib/api/contract";
import {
  clearAttempt,
  loadAttempt,
  reconcileAttempt,
  saveAttempt,
  type WhatifAttempt,
} from "@/lib/whatif/attempt";
import {
  hasPendingTurn,
  isAiTurn,
  isUserTurn,
  turnAllowance,
  validateMessage,
  MESSAGE_MAX_LENGTH,
} from "@/lib/whatif/turns";
import { ErrorState, SkeletonList } from "@/components/ui/States";
import { AiMessage } from "./AiMessage";
import { formatKickoff, machineDateTime } from "@/lib/time";

function newId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x40;
  bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80;
  const hex = [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function WhatifThreadView({
  threadId,
  userId,
}: {
  readonly threadId: string;
  readonly userId: string;
}) {
  const thread = useWhatifThread(threadId);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<ApiError | null>(null);
  const [resumable, setResumable] = useState<WhatifAttempt | null>(null);
  const [superseded, setSuperseded] = useState(false);
  const [unresumable, setUnresumable] = useState(false);
  const [remaining, setRemaining] = useState<number | null>(null);
  const liveRef = useRef<HTMLDivElement | null>(null);

  const messages = thread.data?.messages ?? [];
  const allowance = turnAllowance(messages);
  const pending = hasPendingTurn(messages);

  // Reconcile a saved attempt once the server's view is known.
  useEffect(() => {
    if (!thread.data) return;

    const serverTurns = messages.filter(isUserTurn).map((message) => ({
      client_message_id: message.client_message_id,
      delivery_state: message.delivery_state,
      created_at: message.created_at,
    }));

    const saved = loadAttempt(userId, threadId);
    const outcome = reconcileAttempt(saved, serverTurns);

    switch (outcome.action) {
      case "complete":
        clearAttempt(userId, threadId);
        setResumable(null);
        break;
      case "retry":
      case "resend":
        setResumable(outcome.attempt);
        break;
      case "superseded":
        // Can never be retried; drop the envelope so no key is reused.
        clearAttempt(userId, threadId);
        setSuperseded(true);
        setResumable(null);
        break;
      default:
        setResumable(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `messages` is derived from thread.data
  }, [thread.data, threadId, userId]);

  // A PENDING turn resolves server-side; poll rather than resending.
  useEffect(() => {
    if (!pending) return;
    const timer = setInterval(() => void thread.refetch(), 5000);
    return () => clearInterval(timer);
  }, [pending, thread]);

  async function send(attempt: WhatifAttempt) {
    setSending(true);
    setSendError(null);
    try {
      const response = await apiRequest(
        `/whatif/threads/${threadId}/messages`,
        WhatifTurnResponse,
        {
          method: "POST",
          // Byte-identical body, every time, for this key.
          body: { message: attempt.content, client_message_id: attempt.clientMessageId },
          headers: { "Idempotency-Key": attempt.idempotencyKey },
        },
      );
      setRemaining(response.remaining_daily_messages);
      clearAttempt(userId, threadId);
      setResumable(null);
      setDraft("");
    } catch (caught) {
      if (caught instanceof ApiError) {
        setSendError(caught);
        // The envelope stays so the SAME key can be retried.
        if (caught.code === "WHATIF_TURN_SUPERSEDED") {
          clearAttempt(userId, threadId);
          setSuperseded(true);
          setResumable(null);
        }
      }
    } finally {
      setSending(false);
      await thread.refetch();
    }
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    const problem = validateMessage(draft);
    if (problem !== null || sending) return;

    const attempt: WhatifAttempt = {
      threadId,
      userId,
      clientMessageId: newId(),
      idempotencyKey: newId(),
      content: draft.trim(),
      createdAt: new Date().toISOString(),
    };

    // If storage is unavailable the turn cannot be resumed after a reload.
    // Say so rather than risking a replacement key later.
    if (!saveAttempt(attempt)) setUnresumable(true);
    await send(attempt);
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    // Enter sends, Shift+Enter inserts a newline.
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void onSubmit(event as unknown as React.FormEvent);
    }
  }

  if (thread.isLoading) return <SkeletonList rows={3} />;

  if (thread.isError) {
    const error = thread.error;
    const missing = error instanceof ApiError && error.status === 404;
    return (
      <ErrorState
        title={missing ? "Thread not found" : "Could not load this thread"}
        description={
          missing
            ? "This thread does not exist, or it is not yours. Threads are private to the account that created them."
            : "The thread could not be read."
        }
        envelope={error instanceof ApiError ? error.envelope : null}
        {...(missing ? {} : { onRetry: () => void thread.refetch() })}
      />
    );
  }

  const problem = validateMessage(draft);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-bold text-ink">{thread.data?.thread.title}</h3>
        <p className="text-xs text-ink-muted">{allowance.label}</p>
      </div>

      {/* Failed attempts count toward the thread limit but not the daily quota. */}
      <p className="text-[0.6875rem] text-ink-muted">
        Failed attempts count toward this thread&rsquo;s {allowance.limit}-question limit, but not
        toward your daily response allowance.
        {remaining !== null ? ` ${remaining} responses left today.` : ""}
      </p>

      <div ref={liveRef} aria-live="polite" className="space-y-3">
        {messages.map((message) =>
          isAiTurn(message) ? (
            <AiMessage key={message.id} message={message} />
          ) : (
            <article
              key={message.id}
              className="ml-6 rounded-lg border border-line bg-surface-sunken p-3"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded bg-surface-raised px-1.5 py-0.5 text-[0.6875rem] font-bold uppercase tracking-wide text-ink-muted">
                  Your hypothesis
                </span>
                {message.delivery_state !== "COMPLETE" ? (
                  <span className="text-[0.6875rem] font-semibold text-ink-muted">
                    {message.delivery_state === "PENDING" ? "Sending…" : "Failed"}
                  </span>
                ) : null}
                <time
                  dateTime={machineDateTime(message.created_at)}
                  className="ml-auto text-[0.6875rem] text-ink-muted"
                >
                  {formatKickoff(message.created_at) ?? message.created_at}
                </time>
              </div>
              <p className="mt-1.5 whitespace-pre-wrap text-sm text-ink">{message.content}</p>
            </article>
          ),
        )}
      </div>

      {superseded ? (
        <p role="status" className="rounded-md border border-line bg-surface-sunken px-3 py-2 text-sm text-ink-muted">
          <span className="font-semibold text-ink">Superseded — cannot retry.</span> A later question
          was accepted in this thread, so that failed attempt can no longer be resent. Ask it again as
          a new question.
        </p>
      ) : null}

      {unresumable ? (
        <p role="status" className="rounded-md border border-amber-500/50 bg-amber-500/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-200">
          Your browser is not allowing this tab to remember the request. If you reload before the
          answer arrives, this question cannot be safely resumed.
        </p>
      ) : null}

      {resumable !== null && !pending ? (
        <div className="rounded-md border border-line bg-surface-sunken px-3 py-2">
          <p className="text-sm text-ink">
            An earlier question was not completed. Retrying sends the original text unchanged.
          </p>
          <p className="mt-1 text-xs text-ink-muted">&ldquo;{resumable.content}&rdquo;</p>
          <button
            type="button"
            onClick={() => void send(resumable)}
            disabled={sending}
            className="mt-2 rounded-md border border-line bg-surface-raised px-3 py-1.5 text-sm font-semibold text-ink disabled:opacity-60"
          >
            {sending ? "Retrying…" : "Retry that question"}
          </button>
        </div>
      ) : null}

      {allowance.exhausted ? (
        <p role="status" className="rounded-md border border-line bg-surface-sunken px-3 py-2 text-sm text-ink-muted">
          <span className="font-semibold text-ink">This thread is full.</span> It has reached its{" "}
          {allowance.limit}-question limit. Start a new thread to carry on.
        </p>
      ) : pending ? (
        <p role="status" className="text-sm text-ink-muted">
          Waiting for the current answer. Your question is recorded — it is not sent twice.
        </p>
      ) : (
        <form onSubmit={onSubmit} className="space-y-2">
          <label htmlFor="whatif-message" className="block text-sm font-semibold text-ink">
            Ask a what-if
          </label>
          <textarea
            id="whatif-message"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={onKeyDown}
            rows={3}
            maxLength={MESSAGE_MAX_LENGTH}
            className="w-full rounded-md border border-line bg-surface-raised px-3 py-2 text-sm text-ink"
          />
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="submit"
              disabled={sending || problem !== null}
              className="rounded-md bg-ink px-3 py-1.5 text-sm font-semibold text-surface-raised disabled:opacity-60"
            >
              {sending ? "Sending…" : "Send"}
            </button>
            <span className="text-xs text-ink-muted">
              {problem ?? "Enter to send, Shift+Enter for a new line."}
            </span>
          </div>
        </form>
      )}

      {sendError ? (
        <ErrorState
          title={
            sendError.code === "WHATIF_THREAD_BUSY"
              ? "Finish the current AI response first"
              : sendError.code === "WHATIF_THREAD_LIMIT"
                ? "This thread is full"
                : sendError.code === "RATE_LIMITED"
                  ? "You have used today's responses"
                  : sendError.code === "AI_UNAVAILABLE"
                    ? "The AI is unavailable right now"
                    : "Your question was not sent"
          }
          description={
            sendError.code === "WHATIF_THREAD_BUSY"
              ? `Only one question can be in flight at a time.${
                  typeof sendError.details.retry_after_seconds === "number"
                    ? ` Try again in ${sendError.details.retry_after_seconds} seconds.`
                    : ""
                } Nothing was lost.`
              : sendError.code === "WHATIF_THREAD_LIMIT"
                ? "Start a new thread to ask more questions."
                : sendError.code === "RATE_LIMITED"
                  ? `Your allowance resets at ${String(sendError.details.reset_at ?? "the next daily reset")}.`
                  : sendError.code === "AI_UNAVAILABLE"
                    ? "Your question is kept and can be retried unchanged."
                    : "Your draft has been kept."
          }
          envelope={sendError.envelope}
        />
      ) : null}

    </div>
  );
}
