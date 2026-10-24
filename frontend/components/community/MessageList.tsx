/**
 * Room messages (FE-07).
 *
 * Only public moderation states reach here: the DTO allows VISIBLE and FLAGGED
 * only, and a hidden message is removed from the feed entirely with no
 * placeholder. FLAGGED stays visible until it is actually hidden.
 *
 * Bodies are rendered as text, never as HTML, so nothing in a message can
 * inject markup.
 */
"use client";

import { useState } from "react";
import { ReportResponse } from "@/lib/api/contract";
import { ApiError, apiRequest } from "@/lib/api/client";
import { formatKickoff, machineDateTime } from "@/lib/time";
import type { RoomMessage } from "@/lib/api/types";

function ReportButton({ messageId }: { readonly messageId: string }) {
  const [state, setState] = useState<"idle" | "sending" | "sent" | "failed">("idle");

  async function report() {
    setState("sending");
    try {
      await apiRequest("/reports", ReportResponse, {
        method: "POST",
        body: { target_kind: "ROOM_MESSAGE", target_id: messageId, reason: "Reported from room feed" },
      });
      setState("sent");
    } catch (caught) {
      setState(caught instanceof ApiError ? "failed" : "failed");
    }
  }

  if (state === "sent") {
    return <span className="text-xs text-ink-muted">Reported — a moderator will review it.</span>;
  }

  return (
    <button
      type="button"
      onClick={() => void report()}
      disabled={state === "sending"}
      className="text-xs font-semibold text-ink-muted underline disabled:opacity-60"
    >
      {state === "sending" ? "Reporting…" : state === "failed" ? "Report failed — retry" : "Report"}
    </button>
  );
}

export function MessageList({
  messages,
  canReport,
}: {
  readonly messages: readonly RoomMessage[];
  readonly canReport: boolean;
}) {
  return (
    <ol className="space-y-2">
      {messages.map((message) => (
        <li key={message.id} className="rounded-lg border border-line bg-surface-raised p-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-sm font-bold text-ink">
              {message.author.display_name}
              {message.author.public_badges.map((badge) => (
                <span
                  key={badge.code}
                  title={badge.rule_description}
                  className="ml-1.5 rounded bg-surface-sunken px-1.5 py-0.5 text-[0.625rem] font-bold uppercase tracking-wide text-ink-muted"
                >
                  {badge.label}
                </span>
              ))}
            </p>
            <time dateTime={machineDateTime(message.created_at)} className="text-xs text-ink-muted">
              {formatKickoff(message.created_at) ?? message.created_at}
            </time>
          </div>

          {/* Rendered as text, not HTML. */}
          <p className="mt-1 whitespace-pre-wrap break-words text-sm text-ink">{message.body}</p>

          <div className="mt-1.5 flex flex-wrap items-center gap-3">
            {message.moderation_state === "FLAGGED" ? (
              <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-[0.625rem] font-bold uppercase tracking-wide text-amber-700 dark:text-amber-300">
                Flagged for review
              </span>
            ) : null}
            {canReport ? <ReportButton messageId={message.id} /> : null}
          </div>
        </li>
      ))}
    </ol>
  );
}
