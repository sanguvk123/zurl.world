/**
 * End-to-end flows through the real route handlers, against a real database.
 *
 * These exercise the actual `GET /:code` handler, the create API and the
 * password endpoint — not mocks — so redirect status codes, headers and state
 * transitions are verified as they will behave in production.
 */

import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { GET as redirectHandler } from '@/app/[code]/route';
import { clickEvents, links } from '@/lib/db/schema';
import { createLink, findLinkByCode } from '@/lib/links/service';
import { createUser } from '@/lib/auth/user';
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

/** Invokes the redirect handler the way Next.js would. */
async function visit(code: string, headers: Record<string, string> = {}): Promise<Response> {
  const request = new Request(`https://zurl.world/${code}`, { headers });
  return redirectHandler(request as never, { params: Promise.resolve({ code }) });
}

describe('create link → redirect', () => {
  it('redirects to the destination', async () => {
    const created = await createLink({ destinationUrl: 'https://example.com/target' });
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    const response = await visit(created.link.shortCode);

    expect(response.status).toBe(302);
    expect(response.headers.get('location')).toBe('https://example.com/target');
  });

  it('preserves query parameters exactly', async () => {
    const destination = 'https://example.com/p?b=2&a=1&b=3&utm_source=news';
    const created = await createLink({ destinationUrl: destination });
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    const response = await visit(created.link.shortCode);
    expect(response.headers.get('location')).toBe(destination);
  });

  it('never caches the redirect', async () => {
    // A cached redirect would make disable, expiry and edits silently fail.
    const created = await createLink({ destinationUrl: 'https://example.com' });
    if (!created.ok) return;

    const response = await visit(created.link.shortCode);
    const cacheControl = response.headers.get('cache-control') ?? '';
    expect(cacheControl).toContain('no-store');
  });

  it('marks the redirect noindex', async () => {
    const created = await createLink({ destinationUrl: 'https://example.com' });
    if (!created.ok) return;

    const response = await visit(created.link.shortCode);
    expect(response.headers.get('x-robots-tag')).toContain('noindex');
  });

  it('uses 302 rather than 301', async () => {
    const created = await createLink({ destinationUrl: 'https://example.com' });
    if (!created.ok) return;

    const response = await visit(created.link.shortCode);
    expect(response.status).toBe(302);
    expect(response.status).not.toBe(301);
  });
});

describe('custom alias → redirect', () => {
  it('redirects from a custom alias', async () => {
    const created = await createLink({
      destinationUrl: 'https://example.com/product',
      alias: 'my-product',
    });
    expect(created.ok).toBe(true);

    const response = await visit('my-product');
    expect(response.status).toBe(302);
    expect(response.headers.get('location')).toBe('https://example.com/product');
  });
});

describe('unknown link', () => {
  it('does not redirect to a destination', async () => {
    const response = await visit('doesnotexist');
    expect(response.headers.get('location') ?? '').not.toContain('example.com');
  });

  it('answers with a real 404 rather than a redirect', async () => {
    const response = await visit('doesnotexist');
    expect(response.status).toBe(404);
  });

  it('never redirects an unknown code anywhere', async () => {
    // Regression: this previously 307'd to `/not-found`, which is a Next.js
    // convention file and not a routable path. The request fell back through
    // to this same handler and looped until the browser gave up.
    const response = await visit('doesnotexist');
    expect(response.headers.get('location')).toBeNull();
  });

  it('returns a readable page, not an empty body', async () => {
    const response = await visit('doesnotexist');
    const body = await response.text();

    expect(response.headers.get('content-type')).toContain('text/html');
    expect(body).toContain("This link doesn't exist");
    expect(body).toContain('href="/"');
  });

  it('keeps the 404 page out of search results', async () => {
    const response = await visit('doesnotexist');
    expect(response.headers.get('x-robots-tag')).toContain('noindex');
  });

  it('rejects asset-like paths with a 404 and no redirect', async () => {
    for (const path of ['favicon.ico', 'robots.txt', '.env', '_next']) {
      const response = await visit(path);
      expect(response.status, path).toBe(404);
      expect(response.headers.get('location'), path).toBeNull();
    }
  });
});

describe('expired link → blocked', () => {
  it('does not redirect to the destination', async () => {
    const created = await createLink({
      destinationUrl: 'https://example.com/secret',
      expiresAt: new Date(Date.now() + 60_000),
    });
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    await testDb.db
      .update(links)
      .set({ expiresAt: new Date(Date.now() - 1000) })
      .where(eq(links.id, created.link.id));

    const response = await visit(created.link.shortCode);
    const location = response.headers.get('location') ?? '';

    expect(location).toContain('/expired');
    expect(location).not.toContain('example.com');
  });

  it('records no click for an expired link', async () => {
    const created = await createLink({
      destinationUrl: 'https://example.com',
      expiresAt: new Date(Date.now() + 60_000),
    });
    if (!created.ok) return;

    await testDb.db
      .update(links)
      .set({ expiresAt: new Date(Date.now() - 1000) })
      .where(eq(links.id, created.link.id));

    await visit(created.link.shortCode);
    await new Promise((resolve) => setTimeout(resolve, 60));

    const events = await testDb.db
      .select()
      .from(clickEvents)
      .where(eq(clickEvents.linkId, created.link.id));
    expect(events).toHaveLength(0);
  });
});

