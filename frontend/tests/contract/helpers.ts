import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

/** Absolute path from the `frontend/` root. */
export const frontendPath = (relative: string) => fileURLToPath(new URL(`../../${relative}`, import.meta.url));
/** Absolute path from the monorepo root (read-only access to backend artifacts). */
export const repoPath = (relative: string) => fileURLToPath(new URL(`../../../${relative}`, import.meta.url));

export const sha256File = (path: string) => createHash("sha256").update(readFileSync(path)).digest("hex");

/** Europe/London civil date (`YYYY-MM-DD`) of a UTC instant, via the IANA zone database. */
export function londonCivilDate(utc: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/London",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(utc));
}

export const isUuid = (value: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
