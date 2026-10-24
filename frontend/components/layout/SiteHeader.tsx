/**
 * App header (FE-01).
 *
 * Renders brand, primary navigation, the demo/server clock indicator and the
 * session controls. Nothing here is decorative (FE-01 no-op prevention).
 */
import Link from "next/link";
import { PrimaryNav } from "./PrimaryNav";
import { SessionControls } from "./SessionControls";
import { DemoClockNotice } from "./DemoClockNotice";
import type { MetaView } from "@/lib/api/types";
import type { DataMode } from "@/lib/demo/mode";

type Props = { readonly mode: DataMode; readonly meta: MetaView | null };

export function SiteHeader({ mode, meta }: Props) {
  return (
    <header className="sticky top-0 z-20 border-b border-line bg-surface-raised/95 backdrop-blur">
      <div className="mx-auto flex max-w-shell flex-col gap-3 px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href="/" className="flex items-baseline gap-2">
            <span className="text-lg font-black tracking-tight text-ink">Matchline</span>
            <span className="text-xs font-semibold uppercase tracking-widest text-ink-muted">Phase 1</span>
          </Link>

          <SessionControls />
        </div>

        <DemoClockNotice mode={mode} meta={meta} />

        <div className="hidden sm:block">
          <PrimaryNav />
        </div>
      </div>
    </header>
  );
}
