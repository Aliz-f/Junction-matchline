/**
 * One node on the Journey board = exactly one match (FE-03).
 *
 * Drawn as a circular "level" marker on a winding trail: a game-board layout
 * inspired by match-three progress maps, built from original shapes only. No
 * third-party game artwork, character, tile or decorative asset is reproduced,
 * and no licensed competition crest is used (AGENTS.md section 5).
 *
 * The visual split still holds: the **fill and motif** come from the
 * competition, the **ring, icon and label** come from status. The node is a real
 * `<a>`, so it is keyboard-reachable and middle-clickable; the trail behind it
 * is decorative SVG.
 */
"use client";

import Link from "next/link";
import { useState } from "react";
import { competitionToken } from "@/lib/design/competitions";
import { statusToken } from "@/lib/design/status";
import { CompetitionGlyph, StatusGlyph } from "@/components/ui/Icon";
import { formatKickoff, machineDateTime } from "@/lib/time";
import type { MatchSummary } from "@/lib/api/types";
import { JourneyRoomPopover } from "./JourneyRoomPopover";

type Props = {
  readonly match: MatchSummary;
  /** The club whose Journey this is, so home/away is framed from it. */
  readonly teamId: string | null;
  /** The next upcoming fixture, which the board emphasises. */
  readonly isNext: boolean;
  /** Which way the label sits, so it never overlaps the trail. */
  readonly side: "left" | "right";
};

