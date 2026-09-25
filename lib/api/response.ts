/**
 * Consistent JSON API envelopes.
 *
 * Errors always carry a machine-readable `code` alongside a human `message`, so
 * clients branch on the code and users read the message. Internal error detail
 * is never included — stack traces stay in the logs.
 */

import { NextResponse } from 'next/server';
import type { RateLimitResult } from '@/lib/security/rate-limit';
import { rateLimitHeaders } from '@/lib/security/rate-limit';

export type ApiErrorCode =
  | 'validation_error'
  | 'invalid_url'
  | 'alias_taken'
  | 'alias_reserved'
  | 'rate_limited'
  | 'unauthorized'
  | 'forbidden'
  | 'not_found'
  | 'method_not_allowed'
  | 'payload_too_large'
  | 'internal_error'
  /** Dependency (usually the database) is unreachable. Retryable. */
  | 'service_unavailable';

const STATUS_BY_CODE: Record<ApiErrorCode, number> = {
  validation_error: 400,
  invalid_url: 400,
  alias_taken: 409,
  alias_reserved: 409,
  rate_limited: 429,
  unauthorized: 401,
  forbidden: 403,
  not_found: 404,
  method_not_allowed: 405,
  payload_too_large: 413,
  internal_error: 500,
  service_unavailable: 503,
};

export function apiSuccess<T>(data: T, init?: { status?: number; headers?: HeadersInit }) {
  return NextResponse.json(
    { ok: true as const, data },
    { status: init?.status ?? 200, headers: init?.headers },
  );
}

export function apiError(
  code: ApiErrorCode,
  message: string,
  options: {
    field?: string;
    fields?: Record<string, string>;
    status?: number;
    headers?: HeadersInit;
  } = {},
) {
  return NextResponse.json(
    {
      ok: false as const,
      error: {
        code,
        message,
        ...(options.field ? { field: options.field } : {}),
        ...(options.fields ? { fields: options.fields } : {}),
      },
    },
    { status: options.status ?? STATUS_BY_CODE[code], headers: options.headers },
  );
}

export function rateLimitedResponse(result: RateLimitResult) {
  return apiError('rate_limited', "You're creating links too quickly. Try again shortly.", {
    headers: rateLimitHeaders(result),
  });
}

/**
 * Parses a JSON body defensively.
 *
 * Rejects oversized payloads before parsing so a large body cannot be used to
 * exhaust memory.
 */
export async function readJsonBody(
  request: Request,
  maxBytes = 16 * 1024,
): Promise<{ ok: true; value: unknown } | { ok: false; response: ReturnType<typeof apiError> }> {
  const contentLength = request.headers.get('content-length');
  if (contentLength && Number.parseInt(contentLength, 10) > maxBytes) {
    return {
      ok: false,
      response: apiError('payload_too_large', 'That request is too large.'),
    };
  }

  let text: string;
  try {
    text = await request.text();
  } catch {
    return { ok: false, response: apiError('validation_error', 'Could not read the request.') };
  }

  if (text.length > maxBytes) {
    return { ok: false, response: apiError('payload_too_large', 'That request is too large.') };
  }

  if (text.trim().length === 0) {
    return { ok: true, value: {} };
  }

  try {
    return { ok: true, value: JSON.parse(text) };
  } catch {
    return { ok: false, response: apiError('validation_error', 'Request body must be valid JSON.') };
  }
}
