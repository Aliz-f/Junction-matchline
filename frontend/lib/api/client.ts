/**
 * Typed `/api/v1` client (FE-02).
 *
 * Rules this file enforces so callers cannot get them wrong:
 *
 * - **Same-origin only.** Every request goes to the relative path `/api/v1/...`.
 *   There is no configurable base URL and no way to pass an absolute origin, so
 *   a component cannot accidentally call FastAPI cross-origin.
 * - **Cookies always.** `credentials: "include"` on every request, because the
 *   session is an HttpOnly cookie. No token is read or stored in JS.
 * - **No invented CSRF header.** The backend validates the browser's ordinary
 *   `Origin` header on writes; we do not add a custom header it does not expect.
 * - **Private responses are never cached.** `cache: "no-store"` is the default,
 *   and callers must opt in to anything weaker.
 * - **Errors are typed.** A non-2xx response is parsed against the A1 error
 *   envelope and thrown as `ApiError`, so UI code branches on `code`, never on
 *   a string message.
 */
import { ErrorEnvelope } from "./contract";
import type { ErrorCode, ErrorEnvelope as ErrorEnvelopeType } from "./types";

/** Browser-facing base path. Relative by construction (A1). */
export const API_BASE = "/api/v1";

/**
 * A failed API call.
 *
 * `code` is an A1 error code when the body conformed to the envelope. When it
 * did not — a proxy error page, a 502 from an unreachable backend, or a code
 * outside the frozen table — `code` is null and `conformed` is false, so the UI
 * can distinguish "the server said FORBIDDEN" from "something ate the response".
 */
export class ApiError extends Error {
  readonly status: number;
  readonly code: ErrorCode | null;
  readonly requestId: string | null;
  readonly details: Record<string, unknown>;
  readonly envelope: ErrorEnvelopeType | null;
  readonly conformed: boolean;

  constructor(init: {
    status: number;
    message: string;
    code?: ErrorCode | null;
    requestId?: string | null;
    details?: Record<string, unknown>;
    envelope?: ErrorEnvelopeType | null;
  }) {
    super(init.message);
    this.name = "ApiError";
    this.status = init.status;
    this.code = init.code ?? null;
    this.requestId = init.requestId ?? null;
    this.details = init.details ?? {};
    this.envelope = init.envelope ?? null;
    this.conformed = init.envelope !== null && init.envelope !== undefined;
  }

  /** True when the caller must sign in again (session expired or absent). */
  get isUnauthenticated(): boolean {
    return this.status === 401;
  }

  /** True when the action needs a plan the current account does not have. */
  get isPremiumRequired(): boolean {
    return this.code === "PREMIUM_REQUIRED";
  }
}

type RequestOptions = {
  readonly method?: "GET" | "POST" | "PUT" | "DELETE";
  /** Serialised as JSON with a `Content-Type` header. */
  readonly body?: unknown;
  readonly query?: Readonly<Record<string, string | number | undefined | null>>;
  readonly signal?: AbortSignal;
  /**
   * Extra headers. Used for the mandatory `Idempotency-Key` on prediction and
   * What-if writes. No CSRF header is ever added: the backend validates the
   * browser's ordinary `Origin`.
   */
  readonly headers?: Readonly<Record<string, string>>;
  /**
   * Only loosen this for genuinely public, non-user-specific data. Private and
   * room responses must stay `no-store` (CT-12).
   */
  readonly cache?: RequestCache;
};

function buildPath(path: string, query: RequestOptions["query"]): string {
  if (path.startsWith("http://") || path.startsWith("https://") || path.startsWith("//")) {
    throw new Error(`Absolute API URL is not allowed: ${path}. Use a path under ${API_BASE}.`);
  }
  const normalised = path.startsWith("/") ? path : `/${path}`;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined && value !== null) params.set(key, String(value));
  }
  const suffix = params.toString();
  return `${API_BASE}${normalised}${suffix ? `?${suffix}` : ""}`;
}

async function toApiError(response: Response): Promise<ApiError> {
  let raw: unknown = null;
  try {
    raw = await response.json();
  } catch {
    // Not JSON at all — e.g. a proxy error page.
  }

  const parsed = ErrorEnvelope.safeParse(raw);
  if (parsed.success) {
    const { code, message, details, request_id } = parsed.data.error;
    return new ApiError({
      status: response.status,
      message,
      code,
      requestId: request_id,
      details,
      envelope: parsed.data,
    });
  }

  // Non-conforming body. Surface the status rather than guessing a code.
  return new ApiError({
    status: response.status,
    message: `Request failed with status ${response.status}.`,
  });
}

/**
 * Performs a request and validates the response against a contract schema.
 *
 * Validation is deliberate: a silently-changed backend field surfaces here as a
 * loud failure instead of `undefined` reaching the UI.
 */
export async function apiRequest<T>(
  path: string,
  schema: { parse: (value: unknown) => T },
  options: RequestOptions = {},
): Promise<T> {
  const { method = "GET", body, query, signal, cache = "no-store", headers } = options;

  const init: RequestInit = {
    method,
    cache,
    // The session is an HttpOnly cookie, so it must ride along.
    credentials: "include",
    headers: { Accept: "application/json", ...headers },
    ...(signal ? { signal } : {}),
  };

  if (body !== undefined) {
    init.body = JSON.stringify(body);
    init.headers = { ...init.headers, "Content-Type": "application/json" };
  }

  const response = await fetch(buildPath(path, query), init);

  if (!response.ok) throw await toApiError(response);

  // 204 and other empty successes carry no body to validate.
  if (response.status === 204 || response.headers.get("Content-Length") === "0") {
    return schema.parse(undefined);
  }

  return schema.parse(await response.json());
}

/** Convenience for a 204 endpoint, where there is nothing to validate. */
export async function apiRequestVoid(path: string, options: RequestOptions = {}): Promise<void> {
  const response = await fetch(buildPath(path, options.query), {
    method: options.method ?? "POST",
    cache: options.cache ?? "no-store",
    credentials: "include",
    headers: options.body !== undefined ? { "Content-Type": "application/json" } : {},
    ...(options.body !== undefined ? { body: JSON.stringify(options.body) } : {}),
    ...(options.signal ? { signal: options.signal } : {}),
  });

  if (!response.ok) throw await toApiError(response);
}
