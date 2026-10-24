/**
 * Responsive app shell (FE-01).
 *
 * Layout holds at 360px: navigation moves to a fixed bottom bar on small
 * screens and into the header from `sm` up, so no horizontal page scroll is
 * needed. A skip link precedes all navigation for keyboard users.
 */
import { PrimaryNav } from "./PrimaryNav";
import { SiteHeader } from "./SiteHeader";
import { DEMO_DISCLAIMER } from "@/lib/demo/responses";
import type { MetaView } from "@/lib/api/types";
import type { DataMode } from "@/lib/demo/mode";

type Props = {
  readonly mode: DataMode;
  readonly meta: MetaView | null;
  readonly children: React.ReactNode;
};

export function AppShell({ mode, meta, children }: Props) {
  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md
                   focus:bg-surface-raised focus:px-3 focus:py-2 focus:text-sm focus:font-semibold focus:text-ink
                   focus:ring-2 focus:ring-line"
      >
        Skip to main content
      </a>

      <SiteHeader mode={mode} meta={meta} />

      <main id="main" className="mx-auto w-full max-w-shell flex-1 px-4 py-6 pb-24 sm:pb-6">
        {children}
      </main>

      <footer className="border-t border-line bg-surface-raised px-4 py-6 pb-24 sm:pb-6">
        <div className="mx-auto max-w-shell space-y-2 text-xs text-ink-muted">
          {mode === "DEMO_FIXTURES" ? <p>{DEMO_DISCLAIMER}</p> : null}
          <p>
            Times are shown in Europe/London with an explicit timezone. Matchline is an independent demo and is not
            affiliated with, endorsed by, or licensed by any football competition or club.
          </p>
        </div>
      </footer>

      {/* Small-screen navigation. Hidden from `sm` up, where the header shows it. */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-surface-raised px-2 py-1 sm:hidden">
        <PrimaryNav />
      </div>
    </div>
  );
}
