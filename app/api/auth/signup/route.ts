/**
 * POST /api/auth/signup
 */

import type { NextRequest } from 'next/server';
import { apiError, apiSuccess, readJsonBody } from '@/lib/api/response';
import { fieldErrors, signUpSchema } from '@/lib/api/schemas';
import { startSession } from '@/lib/auth/session';
import { createUser } from '@/lib/auth/user';
import { claimAnonymousLinks } from '@/lib/links/service';
import { logger, trackEvent } from '@/lib/observability/logger';
import { checkRateLimit } from '@/lib/security/rate-limit';
import { getClientIp, hashIp } from '@/lib/security/request';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const body = await readJsonBody(request);
  if (!body.ok) return body.response;

  const parsed = signUpSchema.safeParse(body.value);
  if (!parsed.success) {
    const fields = fieldErrors(parsed.error);
    return apiError('validation_error', 'Check the details and try again.', { fields });
  }

  const ipHash = hashIp(getClientIp(request.headers));

  const limit = await checkRateLimit('signUp', ipHash);
  if (!limit.allowed) {
    return apiError('rate_limited', 'Too many sign-up attempts. Try again later.');
  }

  const result = await createUser(parsed.data.email, parsed.data.password);
  if (!result.ok) {
    return apiError('validation_error', result.message, { field: result.field });
  }

  await startSession(result.user.id);

  // Adopt links this browser created anonymously, so signing up does not lose
  // the work that led the user here.
  const claimed = await claimAnonymousLinks(ipHash, result.user.id).catch(() => 0);

  trackEvent('signup', { claimedLinks: claimed });
  logger.info('auth.signup', { userId: result.user.id });

  return apiSuccess({ userId: result.user.id, claimedLinks: claimed }, { status: 201 });
}
