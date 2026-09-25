/**
 * Analytics aggregation against a real database.
 *
 * The aggregation runs entirely in SQL, so it cannot be meaningfully unit
 * tested — `date_trunc`, `count(*)` grouping and the window filter have to be
 * executed by Postgres to prove they are correct. These tests insert click
 * rows at controlled timestamps and assert on the aggregated shape.
 */

import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  getLinkAnalytics,
  normaliseDevices,
  recordClick,
  type BreakdownEntry,
} from '@/lib/analytics/service';
import { clickEvents } from '@/lib/db/schema';
import { generateId } from '@/lib/links/short-code';
import { createLink } from '@/lib/links/service';
import { createTestDb, destroyTestDb, truncateAll, type TestDb } from '../helpers/db';

let testDb: TestDb;

beforeAll(async () => {
  testDb = await createTestDb();
});

afterAll(async () => {
  await destroyTestDb(testDb);
});

beforeEach(async () => {
  await truncateAll(testDb.db);
});

const DAY = 24 * 60 * 60 * 1000;

/** Creates a link and returns its id. */
async function makeLink(url = 'https://example.com/analytics'): Promise<string> {
  const created = await createLink({ destinationUrl: url });
  if (!created.ok) throw new Error('fixture link failed to create');
  return created.link.id;
}

/**
 * Inserts a click directly so the timestamp can be controlled.
 * `recordClick` always stamps `now()`, which cannot express history.
 */
async function insertClick(
  linkId: string,
  overrides: Partial<{
    daysAgo: number;
    country: string | null;
    referrerHost: string | null;
    deviceType: 'desktop' | 'mobile' | 'tablet' | 'bot' | 'unknown';
    browser: string | null;
    os: string | null;
  }> = {},
): Promise<void> {
  const daysAgo = overrides.daysAgo ?? 0;
  await testDb.db.insert(clickEvents).values({
    id: generateId('clk'),
    linkId,
    // Offset slightly into the day so a `daysAgo: 0` click is never stamped in
    // the future relative to the aggregation's `now()`.
    timestamp: new Date(Date.now() - daysAgo * DAY + 1000),
    country: overrides.country ?? null,
    referrerHost: overrides.referrerHost ?? null,
    deviceType: overrides.deviceType ?? 'desktop',
    browser: overrides.browser ?? 'Chrome',
    os: overrides.os ?? 'macOS',
  });
}

describe('click recording', () => {
  it('records a click and increments the denormalised counter', async () => {
    const linkId = await makeLink();

    await recordClick({
      linkId,
      headers: new Headers({
        'user-agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        referer: 'https://news.ycombinator.com/item?id=1',
      }),
    });

    const analytics = await getLinkAnalytics(linkId);
    expect(analytics.totalClicks).toBe(1);
    expect(analytics.clicksInWindow).toBe(1);
    expect(analytics.browsers).toContainEqual({ label: 'Chrome', count: 1 });
    expect(analytics.operatingSystems).toContainEqual({ label: 'macOS', count: 1 });
  });

  it('stores only the referrer host, never the path or query', async () => {
    const linkId = await makeLink();

    await recordClick({
      linkId,
      headers: new Headers({
        referer: 'https://www.google.com/search?q=confidential+internal+project',
      }),
    });

    const analytics = await getLinkAnalytics(linkId);
    expect(analytics.referrers).toContainEqual({ label: 'www.google.com', count: 1 });

    const serialised = JSON.stringify(analytics);
    expect(serialised).not.toContain('confidential');
    expect(serialised).not.toContain('/search');
  });

  it('never throws when the link does not exist', async () => {
    // A failed analytics write must not surface as a failed redirect, so the
    // function swallows errors by design.
    await expect(
      recordClick({ linkId: 'lnk_does_not_exist', headers: new Headers() }),
    ).resolves.toBeUndefined();
  });
});

