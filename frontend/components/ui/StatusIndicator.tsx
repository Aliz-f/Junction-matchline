/**
 * Match status indicator (FE-01).
 *
 * Always renders the status as text alongside the icon and tone, so status is
 * never carried by colour or animation alone. The pulse is decorative, applies
 * only to in-progress statuses, and is removed under `prefers-reduced-motion`
 * by `app/globals.css`.
 */
import { statusToken } from "@/lib/design/status";
import { StatusGlyph } from "./Icon";

type Props = {
  readonly status: string;
  /** `compact` drops the description, for dense lists such as Journey nodes. */
  readonly variant?: "default" | "compact";
  readonly className?: string;
};

export function StatusIndicator({ status, variant = "default", className }: Props) {
  const token = statusToken(status);
  const tone = `rgb(var(${token.toneVar}))`;

  return (
    <span
      className={[
        "inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs font-semibold",
        className ?? "",
      ].join(" ")}
      style={{ color: tone, borderColor: tone, backgroundColor: `rgb(var(${token.toneVar}) / 0.08)` }}
      data-status={status}
      title={variant === "compact" ? token.description : undefined}
    >
      <span className="relative inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center">
        {token.animated ? <span className="status-pulse" aria-hidden="true" /> : null}
        <span className="relative h-3.5 w-3.5">
          <StatusGlyph icon={token.icon} />
        </span>
      </span>
      <span>{token.label}</span>
      {variant === "default" ? <span className="sr-only">. {token.description}</span> : null}
    </span>
  );
}
