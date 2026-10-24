/**
 * Honest placeholder for a screen a later task delivers (FE-01).
 *
 * FE-01 builds the shell, not the feature screens. Rather than ship decorative
 * buttons or a fake populated UI, each route states plainly what it will do,
 * which task delivers it and what it is waiting on. This satisfies FE-01's
 * no-op prevention rule: nothing here looks actionable unless it is.
 */
type Props = {
  readonly task: string;
  readonly title: string;
  readonly summary: string;
  /** Contract endpoints the screen needs, shown so blockers stay visible. */
  readonly needs?: readonly string[];
  readonly gate?: string;
};

export function PlannedSurface({ task, title, summary, needs, gate }: Props) {
  return (
    <section className="rounded-lg border border-dashed border-line bg-surface-raised p-5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded bg-surface-sunken px-2 py-0.5 font-mono text-xs font-bold text-ink-muted">
          {task}
        </span>
        {gate ? (
          <span className="rounded bg-surface-sunken px-2 py-0.5 font-mono text-xs font-bold text-ink-muted">
            {gate}
          </span>
        ) : null}
        <span className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Not built yet</span>
      </div>

      <h2 className="mt-3 text-lg font-bold text-ink">{title}</h2>
      <p className="mt-1 max-w-prose text-sm text-ink-muted">{summary}</p>

      {needs?.length ? (
        <div className="mt-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Requires</h3>
          <ul className="mt-1.5 flex flex-wrap gap-1.5">
            {needs.map((endpoint) => (
              <li key={endpoint} className="rounded bg-surface-sunken px-2 py-1 font-mono text-xs text-ink-muted">
                {endpoint}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
