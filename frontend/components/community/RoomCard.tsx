/**
 * Room summary card (FE-07).
 *
 * Uses the embedded `RoomSummary.match` for the header, so no extra fetch is
 * needed. Status and posting rights are shown as the server reported them:
 * `status` describes the room, `can_post` describes **this caller**, and the two
 * are deliberately not conflated.
 */
import Link from "next/link";
import { StatusIndicator } from "@/components/ui/StatusIndicator";
import { CompetitionBadge } from "@/components/ui/CompetitionBadge";
import { formatKickoff, machineDateTime } from "@/lib/time";
import type { RoomStatus, RoomSummary } from "@/lib/api/types";

const ROOM_STATUS_LABELS: Record<RoomStatus, string> = {
  OPEN: "Open",
  READ_ONLY: "Read-only archive",
  // Never rendered: a hidden room is not discoverable.
  HIDDEN: "Hidden",
};

const KIND_LABELS = { PRE_MATCH: "Pre-match", POST_MATCH: "Post-match" } as const;

export function RoomCard({ room }: { readonly room: RoomSummary }) {
  const kickoff = formatKickoff(room.match.kickoff_at);

  return (
    <article className="rounded-lg border border-line bg-surface-raised p-3">
      <div className="flex flex-wrap items-center gap-2">
        <CompetitionBadge brandKey={room.match.competition.brand_key} name={room.match.competition.name} />
        <StatusIndicator status={room.match.status} variant="compact" />
        <span className="rounded bg-surface-sunken px-2 py-0.5 text-[0.6875rem] font-bold uppercase tracking-wide text-ink-muted">
          {KIND_LABELS[room.kind]}
        </span>
        <span
          className={[
            "rounded px-2 py-0.5 text-[0.6875rem] font-bold uppercase tracking-wide",
            room.status === "OPEN"
              ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
              : "bg-surface-sunken text-ink-muted",
          ].join(" ")}
        >
          {ROOM_STATUS_LABELS[room.status]}
        </span>
      </div>

      <Link href={`/community/rooms/${room.id}`} className="mt-2 block">
        <h3 className="text-sm font-bold text-ink">{room.title}</h3>
        <p className="mt-0.5 text-sm text-ink-muted">
          {room.match.home_team.short_name}
          <span className="mx-1">v</span>
          {room.match.away_team.short_name}
        </p>
        {kickoff ? (
          <p className="mt-0.5 text-xs text-ink-muted">
            <time dateTime={machineDateTime(room.match.kickoff_at)}>{kickoff}</time>
          </p>
        ) : null}
      </Link>

      <p className="mt-2 text-xs text-ink-muted">
        {/* Public count only: hidden messages are excluded entirely. */}
        {room.message_count} {room.message_count === 1 ? "message" : "messages"}
        {room.status === "READ_ONLY" ? " · closed to new posts" : null}
      </p>
    </article>
  );
}
