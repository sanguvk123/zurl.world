/**
 * POST /api/admin/moderate — act on an abuse report.
 *
 * Admin-only. The role check happens here as well as in the admin layout: an
 * API route is directly reachable and must never rely on a page guard.
 */

import type { NextRequest } from 'next/server';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { apiError, apiSuccess, readJsonBody } from '@/lib/api/response';
import { resolveReport } from '@/lib/admin/service';
import { getUserFromRequest } from '@/lib/auth/session';
import { getDb } from '@/lib/db';
import { abuseReports } from '@/lib/db/schema';
import { setLinkDisabled } from '@/lib/links/service';
import { logger } from '@/lib/observability/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const schema = z.object({
  reportId: z.string().min(1),
  action: z.enum(['disable', 'enable', 'dismiss']),
});

export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request);

  // 404 rather than 403: do not confirm the endpoint exists to a non-admin.
  if (!user || user.role !== 'admin') {
    return apiError('not_found', 'Not found.');
  }

  const body = await readJsonBody(request);
  if (!body.ok) return body.response;

  const parsed = schema.safeParse(body.value);
  if (!parsed.success) return apiError('validation_error', 'Invalid request.');

  const db = await getDb();
  const rows = await db
    .select({ linkId: abuseReports.linkId })
    .from(abuseReports)
    .where(eq(abuseReports.id, parsed.data.reportId))
    .limit(1);

  const report = rows[0];
  if (!report) return apiError('not_found', 'No such report.');

  switch (parsed.data.action) {
    case 'disable':
      await setLinkDisabled(report.linkId, true, 'abuse');
      await resolveReport(parsed.data.reportId, 'actioned', user.id);
      break;
    case 'enable':
      await setLinkDisabled(report.linkId, false, '');
      await resolveReport(parsed.data.reportId, 'dismissed', user.id);
      break;
    case 'dismiss':
      await resolveReport(parsed.data.reportId, 'dismissed', user.id);
      break;
  }

  logger.info('admin.moderate', {
    adminId: user.id,
    reportId: parsed.data.reportId,
    action: parsed.data.action,
  });

  return apiSuccess({ done: true });
}
