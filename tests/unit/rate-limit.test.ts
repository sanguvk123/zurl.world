import { beforeEach, describe, expect, it } from 'vitest';
import {
  checkRateLimit,
  MemoryRateLimitStore,
  RATE_LIMITS,
  rateLimitHeaders,
  setRateLimitStore,
} from '@/lib/security/rate-limit';
import { getClientIp, getGeo, getReferrerHost, hashIp } from '@/lib/security/request';

beforeEach(() => {
  setRateLimitStore(new MemoryRateLimitStore());
});

describe('rate limit rules', () => {
  it('gives every rule a positive limit and window', () => {
    for (const [name, rule] of Object.entries(RATE_LIMITS)) {
      expect(rule.limit, name).toBeGreaterThan(0);
      expect(rule.windowMs, name).toBeGreaterThan(0);
    }
  });

  it('gives authenticated users a higher allowance than anonymous', () => {
    expect(RATE_LIMITS.createLinkUser.limit).toBeGreaterThan(RATE_LIMITS.createLinkAnonymous.limit);
  });

  it('gives API keys the highest creation allowance', () => {
    expect(RATE_LIMITS.createLinkApi.limit).toBeGreaterThan(RATE_LIMITS.createLinkUser.limit);
  });

  it('keeps sign-in limits tight', () => {
    expect(RATE_LIMITS.signInAccount.limit).toBeLessThanOrEqual(10);
    expect(RATE_LIMITS.signInIp.limit).toBeLessThanOrEqual(20);
  });
});

describe('checkRateLimit', () => {
  it('allows requests below the limit', async () => {
    const result = await checkRateLimit('createLinkAnonymous', 'client-a');
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(RATE_LIMITS.createLinkAnonymous.limit - 1);
  });

  it('blocks once the limit is exceeded', async () => {
    const limit = RATE_LIMITS.createLinkAnonymous.limit;
    for (let i = 0; i < limit; i += 1) {
      const result = await checkRateLimit('createLinkAnonymous', 'client-b');
      expect(result.allowed, `request ${i + 1}`).toBe(true);
    }

    const blocked = await checkRateLimit('createLinkAnonymous', 'client-b');
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
  });

  it('tracks identifiers independently', async () => {
    const limit = RATE_LIMITS.createLinkAnonymous.limit;
    for (let i = 0; i < limit + 2; i += 1) {
      await checkRateLimit('createLinkAnonymous', 'noisy-client');
    }

    const other = await checkRateLimit('createLinkAnonymous', 'quiet-client');
    expect(other.allowed).toBe(true);
  });

  it('tracks named limits independently', async () => {
    const limit = RATE_LIMITS.createLinkAnonymous.limit;
    for (let i = 0; i < limit + 2; i += 1) {
      await checkRateLimit('createLinkAnonymous', 'same-id');
    }

    // A different limit with the same identifier is unaffected.
    const other = await checkRateLimit('qrGenerate', 'same-id');
    expect(other.allowed).toBe(true);
  });

  it('reports a reset time in the future', async () => {
    const result = await checkRateLimit('createLinkAnonymous', 'client-c');
    expect(result.resetAt).toBeGreaterThan(Date.now());
  });
});

describe('rateLimitHeaders', () => {
  it('emits the standard headers', async () => {
    const result = await checkRateLimit('createLinkAnonymous', 'client-d');
    const headers = rateLimitHeaders(result);

    expect(headers['RateLimit-Limit']).toBe(String(RATE_LIMITS.createLinkAnonymous.limit));
    expect(headers['RateLimit-Remaining']).toBeDefined();
    expect(headers['RateLimit-Reset']).toBeDefined();
    expect(headers['Retry-After']).toBeUndefined();
  });

  it('adds Retry-After when blocked', async () => {
    const limit = RATE_LIMITS.createLinkAnonymous.limit;
    for (let i = 0; i < limit; i += 1) {
      await checkRateLimit('createLinkAnonymous', 'client-e');
    }
    const blocked = await checkRateLimit('createLinkAnonymous', 'client-e');

    expect(rateLimitHeaders(blocked)['Retry-After']).toBeDefined();
  });
});

