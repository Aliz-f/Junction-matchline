/**
 * Not Found (FE-01: "sensible Not Found UI").
 *
 * Reached by an unknown route, a malformed UUID, or — in demo mode — an id the
 * frozen manifest does not contain. It offers real navigation back into the
 * app rather than a dead end.
 */
import Link from "next/link";
import { NAV_ITEMS } from "@/lib/navigation";

export const metadata = { title: "Page not found" };

export default function NotFound() {
  return (
    <div className="mx-auto max-w-prose py-10 text-center">
      <p className="font-mono text-sm font-bold text-ink-muted">404</p>
      <h1 className="mt-2 text-2xl font-black tracking-tight text-ink">We couldn&rsquo;t find that page</h1>
      <p className="mt-2 text-sm text-ink-muted">
        The link may be out of date, or it may point at a match or room that does not exist in the current data set.
      </p>

      <ul className="mt-6 flex flex-wrap justify-center gap-2">
        {NAV_ITEMS.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              className="inline-block rounded-md border border-line bg-surface-raised px-3 py-1.5 text-sm font-semibold text-ink hover:bg-surface-sunken"
            >
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
