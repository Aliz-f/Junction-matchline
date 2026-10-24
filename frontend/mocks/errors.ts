import { HttpResponse } from "msw";
import { ERROR_STATUS, type ErrorCode } from "@/lib/api/contract";
import type { ErrorEnvelope } from "@/lib/api/types";

/** Opaque, non-resource correlation ID (A1 allows non-UUID `request_id`). */
export const MOCK_REQUEST_ID = "req_mock";

/** A1 privacy headers for session-specific, private and room-feed responses. */
export const PRIVATE_HEADERS = { "Cache-Control": "private, no-store", Vary: "Cookie" } as const;

export function errorEnvelope(code: ErrorCode, message: string, details: Record<string, unknown> = {}): ErrorEnvelope {
  return { error: { code, message, details, request_id: MOCK_REQUEST_ID } };
}

/** Error response whose HTTP status always comes from the A1 code table. */
export function errorResponse(
  code: ErrorCode,
  message: string,
  init: { details?: Record<string, unknown>; headers?: Record<string, string> } = {},
) {
  return HttpResponse.json(errorEnvelope(code, message, init.details), {
    status: ERROR_STATUS[code],
    ...(init.headers ? { headers: init.headers } : {}),
  });
}