describe('time series', () => {
  it('returns one point per day in the window, oldest first', async () => {
    const linkId = await makeLink();
    const analytics = await getLinkAnalytics(linkId, 30);

    expect(analytics.series).toHaveLength(30);
    const dates = analytics.series.map((p) => p.date);
    expect([...dates].sort()).toEqual(dates);
  });

  it('pads days that have no clicks with zero rather than omitting them', async () => {
    const linkId = await makeLink();
    await insertClick(linkId, { daysAgo: 0 });
    await insertClick(linkId, { daysAgo: 3 });

    const analytics = await getLinkAnalytics(linkId, 7);

    expect(analytics.series).toHaveLength(7);
    expect(analytics.series.filter((p) => p.clicks > 0)).toHaveLength(2);
    // A gap day must be present and explicitly zero, so the chart draws a
    // continuous timeline instead of collapsing the x-axis.
    expect(analytics.series.filter((p) => p.clicks === 0)).toHaveLength(5);
  });

  it("includes today's clicks regardless of the server timezone", async () => {
    /*
     * Regression: the SQL grouped by `date_trunc('day', timestamp)`, which uses
     * the session timezone, while the padding was generated in UTC. On a server
     * ahead of UTC a click made today was bucketed to tomorrow's date, which
     * did not exist in the padded range, so it vanished from the chart — the
     * most visible data point silently missing.
     */
    const linkId = await makeLink();
    await insertClick(linkId, { daysAgo: 0 });

    const analytics = await getLinkAnalytics(linkId, 7);
    const today = new Date().toISOString().slice(0, 10);
    const todayPoint = analytics.series.find((p) => p.date === today);

    expect(todayPoint, `expected a point for ${today}`).toBeDefined();
    expect(todayPoint?.clicks).toBe(1);
    expect(analytics.series.reduce((sum, p) => sum + p.clicks, 0)).toBe(1);
  });

  it('groups multiple clicks on the same day into one point', async () => {
    const linkId = await makeLink();
    await insertClick(linkId, { daysAgo: 1 });
    await insertClick(linkId, { daysAgo: 1 });
    await insertClick(linkId, { daysAgo: 1 });

    const analytics = await getLinkAnalytics(linkId, 7);
    const nonZero = analytics.series.filter((p) => p.clicks > 0);

    expect(nonZero).toHaveLength(1);
    expect(nonZero[0]?.clicks).toBe(3);
  });

  it('excludes clicks older than the requested window', async () => {
    const linkId = await makeLink();
    await insertClick(linkId, { daysAgo: 2 });
    await insertClick(linkId, { daysAgo: 40 });

    const analytics = await getLinkAnalytics(linkId, 7);

    expect(analytics.clicksInWindow).toBe(1);
    expect(analytics.series.reduce((sum, p) => sum + p.clicks, 0)).toBe(1);
  });

  it('honours a custom window length', async () => {
    const linkId = await makeLink();
    expect((await getLinkAnalytics(linkId, 7)).series).toHaveLength(7);
    expect((await getLinkAnalytics(linkId, 90)).series).toHaveLength(90);
  });
});

describe('breakdowns', () => {
  it('counts countries and sorts by frequency', async () => {
    const linkId = await makeLink();
    await insertClick(linkId, { country: 'US' });
    await insertClick(linkId, { country: 'US' });
    await insertClick(linkId, { country: 'GB' });

    const { countries } = await getLinkAnalytics(linkId);

    expect(countries[0]).toEqual({ label: 'US', count: 2 });
    expect(countries).toContainEqual({ label: 'GB', count: 1 });
  });

  it('labels missing dimensions as Unknown instead of dropping them', async () => {
    const linkId = await makeLink();
    await insertClick(linkId, { country: null, referrerHost: null });

    const { countries, referrers } = await getLinkAnalytics(linkId);

    expect(countries).toContainEqual({ label: 'Unknown', count: 1 });
    expect(referrers).toContainEqual({ label: 'Unknown', count: 1 });
  });

  it('separates direct traffic from referred traffic', async () => {
    const linkId = await makeLink();
    await insertClick(linkId, { referrerHost: null });
    await insertClick(linkId, { referrerHost: 'news.ycombinator.com' });
    await insertClick(linkId, { referrerHost: 'news.ycombinator.com' });

    const { referrers } = await getLinkAnalytics(linkId);

    expect(referrers[0]).toEqual({ label: 'news.ycombinator.com', count: 2 });
    expect(referrers).toContainEqual({ label: 'Unknown', count: 1 });
  });

  it('counts devices, browsers and operating systems independently', async () => {
    const linkId = await makeLink();
    await insertClick(linkId, { deviceType: 'mobile', browser: 'Safari', os: 'iOS' });
    await insertClick(linkId, { deviceType: 'mobile', browser: 'Chrome', os: 'Android' });
    await insertClick(linkId, { deviceType: 'desktop', browser: 'Chrome', os: 'Windows' });

    const { devices, browsers, operatingSystems } = await getLinkAnalytics(linkId);

    expect(devices).toContainEqual({ label: 'mobile', count: 2 });
    expect(devices).toContainEqual({ label: 'desktop', count: 1 });
    expect(browsers).toContainEqual({ label: 'Chrome', count: 2 });
    expect(operatingSystems).toHaveLength(3);
  });

  it('caps a breakdown at eight entries so one link cannot return unbounded rows', async () => {
    const linkId = await makeLink();
    for (let i = 0; i < 12; i += 1) {
      await insertClick(linkId, { referrerHost: `host-${i}.example.com` });
    }

    const { referrers } = await getLinkAnalytics(linkId);
    expect(referrers).toHaveLength(8);
  });

  it('respects the window when building breakdowns', async () => {
    const linkId = await makeLink();
    await insertClick(linkId, { daysAgo: 1, country: 'US' });
    await insertClick(linkId, { daysAgo: 60, country: 'GB' });

    const { countries } = await getLinkAnalytics(linkId, 30);

    expect(countries).toContainEqual({ label: 'US', count: 1 });
    expect(countries.find((c) => c.label === 'GB')).toBeUndefined();
  });
});

