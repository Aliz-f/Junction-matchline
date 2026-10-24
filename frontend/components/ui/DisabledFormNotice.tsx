/**
 * Explains why a form is not yet operable (FE-01 no-op prevention).
 *
 * FE-01 ships the shell, so the auth forms have no working submit path. Rather
 * than render a button that silently does nothing — or worse, fakes a success —
 * the fields and the submit control are genuinely `disabled` and this notice
 * says which task wires them up.
 */
export function DisabledFormNotice({ task, what }: { readonly task: string; readonly what: string }) {
  return (
    <p role="note" className="rounded-md border border-line bg-surface-sunken px-3 py-2 text-sm text-ink-muted">
      <span className="font-semibold text-ink">Not active yet.</span> {what} is wired up in{" "}
      <span className="font-mono text-xs font-bold">{task}</span>, against the real backend session. The fields below
      are intentionally disabled so nothing here can imply you are signed in.
    </p>
  );
}
