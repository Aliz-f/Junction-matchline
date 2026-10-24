/**
 * Football-local time rendering.
 *
 * Instants are stored and transported as UTC (A1 `YYYY-MM-DDTHH:mm:ssZ`) and
 * rendered in Europe/London with an explicit timezone cue, so a user in another
 * zone is never shown a bare local time (AGENTS.md section 5). The IANA zone
 * supplies the BST/GMT offset, including across DST boundaries.
 */
export const FOOTBALL_TIME_ZONE = "Europe/London";

const DATE_TIME = new Intl.DateTimeFormat("en-GB", {
  timeZone: FOOTBALL_TIME_ZONE,
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZoneName: "short",
});

const DATE_ONLY = new Intl.DateTimeFormat("en-GB", {
  timeZone: FOOTBALL_TIME_ZONE,
  day: "numeric",
  month: "long",
  year: "numeric",
});

const TIME_ONLY = new Intl.DateTimeFormat("en-GB", {
  timeZone: FOOTBALL_TIME_ZONE,
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZoneName: "short",
});

function parse(utc: string): Date | null {
  const date = new Date(utc);
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * Formats a UTC instant as football-local date and time with its zone, e.g.
 * "Sat 24 Oct, 13:00 BST". Returns null for an unparseable value so callers
 * render an explicit fallback rather than "Invalid Date".
 */
export function formatKickoff(utc: string | null | undefined): string | null {
  if (!utc) return null;
  const date = parse(utc);
  return date ? DATE_TIME.format(date).replace(/,\s/, " ") : null;
}

/** Formats a UTC instant as a football-local date only. */
export function formatDate(utc: string | null | undefined): string | null {
  if (!utc) return null;
  const date = parse(utc);
  return date ? DATE_ONLY.format(date) : null;
}

/** Formats a UTC instant as a football-local time with its zone. */
export function formatTime(utc: string | null | undefined): string | null {
  if (!utc) return null;
  const date = parse(utc);
  return date ? TIME_ONLY.format(date) : null;
}

/** The value for a `<time datetime="...">` attribute, which stays UTC. */
export function machineDateTime(utc: string | null | undefined): string | undefined {
  if (!utc) return undefined;
  return parse(utc) ? utc : undefined;
}