describe('scoping', () => {
  it('never mixes clicks between links', async () => {
    const first = await makeLink('https://example.com/one');
    const second = await makeLink('https://example.com/two');

    await insertClick(first, { country: 'US' });
    await insertClick(first, { country: 'US' });
    await insertClick(second, { country: 'FR' });

    const a = await getLinkAnalytics(first);
    const b = await getLinkAnalytics(second);

    expect(a.clicksInWindow).toBe(2);
    expect(b.clicksInWindow).toBe(1);
    expect(b.countries).toEqual([{ label: 'FR', count: 1 }]);
  });

  it('returns an empty but well-formed shape for a link with no clicks', async () => {
    const linkId = await makeLink();
    const analytics = await getLinkAnalytics(linkId);

    expect(analytics.totalClicks).toBe(0);
    expect(analytics.clicksInWindow).toBe(0);
    expect(analytics.countries).toEqual([]);
    expect(analytics.recent).toEqual([]);
    // The series is still padded, so the UI can render an empty chart without
    // special-casing.
    expect(analytics.series).toHaveLength(30);
  });
});

describe('recent clicks', () => {
  it('returns the ten most recent, newest first', async () => {
    const linkId = await makeLink();
    for (let i = 0; i < 14; i += 1) {
      await insertClick(linkId, { daysAgo: i });
    }

    const { recent } = await getLinkAnalytics(linkId);

    expect(recent).toHaveLength(10);
    const times = recent.map((r) => r.timestamp.getTime());
    expect([...times].sort((a, b) => b - a)).toEqual(times);
  });

  it('is not restricted by the aggregation window', async () => {
    // `recent` answers "has anything happened at all", which stays useful for
    // a link whose only traffic predates the window.
    const linkId = await makeLink();
    await insertClick(linkId, { daysAgo: 200 });

    const analytics = await getLinkAnalytics(linkId, 30);

    expect(analytics.clicksInWindow).toBe(0);
    expect(analytics.recent).toHaveLength(1);
  });

  it('exposes no identifying fields', async () => {
    const linkId = await makeLink();
    await insertClick(linkId, { country: 'US', referrerHost: 'example.com' });

    const { recent } = await getLinkAnalytics(linkId);
    const keys = Object.keys(recent[0] ?? {}).sort();

    expect(keys).toEqual(['browser', 'country', 'deviceType', 'referrerHost', 'timestamp']);
  });
});

describe('normaliseDevices', () => {
  it('orders devices consistently regardless of input order', async () => {
    const input: BreakdownEntry[] = [
      { label: 'bot', count: 1 },
      { label: 'mobile', count: 5 },
      { label: 'desktop', count: 9 },
    ];

    const labels = normaliseDevices(input).map((d) => d.label);
    expect(labels.indexOf('desktop')).toBeLessThan(labels.indexOf('mobile'));
    expect(labels.indexOf('mobile')).toBeLessThan(labels.indexOf('bot'));
  });

  it('drops device types with no clicks', async () => {
    const result = normaliseDevices([{ label: 'desktop', count: 3 }]);
    expect(result).toEqual([{ label: 'desktop', count: 3 }]);
  });

  it('returns nothing for an empty breakdown', async () => {
    expect(normaliseDevices([])).toEqual([]);
  });
});
