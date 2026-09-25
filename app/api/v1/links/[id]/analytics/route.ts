/**
 * GET /api/v1/links/:id/analytics
 *
 * Aggregate analytics for one link. Ownership scoped — a link belonging to
 * another user returns 404.
 */

import type { NextRequest } from 'next/server';
import { apiError, apiSuccess, rateLimitedResponse } from '@/lib/api/response';
import { authenticateApiKey } from '@/lib/auth/api-key';
import { getLinkAnalytics } from '@/lib/analytics/service';
import { findUserLink } from '@/lib/links/service';
import { checkRateLimit, rateLimitHeaders } from '@/lib/security/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const principal = await authenticateApiKey(request.headers.get('authorization'));
  if (!principal) return apiError('unauthorized', 'Provide a valid API key as a Bearer token.');

  const limit = await checkRateLimit('apiRead', principal.keyId);
  if (!limit.allowed) return rateLimitedResponse(limit);

  const { id } = await context.params;
  const link = await findUserLink(id, principal.userId);
  if (!link) return apiError('not_found', 'No link with that id.');

  const requestedDays = Number.parseInt(
    new URL(request.url).searchParams.get('days') ?? '30',
    10,
  );
  const days = Number.isFinite(requestedDays) ? Math.min(Math.max(requestedDays, 1), 365) : 30;

  const analytics = await getLinkAnalytics(link.id, days);

  return apiSuccess(
    {
      linkId: link.id,
      shortCode: link.shortCode,
      windowDays: days,
      totalClicks: analytics.totalClicks,
      clicksInWindow: analytics.clicksInWindow,
      series: analytics.series,
      countries: analytics.countries,
      referrers: analytics.referrers,
      devices: analytics.devices,
      browsers: analytics.browsers,
      operatingSystems: analytics.operatingSystems,
    },
    { headers: rateLimitHeaders(limit) },
  );
}