describe('disabled link → blocked', () => {
  it('does not redirect to the destination', async () => {
    const created = await createLink({ destinationUrl: 'https://example.com/bad' });
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    await testDb.db
      .update(links)
      .set({ disabledAt: new Date(), disabledReason: 'abuse' })
      .where(eq(links.id, created.link.id));

    const response = await visit(created.link.shortCode);
    const location = response.headers.get('location') ?? '';

    expect(location).toContain('/disabled');
    expect(location).not.toContain('example.com');
  });

  it('does not reveal the reason to a visitor', async () => {
    const created = await createLink({ destinationUrl: 'https://example.com' });
    if (!created.ok) return;

    await testDb.db
      .update(links)
      .set({ disabledAt: new Date(), disabledReason: 'abuse' })
      .where(eq(links.id, created.link.id));

    const response = await visit(created.link.shortCode);
    expect(response.headers.get('location') ?? '').not.toContain('abuse');
  });
});

describe('password-protected link', () => {
  it('routes to the interstitial rather than the destination', async () => {
    const created = await createLink({
      destinationUrl: 'https://example.com/private',
      password: 'letmein',
    });
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    const response = await visit(created.link.shortCode);
    const location = response.headers.get('location') ?? '';

    expect(location).toContain('/protected/');
    expect(location).not.toContain('example.com');
  });

  it('never exposes the destination before the password is verified', async () => {
    const created = await createLink({
      destinationUrl: 'https://example.com/private',
      password: 'letmein',
    });
    if (!created.ok) return;

    const response = await visit(created.link.shortCode);
    const body = await response.text();
    expect(body).not.toContain('example.com/private');
  });
});

describe('create link → analytics', () => {
  it('records a click after the redirect', async () => {
    const created = await createLink({ destinationUrl: 'https://example.com' });
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    await visit(created.link.shortCode, {
      'user-agent':
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
      'x-vercel-ip-country': 'IN',
      referer: 'https://news.example.org/article?secret=value',
    });

    // The write happens after the response is produced.
    await new Promise((resolve) => setTimeout(resolve, 120));

    const events = await testDb.db
      .select()
      .from(clickEvents)
      .where(eq(clickEvents.linkId, created.link.id));

    expect(events).toHaveLength(1);
    const event = events[0];
    expect(event?.country).toBe('IN');
    expect(event?.deviceType).toBe('mobile');
    expect(event?.browser).toBe('Safari');
    expect(event?.os).toBe('iOS');
  });

  it('stores only the referrer host, never the full URL', async () => {
    const created = await createLink({ destinationUrl: 'https://example.com' });
    if (!created.ok) return;

    await visit(created.link.shortCode, {
      referer: 'https://news.example.org/article?q=private+search+terms',
    });
    await new Promise((resolve) => setTimeout(resolve, 120));

    const events = await testDb.db
      .select()
      .from(clickEvents)
      .where(eq(clickEvents.linkId, created.link.id));

    expect(events[0]?.referrerHost).toBe('news.example.org');
    expect(events[0]?.referrerHost).not.toContain('private');
    expect(events[0]?.referrerHost).not.toContain('?');
  });

  it('increments the denormalised click counter', async () => {
    const created = await createLink({ destinationUrl: 'https://example.com' });
    if (!created.ok) return;

    await visit(created.link.shortCode);
    await visit(created.link.shortCode);
    await new Promise((resolve) => setTimeout(resolve, 200));

    const reloaded = await findLinkByCode(created.link.shortCode);
    expect(reloaded?.clickCount).toBe(2);
    expect(reloaded?.lastClickedAt).not.toBeNull();
  });

  it('identifies bot traffic', async () => {
    const created = await createLink({ destinationUrl: 'https://example.com' });
    if (!created.ok) return;

    await visit(created.link.shortCode, { 'user-agent': 'Slackbot-LinkExpanding 1.0' });
    await new Promise((resolve) => setTimeout(resolve, 120));

    const events = await testDb.db
      .select()
      .from(clickEvents)
      .where(eq(clickEvents.linkId, created.link.id));
    expect(events[0]?.deviceType).toBe('bot');
  });

  it('never stores an IP address', async () => {
    const created = await createLink({ destinationUrl: 'https://example.com' });
    if (!created.ok) return;

    await visit(created.link.shortCode, { 'x-forwarded-for': '203.0.113.42' });
    await new Promise((resolve) => setTimeout(resolve, 120));

    const events = await testDb.db
      .select()
      .from(clickEvents)
      .where(eq(clickEvents.linkId, created.link.id));

    const serialised = JSON.stringify(events[0]);
    expect(serialised).not.toContain('203.0.113.42');
  });

  it('never stores the raw user-agent string', async () => {
    const created = await createLink({ destinationUrl: 'https://example.com' });
    if (!created.ok) return;

    const rawUa =
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
    await visit(created.link.shortCode, { 'user-agent': rawUa });
    await new Promise((resolve) => setTimeout(resolve, 120));

    const events = await testDb.db
      .select()
      .from(clickEvents)
      .where(eq(clickEvents.linkId, created.link.id));

    expect(JSON.stringify(events[0])).not.toContain('AppleWebKit');
  });
});

describe('anonymous link ownership', () => {
  it('leaves anonymous links unowned', async () => {
    const created = await createLink({ destinationUrl: 'https://example.com' });
    expect(created.ok).toBe(true);
    if (created.ok) expect(created.link.userId).toBeNull();
  });

  it('does not attribute an anonymous link to an unrelated account', async () => {
    const user = await createUser('someone@example.com', 'correct-horse-battery');
    expect(user.ok).toBe(true);

    const created = await createLink({ destinationUrl: 'https://example.com' });
    expect(created.ok).toBe(true);
    if (created.ok) expect(created.link.userId).toBeNull();
  });
});