describe('MemoryRateLimitStore', () => {
  it('increments a counter', async () => {
    const store = new MemoryRateLimitStore();
    expect((await store.increment('k', 60_000)).count).toBe(1);
    expect((await store.increment('k', 60_000)).count).toBe(2);
  });

  it('resets a single key', async () => {
    const store = new MemoryRateLimitStore();
    await store.increment('k', 60_000);
    await store.reset('k');
    expect((await store.increment('k', 60_000)).count).toBe(1);
  });

  it('starts a new window once the old one expires', async () => {
    const store = new MemoryRateLimitStore();
    await store.increment('k', 1);
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect((await store.increment('k', 1)).count).toBe(1);
  });

  it('clears everything', async () => {
    const store = new MemoryRateLimitStore();
    await store.increment('a', 60_000);
    await store.increment('b', 60_000);
    await store.clear();
    expect((await store.increment('a', 60_000)).count).toBe(1);
  });
});

describe('client IP extraction', () => {
  it('prefers platform headers over x-forwarded-for', () => {
    const headers = new Headers({
      'x-forwarded-for': '1.2.3.4',
      'x-real-ip': '5.6.7.8',
    });
    // x-forwarded-for is client-controlled; x-real-ip is set by the edge.
    expect(getClientIp(headers)).toBe('5.6.7.8');
  });

  it('prefers the CDN header above all', () => {
    const headers = new Headers({
      'cf-connecting-ip': '9.9.9.9',
      'x-real-ip': '5.6.7.8',
      'x-forwarded-for': '1.2.3.4',
    });
    expect(getClientIp(headers)).toBe('9.9.9.9');
  });

  it('takes the left-most entry of a forwarded chain', () => {
    const headers = new Headers({ 'x-forwarded-for': '1.2.3.4, 5.6.7.8, 9.10.11.12' });
    expect(getClientIp(headers)).toBe('1.2.3.4');
  });

  it('falls back when no header is present', () => {
    expect(getClientIp(new Headers())).toBe('0.0.0.0');
  });
});

describe('IP hashing', () => {
  it('is stable for the same address', () => {
    expect(hashIp('1.2.3.4')).toBe(hashIp('1.2.3.4'));
  });

  it('differs between addresses', () => {
    expect(hashIp('1.2.3.4')).not.toBe(hashIp('1.2.3.5'));
  });

  it('does not contain the address', () => {
    expect(hashIp('203.0.113.42')).not.toContain('203.0.113.42');
  });

  it('produces a fixed-length identifier', () => {
    expect(hashIp('1.2.3.4')).toHaveLength(32);
  });
});

describe('geo extraction', () => {
  it('reads Vercel headers', () => {
    const geo = getGeo(
      new Headers({
        'x-vercel-ip-country': 'IN',
        'x-vercel-ip-country-region': 'KA',
        'x-vercel-ip-city': 'Bengaluru',
      }),
    );
    expect(geo).toEqual({ country: 'IN', region: 'KA', city: 'Bengaluru' });
  });

  it('reads Cloudflare headers', () => {
    expect(getGeo(new Headers({ 'cf-ipcountry': 'GB' })).country).toBe('GB');
  });

  it('normalises country case', () => {
    expect(getGeo(new Headers({ 'cf-ipcountry': 'gb' })).country).toBe('GB');
  });

  it('treats XX as unknown', () => {
    expect(getGeo(new Headers({ 'cf-ipcountry': 'XX' })).country).toBeNull();
  });

  it('rejects a malformed country code', () => {
    expect(getGeo(new Headers({ 'cf-ipcountry': 'NOTACOUNTRY' })).country).toBeNull();
  });

  it('returns nulls when no geo headers exist', () => {
    expect(getGeo(new Headers())).toEqual({ country: null, region: null, city: null });
  });

  it('decodes percent-encoded city names', () => {
    expect(getGeo(new Headers({ 'x-vercel-ip-city': 'S%C3%A3o%20Paulo' })).city).toBe('São Paulo');
  });
});

describe('referrer handling', () => {
  it('keeps only the host', () => {
    const headers = new Headers({ referer: 'https://example.com/private/path?q=secret' });
    expect(getReferrerHost(headers)).toBe('example.com');
  });

  it('lowercases the host', () => {
    expect(getReferrerHost(new Headers({ referer: 'https://EXAMPLE.com/' }))).toBe('example.com');
  });

  it('returns null when absent', () => {
    expect(getReferrerHost(new Headers())).toBeNull();
  });

  it('returns null for a malformed referrer', () => {
    expect(getReferrerHost(new Headers({ referer: 'not a url' }))).toBeNull();
  });

  it('never leaks the query string', () => {
    const host = getReferrerHost(
      new Headers({ referer: 'https://search.example.com/?q=private+terms' }),
    );
    expect(host).toBe('search.example.com');
    expect(host).not.toContain('private');
  });
});