export function JourneyNode({ match, teamId, isNext, side }: Props) {
  const [openRoom, setOpenRoom] = useState<"PRE_MATCH" | "POST_MATCH" | null>(null);
  const competition = competitionToken(match.competition.brand_key);
  const status = statusToken(match.status);
  const accent = `rgb(var(${competition.accentVar}))`;
  const tone = `rgb(var(${status.toneVar}))`;

  const isHome = teamId !== null && match.home_team.id === teamId;
  const isAway = teamId !== null && match.away_team.id === teamId;
  const opponent = isHome ? match.away_team : match.home_team;
  const kickoff = formatKickoff(match.kickoff_at);

  const { home, away } = match.score;
  const hasScore = home !== null && away !== null && !status.withoutResult;

  // Availability comes from backend `features`, never inferred from status.
  const actions = [match.features.predictions_open ? "Predict" : null, match.features.whatif_available ? "What-if" : null].filter(
    (value): value is string => value !== null,
  );

  // One accessible name carrying everything the visuals convey.
  const label = [
    match.matchday !== null ? `Matchday ${match.matchday}:` : "Match:",
    isHome ? `home against ${opponent.short_name}` : isAway ? `away at ${opponent.short_name}` : `${match.home_team.short_name} versus ${match.away_team.short_name}`,
    `· ${status.label}`,
    hasScore ? `· score ${home}–${away}` : "· no score",
    kickoff ? `· ${kickoff}` : "",
    isNext ? "· next up" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <>
      {match.features.pre_match_room ? (
        <button
          type="button"
          onClick={() => setOpenRoom("PRE_MATCH")}
          className="journey-room-callout journey-room-before"
          aria-label={`Open pre-match discussion for ${match.home_team.short_name} versus ${match.away_team.short_name}`}
        >
          <span aria-hidden="true">◌</span> Pre-match
        </button>
      ) : null}
      <Link
      href={`/matches/${match.id}`}
      aria-label={label}
      aria-current={isNext ? "step" : undefined}
      className="group flex w-32 flex-col items-center gap-1.5 focus-visible:outline-none sm:w-36"
      data-status={match.status}
      data-competition={competition.key}
    >
      {isNext ? (
        <span className="rounded-full bg-ink px-2 py-0.5 text-[0.625rem] font-bold uppercase tracking-wide text-surface-raised">
          Next up
        </span>
      ) : null}

      {/* The level marker. */}
      <span className="relative inline-flex items-center justify-center">
        {/* Status ring, sized outside the fill so the two never blend. */}
        <span
          aria-hidden="true"
          className={[
            "absolute inset-0 rounded-full border-4 transition-transform",
            isNext ? "scale-110" : "group-hover:scale-105",
          ].join(" ")}
          style={{ borderColor: tone }}
        />
        {status.animated ? (
          <span
            aria-hidden="true"
            className="status-pulse absolute inset-0 rounded-full"
            style={{ color: tone }}
          />
        ) : null}

        <span
          aria-hidden="true"
          className={[
            "relative flex items-center justify-center overflow-hidden rounded-full text-white shadow-sm",
            isNext ? "h-[4.25rem] w-[4.25rem]" : "h-16 w-16",
          ].join(" ")}
          style={{ backgroundColor: accent }}
        >
          {/*
            Competition identity is deliberately large enough to read inside
            every node. It stays separate from the status ring and status
            glyph, so a star/cup/pitch is never mistaken for match state.
          */}
          <span
            aria-hidden="true"
            data-competition-motif={competition.motif}
            className="absolute inset-2 opacity-30"
          >
            <CompetitionGlyph motif={competition.motif} />
          </span>
          {hasScore ? (
            <span className="relative font-mono text-lg font-black tabular-nums leading-none">
              {home}
              <span className="opacity-70">–</span>
              {away}
            </span>
          ) : match.matchday !== null ? (
            <span className="relative flex flex-col items-center leading-none">
              <span className="text-[0.5625rem] font-bold uppercase opacity-80">MD</span>
              <span className="font-mono text-lg font-black tabular-nums">{match.matchday}</span>
            </span>
          ) : (
            <span className="relative h-6 w-6">
              <CompetitionGlyph motif={competition.motif} />
            </span>
          )}
        </span>

        {/* Competition motif badge, so identity is readable at a glance. */}
        <span
          aria-hidden="true"
          className="absolute -left-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full border-2 border-surface-raised"
          style={{ backgroundColor: accent }}
        >
          <span className="h-3.5 w-3.5 text-white">
            <CompetitionGlyph motif={competition.motif} />
          </span>
        </span>

        {/* Status icon badge. */}
        <span
          aria-hidden="true"
          className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full border-2 border-surface-raised bg-surface-raised"
          style={{ color: tone }}
        >
          <span className="h-3.5 w-3.5">
            <StatusGlyph icon={status.icon} />
          </span>
        </span>
      </span>

      {/* Caption. Text labels keep status and score off colour alone. */}
      <span className={["flex flex-col gap-0.5", side === "left" ? "text-center" : "text-center"].join(" ")}>
        <span className="inline-flex items-center justify-center gap-1 text-[0.5625rem] font-black uppercase tracking-[0.1em]" style={{ color: accent }}>
          <span aria-hidden="true" className="h-3 w-3"><CompetitionGlyph motif={competition.motif} /></span>
          {competition.label}
        </span>
        <span className="truncate text-xs font-bold text-ink">
          {isHome || isAway ? (
            <>
              <span className="font-normal text-ink-muted">{isHome ? "vs" : "away at"}</span>{" "}
              {opponent.short_name}
            </>
          ) : (
            <>
              {match.home_team.short_name}
              <span className="mx-0.5 font-normal text-ink-muted">v</span>
              {match.away_team.short_name}
            </>
          )}
        </span>

        <span className="text-[0.6875rem] font-semibold" style={{ color: tone }}>
          {status.label}
        </span>

        {kickoff ? (
          <time dateTime={machineDateTime(match.kickoff_at)} className="text-[0.625rem] text-ink-muted">
            {kickoff}
          </time>
        ) : null}

        {/* Available actions as small markers, named for assistive tech. */}
        {actions.length > 0 ? (
          <span className="mt-0.5 flex items-center justify-center gap-1">
            {actions.map((action) => (
              <span key={action} title={`${action} available`} className="inline-flex items-center">
                <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-ink-muted" />
                {/* Named individually, so each availability is announced. */}
                <span className="sr-only">{action}</span>
              </span>
            ))}
          </span>
        ) : null}
      </span>
      </Link>
      {match.features.post_match_room ? (
        <button
          type="button"
          onClick={() => setOpenRoom("POST_MATCH")}
          className="journey-room-callout journey-room-after"
          aria-label={`Open post-match discussion for ${match.home_team.short_name} versus ${match.away_team.short_name}`}
        >
          <span aria-hidden="true">◌</span> Post-match
        </button>
      ) : null}
      {openRoom ? <JourneyRoomPopover matchId={match.id} kind={openRoom} onClose={() => setOpenRoom(null)} /> : null}
    </>
  );
}
