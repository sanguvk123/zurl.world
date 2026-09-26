/**
 * GET /api/health — deployment readiness.
 *
 * Reports whether the process can actually serve traffic: configuration is
 * present and the database answers a query and has the expected schema.
 *
 * This exists so a broken deployment can be diagnosed from the response
 * itself, rather than by correlating an opaque 503 against platform logs. It
 * deliberately reveals *shapes* of problems ("database not configured",
 * "schema missing") and never values — no connection string, host, credential
 * or driver text is included, since an unauthenticated endpoint must not
 * become a reconnaissance tool.
 */

import { sql } from 'drizzle-orm';
import { getDb } from '@/lib/db';
import { logger } from '@/lib/observability/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type CheckState = 'ok' | 'fail';

type HealthReport = {
  status: 'ok' | 'degraded';
  checks: {
    databaseUrlConfigured: CheckState;
    appUrlConfigured: CheckState;
    ipHashSecretConfigured: CheckState;
    databaseReachable: CheckState;
    schemaPresent: CheckState;
  };
  /** Ordered, human-readable next steps. Empty when healthy. */
  problems: string[];
};

export async function GET(): Promise<Response> {
  const databaseUrl = process.env.DATABASE_URL;

  const report: HealthReport = {
    status: 'ok',
    checks: {
      // A `pglite:`/`memory://` value in production is treated as unset: it
      // would "work" and then lose every write.
      databaseUrlConfigured:
        databaseUrl && /^postgres(ql)?:\/\//.test(databaseUrl) ? 'ok' : 'fail',
      appUrlConfigured: process.env.NEXT_PUBLIC_APP_URL ? 'ok' : 'fail',
      ipHashSecretConfigured: process.env.IP_HASH_SECRET ? 'ok' : 'fail',
      databaseReachable: 'fail',
      schemaPresent: 'fail',
    },
    problems: [],
  };

  if (report.checks.databaseUrlConfigured === 'fail') {
    report.problems.push(
      'DATABASE_URL is not set to a PostgreSQL connection string. Set it in the project environment variables, then redeploy.',
    );
  }
  if (report.checks.appUrlConfigured === 'fail') {
    report.problems.push('NEXT_PUBLIC_APP_URL is not set. Canonical URLs will be wrong.');
  }
  if (report.checks.ipHashSecretConfigured === 'fail') {
    report.problems.push(
      'IP_HASH_SECRET is not set. Rate limiting falls back to a public development salt.',
    );
  }

  if (report.checks.databaseUrlConfigured === 'ok') {
    try {
      const db = await getDb();
      await db.execute(sql`select 1`);
      report.checks.databaseReachable = 'ok';

      try {
        await db.execute(sql`select 1 from links limit 1`);
        report.checks.schemaPresent = 'ok';
      } catch {
        report.problems.push(
          'The database is reachable but the schema is missing. Run the migration (npm run db:migrate).',
        );
      }
    } catch (error) {
      // The cause is logged server-side, never returned.
      logger.error('health.database_unreachable', {
        error: error instanceof Error ? error.message : String(error),
      });
      report.problems.push(
        'The database is configured but did not respond. The connection string may be stale (for example after a password reset), or the deployment may predate the current environment variables.',
      );
    }
  }

  report.status = report.problems.length === 0 ? 'ok' : 'degraded';

  return Response.json(report, {
    status: report.status === 'ok' ? 200 : 503,
    headers: { 'cache-control': 'no-store' },
  });
}
