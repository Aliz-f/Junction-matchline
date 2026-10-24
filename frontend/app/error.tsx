/**
 * Route error boundary (FE-01).
 *
 * Shows a real retry control wired to Next's `reset()`, and the error digest
 * so a failure can be correlated with server logs. The message itself is not
 * echoed to the user, because it may carry internal detail.
 */
"use client";

import { useEffect } from "react";

export default function RouteError({
  error,
  reset,
}: {
  readonly error: Error & { digest?: string };
  readonly reset: () => void;
}) {
  useEffect(() => {
    console.error("Route error", error.digest ?? error.message);
  }, [error]);

  return (
    <div role="alert" className="mx-auto max-w-prose py-10">
      <h1 className="text-2xl font-black tracking-tight text-ink">This page didn&rsquo;t load</h1>
      <p className="mt-2 text-sm text-ink-muted">
        Something failed while rendering this screen. Nothing was changed, and you can try again.
      </p>
      {error.digest ? (
        <p className="mt-2 text-xs text-ink-muted">
          Reference: <code className="font-mono">{error.digest}</code>
        </p>
      ) : null}
      <button
        type="button"
        onClick={reset}
        className="mt-5 rounded-md border border-line bg-surface-raised px-3 py-1.5 text-sm font-semibold text-ink hover:bg-surface-sunken"
      >
        Try again
      </button>
    </div>
  );
}
