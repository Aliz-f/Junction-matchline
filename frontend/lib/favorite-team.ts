/**
 * Guest favourite-team storage (FE-02).
 *
 * A guest's choice lives in `localStorage` under the exact key the spec names.
 * Once signed in, the **server** favourite wins — including when it is null —
 * and this value is only ever offered for import with explicit consent. It is
 * never silently applied over a server preference.
 *
 * Every access is wrapped: `localStorage` throws in private windows and with
 * site data blocked, and must never break rendering.
 */
import { isUuid } from "@/lib/uuid";

export const GUEST_FAVORITE_KEY = "matchline:favorite_team_id:v1";

export function readGuestFavorite(): string | null {
  try {
    const value = window.localStorage.getItem(GUEST_FAVORITE_KEY);
    // Reject anything that is not a UUID, so a corrupted value cannot become a
    // bogus `team_id` query parameter.
    return value && isUuid(value) ? value : null;
  } catch {
    return null;
  }
}

export function writeGuestFavorite(teamId: string): void {
  if (!isUuid(teamId)) return;
  try {
    window.localStorage.setItem(GUEST_FAVORITE_KEY, teamId);
  } catch {
    // Storage unavailable; the choice simply does not persist.
  }
}

export function clearGuestFavorite(): void {
  try {
    window.localStorage.removeItem(GUEST_FAVORITE_KEY);
  } catch {
    // Nothing to do.
  }
}
