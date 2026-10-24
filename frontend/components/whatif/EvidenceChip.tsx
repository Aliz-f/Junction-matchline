/**
 * Typed evidence rendering (FE-09, CT-14).
 *
 * Each evidence kind renders only the fields the contract actually carries. A
 * ref that does not resolve against **this message's** evidence is displayed as
 * unsafe rather than being dropped or filled in with plausible-looking detail.
 *
 * There is no source resolver here and no score-at-minute arithmetic: if the
 * number is not in the evidence item, it is not shown.
 */
import { formatKickoff, machineDateTime } from "@/lib/time";
import type { WhatifEvidenceItem } from "@/lib/api/types";

function Meta({ item }: { readonly item: WhatifEvidenceItem }) {
  return (
    <p className="mt-0.5 text-[0.625rem] text-ink-muted">
      <span className="font-mono">{item.source_data_version}</span>
      {item.verified_at ? (
        <>
          {" · verified "}
          <time dateTime={machineDateTime(item.verified_at)}>
            {formatKickoff(item.verified_at) ?? item.verified_at}
          </time>
        </>
      ) : (
        // Unverified evidence is labelled, never presented as confirmed.
        " · not independently verified"
      )}
    </p>
  );
}

function Detail({ item }: { readonly item: WhatifEvidenceItem }) {
  switch (item.kind) {
    case "MATCH_EVENT":
      return (
        <p className="text-xs text-ink">
          {item.event.minute === null ? "Minute unknown" : `${item.event.minute}'`} ·{" "}
          {item.event.kind}
          {item.event.player_name ? ` — ${item.event.player_name}` : ""}
        </p>
      );

    case "FINAL_SCORE":
      return (
        <p className="text-xs text-ink">
          Final score{" "}
          <span className="font-mono font-bold tabular-nums">
            {item.score.home}–{item.score.away}
          </span>
        </p>
      );

    case "STANDINGS_SNAPSHOT":
      return (
        <p className="text-xs text-ink">
          Standings as of{" "}
          <time dateTime={machineDateTime(item.as_of)}>{formatKickoff(item.as_of) ?? item.as_of}</time>{" "}
          · {item.team_rows.length} {item.team_rows.length === 1 ? "club" : "clubs"}
        </p>
      );

    case "MATCH_METADATA":
      return (
        <p className="text-xs text-ink">
          {item.home_team.short_name} v {item.away_team.short_name} ·{" "}
          <time dateTime={machineDateTime(item.kickoff_at)}>
            {formatKickoff(item.kickoff_at) ?? item.kickoff_at}
          </time>
        </p>
      );

    case "PLAYER_SEASON_STAT":
      return (
        <p className="text-xs text-ink">
          {item.player_name} · {item.statistic}{" "}
          <span className="font-mono font-bold tabular-nums">{item.value}</span> {item.unit} (
          {item.season_start_year})
        </p>
      );

    default:
      return null;
  }
}

export function EvidenceChip({ item }: { readonly item: WhatifEvidenceItem }) {
  return (
    <li className="rounded-md border border-line bg-surface-raised px-2.5 py-2">
      <p className="text-[0.625rem] font-bold uppercase tracking-wide text-ink-muted">{item.label}</p>
      <Detail item={item} />
      <Meta item={item} />
    </li>
  );
}

/** A cited ref with nothing to join to. Shown, not hidden. */
export function UnsafeRef({ ref: refValue }: { readonly ref: string }) {
  return (
    <li className="rounded-md border border-amber-500/50 bg-amber-500/10 px-2.5 py-2">
      <p className="text-xs font-semibold text-amber-800 dark:text-amber-200">
        Unsupported reference
      </p>
      <p className="mt-0.5 font-mono text-[0.625rem] text-ink-muted">{refValue}</p>
      <p className="mt-0.5 text-[0.625rem] text-ink-muted">
        This claim cites evidence that was not supplied with it, so the detail cannot be shown.
      </p>
    </li>
  );
}
