/**
 * Shared loading / error / empty states (FE-01).
 *
 * Every data-backed surface uses these rather than rendering a blank area or a
 * fake success state. The error state always offers a real retry action and
 * surfaces the contract `request_id` when one is available, so a failure can be
 * traced instead of silently swallowed.
 */
"use client";

import type { ErrorEnvelope } from "@/lib/api/types";

export function LoadingState({ label = "Loading…" }: { readonly label?: string }) {
  return (
    <div role="status" aria-live="polite" className="flex items-center gap-3 px-4 py-10 text-sm text-ink-muted">
      <span
        aria-hidden="true"
        className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-line border-t-transparent"
      />
      <span>{label}</span>
    </div>
  );
}

/** Skeleton rows for list-shaped content. Hidden from assistive technology. */
export function SkeletonList({ rows = 3 }: { readonly rows?: number }) {
  return (
    <div aria-hidden="true" className="space-y-3">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="h-16 animate-pulse rounded-lg bg-surface-sunken" />
      ))}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  readonly title: string;
  readonly description: string;
  readonly action?: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-dashed border-line bg-surface-raised px-4 py-10 text-center">
      <h3 className="text-base font-semibold text-ink">{title}</h3>
      <p className="mx-auto mt-1 max-w-prose text-sm text-ink-muted">{description}</p>
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </div>
  );
}

export function ErrorState({
  title = "Something went wrong",
  description,
  envelope,
  onRetry,
}: {
  readonly title?: string;
  readonly description?: string;
  readonly envelope?: ErrorEnvelope | null;
  readonly onRetry?: () => void;
}) {
  const detail = description ?? envelope?.error.message ?? "The request could not be completed.";
  const requestId = envelope?.error.request_id;

  return (
    <div role="alert" className="rounded-lg border border-red-500/50 bg-red-500/5 px-4 py-6">
      <h3 className="text-base font-semibold text-ink">{title}</h3>
      <p className="mt-1 text-sm text-ink-muted">{detail}</p>
      {requestId ? (
        <p className="mt-2 text-xs text-ink-muted">
          Reference: <code className="font-mono">{requestId}</code>
        </p>
      ) : null}
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 rounded-md border border-line bg-surface-raised px-3 py-1.5 text-sm font-semibold text-ink hover:bg-surface-sunken"
        >
          Try again
        </button>
      ) : null}
    </div>
  );
}

/**
 * Explicitly unavailable data. Used instead of inventing football analysis the
 * provider feed does not contain (FE-04: "Not available in this feed").
 */
export function NotInFeed({ what }: { readonly what: string }) {
  return (
    <p className="rounded-md border border-line bg-surface-sunken px-3 py-2 text-sm text-ink-muted">
      <span className="font-semibold text-ink">Not available in this feed.</span> {what}
    </p>
  );
}
