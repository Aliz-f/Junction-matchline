/** Consistent page heading. Exactly one `h1` per route (FE-01 a11y). */
export function PageHeading({
  title,
  description,
  children,
}: {
  readonly title: string;
  readonly description?: string;
  readonly children?: React.ReactNode;
}) {
  return (
    <div className="mb-6">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-black tracking-tight text-ink">{title}</h1>
        {children}
      </div>
      {description ? <p className="mt-1.5 max-w-prose text-sm text-ink-muted">{description}</p> : null}
    </div>
  );
}
