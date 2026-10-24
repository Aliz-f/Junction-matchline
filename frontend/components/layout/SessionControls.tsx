/**
 * Header session controls (FE-02).
 *
 * Shows who is signed in and offers sign-out. Signing out drops every private
 * cached body before re-establishing the guest session (CT-12), and clears any
 * stored What-if attempt envelopes so a later account cannot inherit one.
 */
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLogout, useSession } from "@/lib/api/hooks";
import { clearAllAttempts } from "@/lib/whatif/attempt";

export function SessionControls() {
  const { user, isLoading } = useSession();
  const logout = useLogout();
  const pathname = usePathname() ?? "/";

  if (isLoading) {
    return <span className="text-xs text-ink-muted">Checking session…</span>;
  }

  if (user === null) {
    // Carry the current path so signing in returns the user here.
    const next = encodeURIComponent(pathname);
    return (
      <div className="flex items-center gap-2">
        <Link
          href={`/login?next=${next}`}
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
    );
  }

  return (
    <div className="flex items-center gap-3">
      <Link href="/profile" className="text-sm font-semibold text-ink">
        {user.display_name}
        <span className="ml-1.5 rounded bg-surface-sunken px-1.5 py-0.5 text-[0.625rem] font-bold uppercase tracking-wide text-ink-muted">
          {user.plan}
        </span>
      </Link>
      <button
        type="button"
        onClick={() => {
          clearAllAttempts();
          logout.mutate();
        }}
        disabled={logout.isPending}
        className="rounded-md border border-line px-3 py-1.5 text-sm font-semibold text-ink hover:bg-surface-sunken disabled:opacity-60"
      >
        {logout.isPending ? "Signing out…" : "Sign out"}
      </button>
    </div>
  );
}
