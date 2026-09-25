/**
 * POST /api/protected/:code — verify a link password.
 *
 * On success the destination is returned and the click is recorded. Rate
 * limited per IP and per code, because this endpoint is the one place where
 * guessing is possible.
 */

import type { NextRequest } from 'next/server';
import { after } from 'next/server';
import { apiError, apiSuccess, readJsonBody } from '@/lib/api/response';
import { linkPasswordSchema } from '@/lib/api/schemas';
import { recordClick } from '@/lib/analytics/service';
import { findLinkByCode, linkState, verifyLinkPassword } from '@/lib/links/service';
import { logger } from '@/lib/observability/logger';
import { checkRateLimit } from '@/lib/security/rate-limit';
import { getClientIp, hashIp } from '@/lib/security/request';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest, context: { params: Promise<{ code: string }> }) {
  const { code } = await context.params;

  const body = await readJsonBody(request);
  if (!body.ok) return body.response;

  const parsed = linkPasswordSchema.safeParse(body.value);
  if (!parsed.success) {
    return apiError('validation_error', 'Enter the password.');
  }

  // Limit per IP and per code: one stops a single attacker, the other stops a
  // distributed attempt against one link.
  const ipHash = hashIp(getClientIp(request.headers));
  const [ipLimit, codeLimit] = await Promise.all([
    checkRateLimit('linkPassword', ipHash),
    checkRateLimit('linkPassword', `code:${code}`),
  ]);

  if (!ipLimit.allowed || !codeLimit.allowed) {
    logger.warn('link.password_rate_limited', { code });
    return apiError('rate_limited', 'Too many attempts. Try again in a few minutes.');
  }

  const result = await verifyLinkPassword(code, parsed.data.password);

  if (!result.ok || !result.destinationUrl) {
    // Same response whether the password is wrong or the link is gone, so the
    // endpoint cannot be used to probe which codes exist.
    return apiError('unauthorized', 'That password is not correct.');
  }

  const link = await findLinkByCode(code);
  if (link && linkState(link) === 'active') {
    const headers = new Headers();
    const userAgent = request.headers.get('user-agent');
    if (userAgent) headers.set('user-agent', userAgent);
    for (const key of ['x-vercel-ip-country', 'cf-ipcountry']) {
      const value = request.headers.get(key);
      if (value) headers.set(key, value);
    }

    const linkId = link.id;
    try {
      after(() => recordClick({ linkId, headers }));
    } catch {
      void recordClick({ linkId, headers }).catch(() => undefined);
    }
  }

  return apiSuccess({ destinationUrl: result.destinationUrl });
}
