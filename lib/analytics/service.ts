/**
 * Click recording and analytics aggregation.
 *
 * Recording is fire-and-forget from the redirect's perspective: the redirect
 * response is issued first, and the write happens afterwards. A failed
 * analytics write must never turn into a failed redirect.
 */

import { and, desc, eq, gte, sql } from 'drizzle-orm';
import { getDb } from '@/lib/db';
import { clickEvents, links, type DeviceType } from '@/lib/db/schema';
import { generateId } from '@/lib/links/short-code';
import { parseUserAgent } from './user-agent';
import { getGeo, getReferrerHost } from '@/lib/security/request';
import { logger } from '@/lib/observability/logger';

export type ClickContext = {
  linkId: string;
  headers: Headers;
};

/**
 * Records a click and bumps the denormalised counter.
 *
 * Deliberately swallows errors: analytics is best-effort telemetry, and the
 * visitor has already been redirected by the time this runs.
 */
export async function recordClick({ linkId, headers }: ClickContext): Promise<void> {
  try {
    const db = await getDb();
    const geo = getGeo(headers);
    const ua = parseUserAgent(headers.get('user-agent'));

    await db.insert(clickEvents).values({
      id: generateId('clk'),
      linkId,
      country: geo.country,
      region: geo.region,
      city: geo.city,
      referrerHost: getReferrerHost(headers),
      deviceType: ua.deviceType,
      browser: ua.browser,
      os: ua.os,
    });

    await db
      .update(links)
      .set({
        clickCount: sql`${links.clickCount} + 1`,
        lastClickedAt: new Date(),
      })
      .where(eq(links.id, linkId));
  } catch (error) {
    logger.error('analytics.record_failed', { linkId, error: describeError(error) });
  }
}

function describeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

// ---------------------------------------------------------------------------
// Aggregation
// ---------------------------------------------------------------------------

export type TimeSeriesPoint = { date: string; clicks: number };
export type BreakdownEntry = { label: string; count: number };

export type LinkAnalytics = {
  totalClicks: number;
  clicksInWindow: number;
  series: TimeSeriesPoint[];
  countries: BreakdownEntry[];
  referrers: BreakdownEntry[];
  devices: BreakdownEntry[];
  browsers: BreakdownEntry[];
  operatingSystems: BreakdownEntry[];
  recent: {
    timestamp: Date;
    country: string | null;
    referrerHost: string | null;
    deviceType: string | null;
    browser: string | null;
  }[];
};

/**
 * Builds the analytics view for a link over the last `days` days.
 *
 * Aggregation runs in SQL (grouped, indexed on `(link_id, timestamp)`) rather
 * than pulling raw rows into the application — the difference matters as soon
 * as a link has a non-trivial number of clicks.
 */
export async function getLinkAnalytics(linkId: string, days = 30): Promise<LinkAnalytics> {
  const db = await getDb();
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const scope = and(eq(clickEvents.linkId, linkId), gte(clickEvents.timestamp, since));

  const [totals, windowCount, rawSeries, countries, referrers, devices, browsers, oses, recent] =
    await Promise.all([
      db
        .select({ total: sql<number>`coalesce(sum(${links.clickCount}), 0)::int` })
        .from(links)
        .where(eq(links.id, linkId)),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(clickEvents)
        .where(scope),
      db
        .select({
          /*
           * Bucket explicitly in UTC.
           *
           * `date_trunc` without a zone uses the session timezone, while the
           * padding below is built in UTC. On any server not set to UTC the two
           * disagree, and the most recent day silently drops off the chart.
           * Pinning both to UTC also keeps the series stable regardless of
           * where the query runs.
           */
          date: sql<string>`to_char(date_trunc('day', ${clickEvents.timestamp} AT TIME ZONE 'UTC'), 'YYYY-MM-DD')`,
          clicks: sql<number>`count(*)::int`,
        })
        .from(clickEvents)
        .where(scope)
        .groupBy(sql`date_trunc('day', ${clickEvents.timestamp} AT TIME ZONE 'UTC')`)
        .orderBy(sql`date_trunc('day', ${clickEvents.timestamp} AT TIME ZONE 'UTC')`),
      breakdown(db, scope, clickEvents.country),
      breakdown(db, scope, clickEvents.referrerHost),
      breakdown(db, scope, clickEvents.deviceType),
      breakdown(db, scope, clickEvents.browser),
      breakdown(db, scope, clickEvents.os),
      db
        .select({
          timestamp: clickEvents.timestamp,
          country: clickEvents.country,
          referrerHost: clickEvents.referrerHost,
          deviceType: clickEvents.deviceType,
          browser: clickEvents.browser,
        })
        .from(clickEvents)
        .where(eq(clickEvents.linkId, linkId))
        .orderBy(desc(clickEvents.timestamp))
        .limit(10),
    ]);

  return {
    totalClicks: totals[0]?.total ?? 0,
    clicksInWindow: windowCount[0]?.count ?? 0,
    series: fillMissingDays(rawSeries, days),
    countries,
    referrers,
    devices,
    browsers,
    operatingSystems: oses,
    recent,
  };
}

type ScopeCondition = ReturnType<typeof and>;

/** Any nullable text column on click_events that we group by. */
type BreakdownColumn =
  | typeof clickEvents.country
  | typeof clickEvents.referrerHost
  | typeof clickEvents.deviceType
  | typeof clickEvents.browser
  | typeof clickEvents.os;

async function breakdown(
  db: Awaited<ReturnType<typeof getDb>>,
  scope: ScopeCondition,
  column: BreakdownColumn,
): Promise<BreakdownEntry[]> {
  const rows = await db
    .select({
      label: column,
      count: sql<number>`count(*)::int`,
    })
    .from(clickEvents)
    .where(scope)
    .groupBy(column)
    .orderBy(desc(sql`count(*)`))
    .limit(8);

  return rows.map((row) => ({ label: row.label ?? 'Unknown', count: row.count }));
}

/**
 * Pads the series so the chart shows a continuous timeline rather than
 * collapsing days with no clicks.
 */
function fillMissingDays(rows: TimeSeriesPoint[], days: number): TimeSeriesPoint[] {
  const byDate = new Map(rows.map((row) => [row.date, row.clicks]));
  const out: TimeSeriesPoint[] = [];
  const today = new Date();

  for (let i = days - 1; i >= 0; i -= 1) {
    const day = new Date(today);
    day.setUTCDate(day.getUTCDate() - i);
    const key = day.toISOString().slice(0, 10);
    out.push({ date: key, clicks: byDate.get(key) ?? 0 });
  }

  return out;
}

/** Device breakdown normalised to the fixed set the UI renders. */
export function normaliseDevices(entries: BreakdownEntry[]): BreakdownEntry[] {
  const order: DeviceType[] = ['desktop', 'mobile', 'tablet', 'bot', 'unknown'];
  const counts = new Map<string, number>();
  for (const entry of entries) {
    counts.set(entry.label, (counts.get(entry.label) ?? 0) + entry.count);
  }
  return order
    .map((key) => ({ label: key, count: counts.get(key) ?? 0 }))
    .filter((entry) => entry.count > 0);
}
