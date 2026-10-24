/**
 * Safe return-to paths (FE-02).
 *
 * After signing in we return the user where they were, taken from a `?next=`
 * parameter. That value is attacker-controllable, so only a same-origin
 * **path** is ever accepted: an absolute URL, a protocol-relative `//host`, or
 * anything with a scheme would be an open redirect.
 */

/** The default landing place, which is the Journey. */
export const DEFAULT_RETURN_PATH = "/";

export function safeReturnPath(raw: string | null | undefined): string {
  if (!raw) return DEFAULT_RETURN_PATH;

  // Must be a rooted path, and not protocol-relative.
  if (!raw.startsWith("/") || raw.startsWith("//")) return DEFAULT_RETURN_PATH;

  // Reject anything carrying a scheme or a backslash trick.
  if (/[\\]/.test(raw) || /^\/[a-z][a-z0-9+.-]*:/i.test(raw)) return DEFAULT_RETURN_PATH;

  // Reject control characters, which some parsers strip before resolving.
  if (/[\u0000-\u001f\u007f]/.test(raw)) return DEFAULT_RETURN_PATH;

  return raw;
}
