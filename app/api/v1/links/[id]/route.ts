/**
 * Public API v1 — single link.
 *
 * GET    /api/v1/links/:id
 * PATCH  /api/v1/links/:id
 * DELETE /api/v1/links/:id
 *
 * Ownership is enforced by the service layer, which scopes every query to the
 * authenticated user. A link belonging to someone else returns 404 rather than
 * 403, so the endpoint cannot be used to test whether an id exists.
 */

import type { NextRequest } from 'next/server';
import { apiError, apiSuccess, rateLimitedResponse, readJsonBody } from '@/lib/api/response';
import { fieldErrors, updateLinkSchema } from '@/lib/api/schemas';
import { authenticateApiKey } from '@/lib/auth/api-key';
import { deleteUserLink, findUserLink, updateUserLink } from '@/lib/links/service';
import { checkRateLimit, rateLimitHeaders } from '@/lib/security/rate-limit';
import { shortUrlFor } from '@/lib/seo/site';
import { serialiseLink } from '../../serialise';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Context = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: Context) {
  const principal = await authenticateApiKey(request.headers.get('authorization'));
  if (!principal) return apiError('unauthorized', 'Provide a valid API key as a Bearer token.');

  const limit = await checkRateLimit('apiRead', principal.keyId);
  if (!limit.allowed) return rateLimitedResponse(limit);

  const { id } = await context.params;
  const link = await findUserLink(id, principal.userId);
  if (!link) return apiError('not_found', 'No link with that id.');

  return apiSuccess(
    { ...serialiseLink(link), shortUrl: shortUrlFor(request, link.shortCode) },
    { headers: rateLimitHeaders(limit) },
  );
}

export async function PATCH(request: NextRequest, context: Context) {
  const principal = await authenticateApiKey(request.headers.get('authorization'));
  if (!principal) return apiError('unauthorized', 'Provide a valid API key as a Bearer token.');

  const limit = await checkRateLimit('apiRead', principal.keyId);
  if (!limit.allowed) return rateLimitedResponse(limit);

  const body = await readJsonBody(request);
  if (!body.ok) return body.response;

  const parsed = updateLinkSchema.safeParse(body.value);
  if (!parsed.success) {
    return apiError('validation_error', 'Invalid request body.', {
      fields: fieldErrors(parsed.error),
    });
  }

  const { id } = await context.params;

  const result = await updateUserLink(id, principal.userId, {
    ...(parsed.data.url !== undefined ? { destinationUrl: parsed.data.url } : {}),
    ...(parsed.data.title !== undefined ? { title: parsed.data.title ?? null } : {}),
    ...(parsed.data.expiresAt !== undefined
      ? { expiresAt: parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : null }
      : {}),
    ...(parsed.data.disabled !== undefined ? { disabled: parsed.data.disabled } : {}),
  });

  if (!result.ok) {
    if (result.error.code === 'not_found') {
      return apiError('not_found', 'No link with that id.');
    }
    return apiError('validation_error', result.error.message, { field: result.error.field });
  }

  return apiSuccess(
    { ...serialiseLink(result.link), shortUrl: shortUrlFor(request, result.link.shortCode) },
    { headers: rateLimitHeaders(limit) },
  );
}

export async function DELETE(request: NextRequest, context: Context) {
  const principal = await authenticateApiKey(request.headers.get('authorization'));
  if (!principal) return apiError('unauthorized', 'Provide a valid API key as a Bearer token.');

  const limit = await checkRateLimit('apiRead', principal.keyId);
  if (!limit.allowed) return rateLimitedResponse(limit);

  const { id } = await context.params;
  const deleted = await deleteUserLink(id, principal.userId);
  if (!deleted) return apiError('not_found', 'No link with that id.');

  return apiSuccess({ deleted: true }, { headers: rateLimitHeaders(limit) });
}
