/**
 * App header (FE-01).
 *
 * Renders brand, primary navigation and the demo/server clock indicator.
 * Auth controls link to the real `/login` and `/register` routes; no control
 * here is decorative (FE-01 no-op prevention).
 */
import Link from "next/link";
import { PrimaryNav } from "./PrimaryNav";
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

          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="rounded-md border border-line px-3 py-1.5 text-sm font-semibold text-ink hover:bg-surface-sunken"
            >
              Sign in
            </Link>
            <Link
              href="/register"
              className="rounded-md bg-ink px-3 py-1.5 text-sm font-semibold text-surface-raised hover:opacity-90"
            >
              Create account
            </Link>
          </div>
        </div>

        <DemoClockNotice mode={mode} meta={meta} />

        <div className="hidden sm:block">
          <PrimaryNav />
        </div>
      </div>
    </header>
  );
}
