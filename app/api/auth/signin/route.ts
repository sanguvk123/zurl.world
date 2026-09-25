/**
 * POST /api/auth/signin
 *
 * Rate limited on two axes: per IP (credential stuffing across many accounts)
 * and per account (targeted brute force from many IPs). Either alone leaves a
 * gap.
 */

import type { NextRequest } from 'next/server';
import { apiError, apiSuccess, readJsonBody } from '@/lib/api/response';
import { fieldErrors, signInSchema } from '@/lib/api/schemas';
import { startSession } from '@/lib/auth/session';
import { normaliseEmail, verifyCredentials } from '@/lib/auth/user';
import { logger, trackEvent } from '@/lib/observability/logger';
import { checkRateLimit } from '@/lib/security/rate-limit';
import { getClientIp, hashIp } from '@/lib/security/request';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const body = await readJsonBody(request);
  if (!body.ok) return body.response;

  const parsed = signInSchema.safeParse(body.value);
  if (!parsed.success) {
    return apiError('validation_error', 'Enter your email and password.', {
      fields: fieldErrors(parsed.error),
    });
  }

  const ipHash = hashIp(getClientIp(request.headers));
  const email = normaliseEmail(parsed.data.email);

  const ipLimit = await checkRateLimit('signInIp', ipHash);
  if (!ipLimit.allowed) {
    logger.warn('auth.signin_ip_limited');
    return apiError('rate_limited', 'Too many sign-in attempts. Try again in a few minutes.');
  }

  const accountLimit = await checkRateLimit('signInAccount', email);
  if (!accountLimit.allowed) {
    logger.warn('auth.signin_account_limited');
    // Same message as an IP limit, so an attacker cannot tell which triggered.
    return apiError('rate_limited', 'Too many sign-in attempts. Try again in a few minutes.');
  }

  const user = await verifyCredentials(email, parsed.data.password);

  if (!user) {
    // One generic message: never reveal whether the account exists.
    return apiError('unauthorized', 'Incorrect email or password.');
  }

  await startSession(user.id);

  trackEvent('login');
  logger.info('auth.signin', { userId: user.id });

  return apiSuccess({ userId: user.id });
}
