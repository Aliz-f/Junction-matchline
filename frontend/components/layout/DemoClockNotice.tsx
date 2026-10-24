/**
 * Demo clock / data-mode indicator (FE-01).
 *
 * In DEMO mode the server clock is frozen, so the shell shows a fixed
 * "Demo as of <server_now_utc>" label and no ticking countdown — a live
 * countdown would imply a real-time authority the demo backend does not have.
 *
 * The as-of value always comes from `/meta.server_now_utc`. `demo_epoch` is a
 * number, never a URL, and no baseline time is hardcoded here.
 */
import type { MetaView } from "@/lib/api/types";
import { formatKickoff, machineDateTime } from "@/lib/time";
import { SourceBadge } from "@/components/ui/SourceBadge";
import type { DataMode } from "@/lib/demo/mode";

type Props = { readonly mode: DataMode; readonly meta: MetaView | null };

export function DemoClockNotice({ mode, meta }: Props) {
  if (!meta) {
    return (
      <p role="status" className="text-xs text-ink-muted">
        <span className="font-semibold text-ink">Backend unavailable.</span> Server time and capabilities are unknown.
      </p>
    );
  }

  const asOf = formatKickoff(meta.server_now_utc);

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-muted">
      {meta.mode === "DEMO" ? <SourceBadge kind="DEMO_SYNTHETIC" /> : null}
      {asOf ? (
        <span>
          {meta.demo_clock_frozen ? "Demo as of " : "Server time "}
          <time dateTime={machineDateTime(meta.server_now_utc)} className="font-semibold text-ink">
            {asOf}
          </time>
        </span>
      ) : null}
      {mode === "DEMO_FIXTURES" ? (
        <span>Served from frozen demo fixtures — no backend is connected.</span>
      ) : null}
    </div>
  );
}
