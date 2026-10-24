/**
 * Competition badge (FE-01).
 *
 * Shows competition identity — accent colour plus an original motif — and
 * nothing about match state. An unrecognised `brand_key` renders the neutral
 * token rather than another competition's colours.
 */
import { competitionToken } from "@/lib/design/competitions";
import { CompetitionGlyph } from "./Icon";

type Props = {
  readonly brandKey: string | null | undefined;
  /** Falls back to the token label when the backend sends no display name. */
  readonly name?: string | null;
  readonly className?: string;
};

export function CompetitionBadge({ brandKey, name, className }: Props) {
  const token = competitionToken(brandKey);
  const accent = `rgb(var(${token.accentVar}))`;

  return (
    <span
      className={[
        "inline-flex items-center gap-2 rounded-md px-2 py-1 text-xs font-semibold",
        className ?? "",
      ].join(" ")}
      style={{ color: accent, backgroundColor: `rgb(var(${token.accentVar}) / 0.12)` }}
      data-competition={token.key}
    >
      <span className="h-3.5 w-3.5 shrink-0">
        <CompetitionGlyph motif={token.motif} />
      </span>
      <span>{name ?? token.label}</span>
    </span>
  );
}
