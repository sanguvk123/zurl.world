/**
 * POST /api/links — create a short link.
 *
 * Serves both the website form and anonymous programmatic use. The versioned
 * public API (`/api/v1/links`) authenticates with an API key and shares the
 * same service layer.
 */

import type { NextRequest } from 'next/server';
import { apiError, apiSuccess, rateLimitedResponse, readJsonBody } from '@/lib/api/response';
import { createLinkSchema, fieldErrors } from '@/lib/api/schemas';
import { getUserFromRequest } from '@/lib/auth/session';
import { createLink } from '@/lib/links/service';
import { logger, trackEvent } from '@/lib/observability/logger';
import { checkRateLimit, rateLimitHeaders } from '@/lib/security/rate-limit';
import { getClientIp, hashIp } from '@/lib/security/request';
import { shortUrlFor } from '@/lib/seo/site';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const body = await readJsonBody(request);
  if (!body.ok) return body.response;

  const parsed = createLinkSchema.safeParse(body.value);
  if (!parsed.success) {
    const fields = fieldErrors(parsed.error);
    // Surface the specific field message rather than a generic fallback: the
    // schema already explains exactly what is wrong (for example the minimum
    // alias length), and hiding that behind "Check the details" forces the
    // user to guess.
    const message =
      fields.url ??
      fields.alias ??
      fields.title ??
      fields.password ??
      fields.expiresAt ??
      Object.values(fields)[0] ??
      'Check the details and try again.';

    return apiError('validation_error', message, {
      fields,
    });
  }

  const user = await getUserFromRequest(request);
  const ip = getClientIp(request.headers);
  const ipHash = hashIp(ip);

  // Authenticated users get a much higher allowance, keyed by account rather
  // than IP so shared networks are not penalised.
  const limit = user
    ? await checkRateLimit('createLinkUser', user.id)
    : await checkRateLimit('createLinkAnonymous', ipHash);

  if (!limit.allowed) {
    logger.warn('ratelimit.create_link', { authenticated: user !== null });
    return rateLimitedResponse(limit);
  }

  // Custom aliases are a signed-in feature. Anonymous users still get a full
  // short link — the core product genuinely works without an account.
  if (parsed.data.alias && !user) {
    return apiError('forbidden', 'Create a free account to choose a custom link.', {
      field: 'alias',
    });
  }

  /*
   * A thrown error here (database unreachable, misconfigured connection
   * string) would otherwise escape the handler and the platform would return
   * an empty body with no status the client can act on. Convert it into a
   * real 503 and log the cause, so a misconfigured deployment is diagnosable
   * from the response alone rather than only from the platform logs.
   */
  let result: Awaited<ReturnType<typeof createLink>>;
  try {
    result = await createLink({
      destinationUrl: parsed.data.url,
      alias: parsed.data.alias,
      title: parsed.data.title,
      password: parsed.data.password,
      expiresAt: parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : undefined,
      userId: user?.id,
      creatorIpHash: ipHash,
    });
  } catch (error) {
    logger.error('link.create_failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    return apiError(
      'service_unavailable',
      'Unable to create a link right now. Please try again shortly.',
    );
  }

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

  trackEvent('link_created', {
    authenticated: user !== null,
    custom: result.link.isCustomAlias === 1,
    hasPassword: result.link.passwordHash !== null,
    hasExpiry: result.link.expiresAt !== null,
    warnings: result.warnings,
  });

  return apiSuccess(
    {
      id: result.link.id,
      shortCode: result.link.shortCode,
      shortUrl: shortUrlFor(request, result.link.shortCode),
      destinationUrl: result.link.destinationUrl,
      title: result.link.title,
      expiresAt: result.link.expiresAt?.toISOString() ?? null,
      hasPassword: result.link.passwordHash !== null,
      createdAt: result.link.createdAt.toISOString(),
      warnings: result.warnings,
    },
    { status: 201, headers: rateLimitHeaders(limit) },
  );
}

/** Explicit 405s rather than Next's default, so the API shape is predictable. */
export async function GET() {
  return apiError('method_not_allowed', 'Use POST to create a link.');
}
