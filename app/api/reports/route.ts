/**
 * POST /api/reports — submit an abuse report.
 *
 * Open to anyone, with no account required: requiring sign-in to report abuse
 * would suppress most reports. Rate limited per IP to prevent the queue being
 * flooded.
 */

import type { NextRequest } from 'next/server';
import { eq, sql } from 'drizzle-orm';
import { apiError, apiSuccess, readJsonBody } from '@/lib/api/response';
import { abuseReportSchema, fieldErrors } from '@/lib/api/schemas';
import { getDb } from '@/lib/db';
import { abuseReports } from '@/lib/db/schema';
import { findLinkByCode, setLinkDisabled } from '@/lib/links/service';
import { generateId } from '@/lib/links/short-code';
import { logger, trackEvent } from '@/lib/observability/logger';
import { checkRateLimit } from '@/lib/security/rate-limit';
import { getClientIp, hashIp } from '@/lib/security/request';
import { SITE } from '@/lib/seo/site';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Reports at which a link is automatically disabled pending review.
 *
 * Erring toward disabling is the right trade-off: a wrongly disabled link is an
 * inconvenience that moderation can reverse, whereas a live phishing link
 * causes real harm for as long as it stays up.
 */
const AUTO_DISABLE_THRESHOLD = 3;

export async function POST(request: NextRequest) {
  const body = await readJsonBody(request);
  if (!body.ok) return body.response;

  const parsed = abuseReportSchema.safeParse(body.value);
  if (!parsed.success) {
    const fields = fieldErrors(parsed.error);
    return apiError('validation_error', 'Check the form and try again.', { fields });
  }

  const limit = await checkRateLimit('abuseReport', hashIp(getClientIp(request.headers)));
  if (!limit.allowed) {
    return apiError('rate_limited', 'Too many reports submitted. Try again later.');
  }

  // Accept a bare code or a full URL.
  const code = extractCode(parsed.data.code);
  if (!code) {
    return apiError('validation_error', 'Enter a Zurl short link or its code.', { field: 'code' });
  }

  const link = await findLinkByCode(code);
  if (!link) {
    return apiError('not_found', 'That short link does not exist.', { field: 'code' });
  }

  const db = await getDb();

  await db.insert(abuseReports).values({
    id: generateId('rpt'),
    linkId: link.id,
    category: parsed.data.category,
    details: parsed.data.details ?? null,
    reporterEmail: parsed.data.email && parsed.data.email.length > 0 ? parsed.data.email : null,
  });

  // Count open reports for this link.
  const counts = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(abuseReports)
    .where(eq(abuseReports.linkId, link.id));

  const openReports = counts[0]?.count ?? 1;

  let disabled = false;
  if (openReports >= AUTO_DISABLE_THRESHOLD && !link.disabledAt) {
    await setLinkDisabled(link.id, true, 'abuse');
    disabled = true;
    logger.warn('abuse.auto_disabled', { linkId: link.id, reports: openReports });
  }

  trackEvent('abuse_reported', { category: parsed.data.category, autoDisabled: disabled });

  // The response never reveals the destination, the owner, or how many other
  // reports exist — that would turn this endpoint into a lookup tool.
  return apiSuccess({
    received: true,
    message: 'Thank you. This report has been sent to our moderation queue.',
  });
}

/** Accepts `abc123`, `zurl.world/abc123` or a full URL, and returns the code. */
function extractCode(input: string): string | null {
  const trimmed = input.trim();
  if (trimmed.length === 0) return null;

  if (trimmed.includes('/')) {
    try {
      const url = new URL(trimmed.includes('://') ? trimmed : `https://${trimmed}`);
      const host = url.hostname.toLowerCase().replace(/^www\./, '');
      if (host !== SITE.domain && !host.endsWith('localhost')) return null;
      const code = url.pathname.replace(/^\//, '').split('/')[0];
      return code && code.length > 0 ? code : null;
    } catch {
      return null;
    }
  }

  // Must look like a plausible short code, to avoid probing with junk.
  return /^[A-Za-z0-9_-]{3,48}$/.test(trimmed) ? trimmed : null;
}
