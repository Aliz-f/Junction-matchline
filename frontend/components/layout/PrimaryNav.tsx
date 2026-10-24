/**
 * Primary navigation (FE-01).
 *
 * Journey is the app's main page and lives at `/`; the map is a separate
 * destination and never the default (FE-01: "`/` routes Journey, not Map").
 * The active item is marked with `aria-current`, not colour alone.
 *
 * The item list lives in `lib/navigation.ts` so server components can read it
 * too — see the note there.
 */
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NavGlyph } from "@/components/ui/Icon";
import { NAV_ITEMS, isActive } from "@/lib/navigation";

export function PrimaryNav() {
  const pathname = usePathname() ?? "/";

  return (
    <nav aria-label="Primary" className="w-full">
      <ul className="flex w-full items-stretch justify-between gap-1 sm:justify-start sm:gap-2">
        {NAV_ITEMS.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <li key={item.href} className="min-w-0 flex-1 sm:flex-none">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={[
                  "flex h-full flex-col items-center gap-1 rounded-md px-2 py-2 text-center text-[0.6875rem]",
                  "font-semibold transition-colors sm:flex-row sm:gap-2 sm:text-sm",
                  active
                    ? "bg-surface-sunken text-ink ring-1 ring-line"
                    : "text-ink-muted hover:bg-surface-sunken hover:text-ink",
                ].join(" ")}
              >
                <span className="h-5 w-5 shrink-0">
                  <NavGlyph icon={item.icon} />
                </span>
                <span className="truncate">{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
