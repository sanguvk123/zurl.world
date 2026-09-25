/**
 * Security boundaries, exercised against the real route handlers and database.
 *
 * Each block corresponds to an attack the brief calls out explicitly.
 */

import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { POST as createLinkRoute } from '@/app/api/links/route';
import { POST as reportRoute } from '@/app/api/reports/route';
import { POST as moderateRoute } from '@/app/api/admin/moderate/route';
import { GET as apiListRoute, POST as apiCreateRoute } from '@/app/api/v1/links/route';
import { DELETE as apiDeleteRoute, GET as apiGetRoute } from '@/app/api/v1/links/[id]/route';
import { abuseReports, links } from '@/lib/db/schema';
import { createApiKey } from '@/lib/auth/api-key';
import { createUser } from '@/lib/auth/user';
import { createLink, findLinkByCode } from '@/lib/links/service';
import { MemoryRateLimitStore, setRateLimitStore } from '@/lib/security/rate-limit';
import { contentSecurityPolicy, securityHeaders } from '@/lib/security/headers';
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
  setRateLimitStore(new MemoryRateLimitStore());
});

function jsonRequest(url: string, body: unknown, headers: Record<string, string> = {}): Request {
  return new Request(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
}

async function readJson(response: Response): Promise<Record<string, unknown>> {
  return (await response.json()) as Record<string, unknown>;
}

// ---------------------------------------------------------------------------

describe('malicious destination URLs are rejected at the API', () => {
  const payloads = [
    'javascript:alert(document.cookie)',
    'JaVaScRiPt:alert(1)',
    'data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==',
    'vbscript:msgbox(1)',
    'file:///etc/passwd',
    'http://localhost:3000/admin',
    'http://127.0.0.1:5432',
    'http://169.254.169.254/latest/meta-data/',
    'http://10.0.0.1/internal',
    'http://192.168.1.1',
    'https://user:password@evil.example.com/',
  ];

  for (const url of payloads) {
    it(`rejects ${url.slice(0, 48)}`, async () => {
      const response = await createLinkRoute(
        jsonRequest('https://zurl.world/api/links', { url }) as never,
      );

      expect(response.status, url).toBeGreaterThanOrEqual(400);

      // Nothing must have been persisted.
      const rows = await testDb.db.select().from(links);
      expect(rows, url).toHaveLength(0);
    });
  }

  it('never stores a dangerous scheme even if validation were bypassed', async () => {
    // The database CHECK constraint is the last line of defence.
    await expect(
      testDb.db.insert(links).values({
        id: 'lnk_test',
        shortCode: 'evil123',
        destinationUrl: 'javascript:alert(1)',
      }),
    ).rejects.toThrow();
  });
});

describe('XSS payloads through aliases', () => {
  const payloads = [
    '<script>alert(1)</script>',
    '"><img src=x onerror=alert(1)>',
    "javascript:alert('xss')",
    '%3Cscript%3Ealert(1)%3C/script%3E',
    '../../etc/passwd',
    '..%2f..%2fadmin',
    'a"onmouseover="alert(1)',
    "'>><marquee><img src=x onerror=confirm(1)></marquee>",
  ];

  for (const alias of payloads) {
    it(`rejects alias ${alias.slice(0, 40)}`, async () => {
      const result = await createLink({ destinationUrl: 'https://example.com', alias });
      expect(result.ok, alias).toBe(false);
    });
  }

  it('enforces the character set at the database level', async () => {
    await expect(
      testDb.db.insert(links).values({
        id: 'lnk_xss',
        shortCode: '<script>',
        destinationUrl: 'https://example.com',
      }),
    ).rejects.toThrow();
  });
});

describe('SQL injection attempts', () => {
  const payloads = [
    "'; DROP TABLE links;--",
    "' OR '1'='1",
    "admin'--",
    "1'; UPDATE users SET role='admin' WHERE '1'='1",
    "' UNION SELECT * FROM users--",
  ];

  it('treats injection strings as ordinary data in destinations', async () => {
    for (const payload of payloads) {
      const result = await createLink({
        destinationUrl: `https://example.com/search?q=${encodeURIComponent(payload)}`,
      });
      expect(result.ok, payload).toBe(true);
    }

    // The tables still exist and hold exactly what we inserted.
    const rows = await testDb.db.select().from(links);
    expect(rows).toHaveLength(payloads.length);
  });

  it('rejects injection strings used as aliases', async () => {
    for (const payload of payloads) {
      const result = await createLink({ destinationUrl: 'https://example.com', alias: payload });
      expect(result.ok, payload).toBe(false);
    }
  });

  it('survives injection strings in a lookup', async () => {
    for (const payload of payloads) {
      await expect(findLinkByCode(payload)).resolves.toBeNull();
    }
  });
});

describe('reserved alias protection', () => {
  it('refuses to shadow application routes', async () => {
    const routes = ['api', 'admin', 'dashboard', 'signin', 'signup', 'account', 'pricing'];
    for (const alias of routes) {
      const result = await createLink({ destinationUrl: 'https://example.com', alias });
      expect(result.ok, alias).toBe(false);
    }
  });

  it('refuses impersonation-prone names', async () => {
    for (const alias of ['verify', 'reset-password', 'billing', 'security', 'zurl']) {
      const result = await createLink({ destinationUrl: 'https://example.com', alias });
      expect(result.ok, alias).toBe(false);
    }
  });
});

describe('authorization boundaries in the public API', () => {
  it('rejects requests with no API key', async () => {
    const response = await apiCreateRoute(
      jsonRequest('https://zurl.world/api/v1/links', { url: 'https://example.com' }) as never,
    );
    expect(response.status).toBe(401);
  });

  it('rejects a malformed Authorization header', async () => {
    for (const header of ['Bearer', 'Basic abc', 'Bearer notakey', 'zurl_sk_fake']) {
      const response = await apiCreateRoute(
        jsonRequest(
          'https://zurl.world/api/v1/links',
          { url: 'https://example.com' },
          { authorization: header },
        ) as never,
      );
      expect(response.status, header).toBe(401);
    }
  });

  it('rejects a revoked key', async () => {
    const user = await createUser('rev@example.com', 'correct-horse-battery');
    expect(user.ok).toBe(true);
    if (!user.ok) return;

    const { key, record } = await createApiKey(user.user.id, 'test');
    const { revokeApiKey } = await import('@/lib/auth/api-key');
    await revokeApiKey(record.id, user.user.id);

    const response = await apiCreateRoute(
      jsonRequest(
        'https://zurl.world/api/v1/links',
        { url: 'https://example.com' },
        { authorization: `Bearer ${key}` },
      ) as never,
    );
    expect(response.status).toBe(401);
  });

  it('accepts a valid key', async () => {
    const user = await createUser('ok@example.com', 'correct-horse-battery');
    if (!user.ok) return;
    const { key } = await createApiKey(user.user.id, 'test');

    const response = await apiCreateRoute(
      jsonRequest(
        'https://zurl.world/api/v1/links',
        { url: 'https://example.com/page' },
        { authorization: `Bearer ${key}` },
      ) as never,
    );
    expect(response.status).toBe(201);
  });

  it("returns 404, not 403, for another user's link", async () => {
    // 403 would confirm the id exists, turning this into an id oracle.
    const alice = await createUser('alice@example.com', 'correct-horse-battery');
    const bob = await createUser('bob@example.com', 'correct-horse-battery');
    if (!alice.ok || !bob.ok) return;

    const created = await createLink({
      destinationUrl: 'https://example.com/private',
      userId: alice.user.id,
    });
    if (!created.ok) return;

    const { key: bobKey } = await createApiKey(bob.user.id, 'bob');

    const response = await apiGetRoute(
      new Request(`https://zurl.world/api/v1/links/${created.link.id}`, {
        headers: { authorization: `Bearer ${bobKey}` },
      }) as never,
      { params: Promise.resolve({ id: created.link.id }) },
    );

    expect(response.status).toBe(404);
  });

  it("prevents deleting another user's link", async () => {
    const alice = await createUser('alice@example.com', 'correct-horse-battery');
    const bob = await createUser('bob@example.com', 'correct-horse-battery');
    if (!alice.ok || !bob.ok) return;

    const created = await createLink({
      destinationUrl: 'https://example.com/private',
      userId: alice.user.id,
    });
    if (!created.ok) return;

    const { key: bobKey } = await createApiKey(bob.user.id, 'bob');

    const response = await apiDeleteRoute(
      new Request(`https://zurl.world/api/v1/links/${created.link.id}`, { method: 'DELETE' }) as never,
      { params: Promise.resolve({ id: created.link.id }) },
    );
    expect(response.status).toBe(401);

    const withKey = await apiDeleteRoute(
      new Request(`https://zurl.world/api/v1/links/${created.link.id}`, {
        method: 'DELETE',
        headers: { authorization: `Bearer ${bobKey}` },
      }) as never,
      { params: Promise.resolve({ id: created.link.id }) },
    );
    expect(withKey.status).toBe(404);

    // Still present.
    expect(await findLinkByCode(created.link.shortCode)).not.toBeNull();
  });

  it("only lists the caller's own links", async () => {
    const alice = await createUser('alice@example.com', 'correct-horse-battery');
    const bob = await createUser('bob@example.com', 'correct-horse-battery');
    if (!alice.ok || !bob.ok) return;

    await createLink({ destinationUrl: 'https://example.com/a', userId: alice.user.id });
    await createLink({ destinationUrl: 'https://example.com/b', userId: bob.user.id });

    const { key: aliceKey } = await createApiKey(alice.user.id, 'alice');

    const response = await apiListRoute(
      new Request('https://zurl.world/api/v1/links', {
        headers: { authorization: `Bearer ${aliceKey}` },
      }) as never,
    );

    const payload = await readJson(response);
    const data = payload.data as { links: { destinationUrl: string }[] };
    expect(data.links).toHaveLength(1);
    expect(data.links[0]?.destinationUrl).toBe('https://example.com/a');
  });

  it('never exposes the password hash in API output', async () => {
    const user = await createUser('p@example.com', 'correct-horse-battery');
    if (!user.ok) return;
    const { key } = await createApiKey(user.user.id, 'k');

    const response = await apiCreateRoute(
      jsonRequest(
        'https://zurl.world/api/v1/links',
        { url: 'https://example.com', password: 'secret123' },
        { authorization: `Bearer ${key}` },
      ) as never,
    );

    const body = JSON.stringify(await readJson(response));
    expect(body).not.toContain('passwordHash');
    expect(body).not.toContain('secret123');
    expect(body).not.toContain('scrypt');
    expect(body).toContain('hasPassword');
  });

  it('never exposes the creator IP hash', async () => {
    const user = await createUser('p2@example.com', 'correct-horse-battery');
    if (!user.ok) return;
    const { key } = await createApiKey(user.user.id, 'k');

    const response = await apiCreateRoute(
      jsonRequest(
        'https://zurl.world/api/v1/links',
        { url: 'https://example.com' },
        { authorization: `Bearer ${key}` },
      ) as never,
    );

    expect(JSON.stringify(await readJson(response))).not.toContain('creatorIpHash');
  });
});

describe('admin route protection', () => {
  it('returns 404 to an unauthenticated caller', async () => {
    // 404 rather than 403: do not confirm the endpoint exists.
    const response = await moderateRoute(
      jsonRequest('https://zurl.world/api/admin/moderate', {
        reportId: 'rpt_x',
        action: 'disable',
      }) as never,
    );
    expect(response.status).toBe(404);
  });
});

describe('abuse reporting', () => {
  it('accepts a report for a real link', async () => {
    const created = await createLink({ destinationUrl: 'https://example.com/bad' });
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    const response = await reportRoute(
      jsonRequest('https://zurl.world/api/reports', {
        code: created.link.shortCode,
        category: 'phishing',
        details: 'Imitates a bank sign-in page.',
      }) as never,
    );

    expect(response.status).toBe(200);

    const reports = await testDb.db.select().from(abuseReports);
    expect(reports).toHaveLength(1);
    expect(reports[0]?.category).toBe('phishing');
  });

  it('never reveals the destination in the response', async () => {
    const created = await createLink({ destinationUrl: 'https://secret.example.com/path' });
    if (!created.ok) return;

    const response = await reportRoute(
      jsonRequest('https://zurl.world/api/reports', {
        code: created.link.shortCode,
        category: 'spam',
      }) as never,
    );

    const body = JSON.stringify(await readJson(response));
    expect(body).not.toContain('secret.example.com');
  });

  it('auto-disables a link after repeated reports', async () => {
    const created = await createLink({ destinationUrl: 'https://example.com/phish' });
    if (!created.ok) return;

    for (let i = 0; i < 3; i += 1) {
      await reportRoute(
        jsonRequest(
          'https://zurl.world/api/reports',
          { code: created.link.shortCode, category: 'phishing' },
          { 'x-real-ip': `203.0.113.${i + 1}` },
        ) as never,
      );
    }

    const reloaded = await testDb.db
      .select()
      .from(links)
      .where(eq(links.id, created.link.id))
      .limit(1);

    expect(reloaded[0]?.disabledAt).not.toBeNull();
    expect(reloaded[0]?.disabledReason).toBe('abuse');
  });

  it('rejects a report for a link that does not exist', async () => {
    const response = await reportRoute(
      jsonRequest('https://zurl.world/api/reports', {
        code: 'nosuchcode',
        category: 'spam',
      }) as never,
    );
    expect(response.status).toBe(404);
  });

  it('rejects an invalid category', async () => {
    const created = await createLink({ destinationUrl: 'https://example.com' });
    if (!created.ok) return;

    const response = await reportRoute(
      jsonRequest('https://zurl.world/api/reports', {
        code: created.link.shortCode,
        category: 'not-a-category',
      }) as never,
    );
    expect(response.status).toBe(400);
  });
});

describe('rate limiting', () => {
  it('blocks anonymous link creation past the limit', async () => {
    const headers = { 'x-real-ip': '198.51.100.7' };
    let limited = false;

    for (let i = 0; i < 14; i += 1) {
      const response = await createLinkRoute(
        jsonRequest(
          'https://zurl.world/api/links',
          { url: `https://example.com/page-${i}` },
          headers,
        ) as never,
      );
      if (response.status === 429) {
        limited = true;
        expect(response.headers.get('retry-after')).toBeTruthy();
        break;
      }
    }

    expect(limited, 'anonymous creation should be rate limited').toBe(true);
  });

  it('keys the limit per IP, so one client cannot block another', async () => {
    for (let i = 0; i < 12; i += 1) {
      await createLinkRoute(
        jsonRequest(
          'https://zurl.world/api/links',
          { url: `https://example.com/x-${i}` },
          { 'x-real-ip': '198.51.100.20' },
        ) as never,
      );
    }

    const other = await createLinkRoute(
      jsonRequest(
        'https://zurl.world/api/links',
        { url: 'https://example.com/other' },
        { 'x-real-ip': '198.51.100.21' },
      ) as never,
    );

    expect(other.status).toBe(201);
  });

  it('includes standard rate-limit headers on success', async () => {
    const response = await createLinkRoute(
      jsonRequest(
        'https://zurl.world/api/links',
        { url: 'https://example.com' },
        { 'x-real-ip': '198.51.100.30' },
      ) as never,
    );

    expect(response.headers.get('ratelimit-limit')).toBeTruthy();
    expect(response.headers.get('ratelimit-remaining')).toBeTruthy();
  });

  it('cannot be bypassed by spoofing x-forwarded-for when a trusted header exists', async () => {
    // x-real-ip is set by the edge and takes precedence over the client-supplied
    // x-forwarded-for, so rotating the latter does not reset the counter.
    let limited = false;
    for (let i = 0; i < 14; i += 1) {
      const response = await createLinkRoute(
        jsonRequest(
          'https://zurl.world/api/links',
          { url: `https://example.com/spoof-${i}` },
          { 'x-real-ip': '198.51.100.40', 'x-forwarded-for': `10.0.0.${i}` },
        ) as never,
      );
      if (response.status === 429) {
        limited = true;
        break;
      }
    }
    expect(limited).toBe(true);
  });
});

describe('anonymous users cannot claim custom aliases', () => {
  it('requires an account for a custom alias', async () => {
    const response = await createLinkRoute(
      jsonRequest('https://zurl.world/api/links', {
        url: 'https://example.com',
        alias: 'premium-name',
      }) as never,
    );

    expect(response.status).toBe(403);
    expect(await findLinkByCode('premium-name')).toBeNull();
  });
});

describe('request size limits', () => {
  it('rejects an oversized body', async () => {
    const request = new Request('https://zurl.world/api/links', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'content-length': '999999' },
      body: JSON.stringify({ url: `https://example.com/${'a'.repeat(100)}` }),
    });

    const response = await createLinkRoute(request as never);
    expect(response.status).toBe(413);
  });

  it('rejects malformed JSON', async () => {
    const request = new Request('https://zurl.world/api/links', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{not json',
    });

    const response = await createLinkRoute(request as never);
    expect(response.status).toBe(400);
  });
});

describe('security headers', () => {
  const headers = securityHeaders();
  const byKey = new Map(headers.map((header) => [header.key, header.value]));

  it('denies framing', () => {
    expect(byKey.get('X-Frame-Options')).toBe('DENY');
  });

  it('blocks MIME sniffing', () => {
    expect(byKey.get('X-Content-Type-Options')).toBe('nosniff');
  });

  it('sets a referrer policy', () => {
    expect(byKey.get('Referrer-Policy')).toBe('strict-origin-when-cross-origin');
  });

  it('restricts powerful features', () => {
    const policy = byKey.get('Permissions-Policy') ?? '';
    expect(policy).toContain('camera=()');
    expect(policy).toContain('geolocation=()');
  });

  it('ships a content security policy', () => {
    const csp = contentSecurityPolicy();
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("base-uri 'self'");
  });

  it('allows no external script origin', () => {
    const csp = contentSecurityPolicy();
    const scriptSrc = csp.split(';').find((part) => part.trim().startsWith('script-src')) ?? '';
    expect(scriptSrc).not.toContain('http://');
    expect(scriptSrc).not.toContain('https://');
  });
});
