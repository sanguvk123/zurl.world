/**
 * Public API v1 — links collection.
 *
 * POST /api/v1/links   create a link
 * GET  /api/v1/links   list the caller's links
 *
 * Authenticated with an API key. Shares the same service layer as the website,
 * so validation and authorization rules cannot diverge between the two.
 */

import type { NextRequest } from 'next/server';
import { apiError, apiSuccess, rateLimitedResponse, readJsonBody } from '@/lib/api/response';
import { createLinkSchema, fieldErrors } from '@/lib/api/schemas';
import { authenticateApiKey } from '@/lib/auth/api-key';
import { createLink, listUserLinks } from '@/lib/links/service';
import { trackEvent } from '@/lib/observability/logger';
import { checkRateLimit, rateLimitHeaders } from '@/lib/security/rate-limit';
import { shortUrlFor } from '@/lib/seo/site';
import { serialiseLink } from '../serialise';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const principal = await authenticateApiKey(request.headers.get('authorization'));
  if (!principal) {
    return apiError('unauthorized', 'Provide a valid API key as a Bearer token.');
  }

  const limit = await checkRateLimit('createLinkApi', principal.keyId);
  if (!limit.allowed) return rateLimitedResponse(limit);

  const body = await readJsonBody(request);
  if (!body.ok) return body.response;

  const parsed = createLinkSchema.safeParse(body.value);
  if (!parsed.success) {
    const fields = fieldErrors(parsed.error);
    return apiError('validation_error', fields.url ?? 'Invalid request body.', { fields });
  }

  const result = await createLink({
    destinationUrl: parsed.data.url,
    alias: parsed.data.alias,
    title: parsed.data.title,
    password: parsed.data.password,
    expiresAt: parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : undefined,
    userId: principal.userId,
  });

  if (!result.ok) {
    const { error } = result;
    const code =
      error.code === 'taken'
        ? 'alias_taken'
        : error.code === 'reserved'
          ? 'alias_reserved'
          : error.field === 'destinationUrl'
            ? 'invalid_url'
            : 'validation_error';
    return apiError(code, error.message, { field: error.field });
  }

  trackEvent('link_created', { via: 'api', custom: result.link.isCustomAlias === 1 });

  return apiSuccess(
    { ...serialiseLink(result.link), shortUrl: shortUrlFor(request, result.link.shortCode) },
    { status: 201, headers: rateLimitHeaders(limit) },
  );
}

export async function GET(request: NextRequest) {
  const principal = await authenticateApiKey(request.headers.get('authorization'));
  if (!principal) {
    return apiError('unauthorized', 'Provide a valid API key as a Bearer token.');
  }

  const limit = await checkRateLimit('apiRead', principal.keyId);
  if (!limit.allowed) return rateLimitedResponse(limit);

  const { searchParams } = new URL(request.url);
  const requested = Number.parseInt(searchParams.get('limit') ?? '50', 10);
  const offset = Number.parseInt(searchParams.get('offset') ?? '0', 10);

  const links = await listUserLinks(principal.userId, {
    limit: Number.isFinite(requested) ? Math.min(Math.max(requested, 1), 100) : 50,
    offset: Number.isFinite(offset) && offset > 0 ? offset : 0,
  });

  return apiSuccess(
    { links: links.map((link) => ({ ...serialiseLink(link), shortUrl: shortUrlFor(request, link.shortCode) })) },
    { headers: rateLimitHeaders(limit) },
  );
}
