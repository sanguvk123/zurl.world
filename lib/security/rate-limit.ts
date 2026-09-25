/**
 * Rate limiting.
 *
 * Limits are declared as data (`RATE_LIMITS`) and enforced through a
 * `RateLimitStore` interface. The default implementation is in-process; swapping
 * in Redis/Upstash means implementing three methods and changing one factory
 * call — no handler code changes. That is what keeps horizontal scaling
 * available: nothing about the limits is hard-coded into business logic.
 *
 * Algorithm: fixed window. Simpler and cheaper than a sliding log, and precise
 * enough for abuse control. Every response carries the standard
 * `RateLimit-*` headers plus `Retry-After` on rejection.
 */

export type RateLimitRule = {
  /** Requests permitted per window. */
  limit: number;
  /** Window length in milliseconds. */
  windowMs: number;
};

export type RateLimitResult = {
  allowed: boolean;
  limit: number;
  remaining: number;
  /** Epoch ms when the current window resets. */
  resetAt: number;
  /** Seconds to wait; only meaningful when `allowed` is false. */
  retryAfterSeconds: number;
};

export interface RateLimitStore {
  /** Atomically increments the counter for `key` and returns the new value. */
  increment(key: string, windowMs: number): Promise<{ count: number; resetAt: number }>;
  reset(key: string): Promise<void>;
  clear(): Promise<void>;
}

/**
 * In-memory store.
 *
 * Correct for a single instance and for tests. In a multi-instance deployment
 * each instance holds its own counters, so the effective limit is multiplied by
 * the instance count — acceptable for a soft abuse control, and the reason the
 * interface exists.
 */
export class MemoryRateLimitStore implements RateLimitStore {
  private readonly buckets = new Map<string, { count: number; resetAt: number }>();
  private lastSweep = Date.now();

  async increment(key: string, windowMs: number): Promise<{ count: number; resetAt: number }> {
    const now = Date.now();
    this.sweep(now);

    const existing = this.buckets.get(key);
    if (!existing || existing.resetAt <= now) {
      const fresh = { count: 1, resetAt: now + windowMs };
      this.buckets.set(key, fresh);
      return fresh;
    }

    existing.count += 1;
    return existing;
  }

  async reset(key: string): Promise<void> {
    this.buckets.delete(key);
  }

  async clear(): Promise<void> {
    this.buckets.clear();
  }

  /** Drops expired buckets so the map cannot grow without bound. */
  private sweep(now: number): void {
    if (now - this.lastSweep < 60_000) return;
    this.lastSweep = now;
    for (const [key, bucket] of this.buckets) {
      if (bucket.resetAt <= now) this.buckets.delete(key);
    }
  }
}

let store: RateLimitStore = new MemoryRateLimitStore();

/** Replaces the backing store (Redis in production, a fresh map in tests). */
export function setRateLimitStore(next: RateLimitStore): void {
  store = next;
}

export function getRateLimitStore(): RateLimitStore {
  return store;
}

/**
 * Named limits.
 *
 * Anonymous users get a workable allowance so the product is genuinely usable
 * without an account; authenticated users get more; API keys more still.
 */
export const RATE_LIMITS = {
  /** Anonymous link creation, keyed by IP. */
  createLinkAnonymous: { limit: 10, windowMs: 60 * 60 * 1000 },
  /** Authenticated link creation, keyed by user. */
  createLinkUser: { limit: 120, windowMs: 60 * 60 * 1000 },
  /** API link creation, keyed by API key. */
  createLinkApi: { limit: 1_000, windowMs: 60 * 60 * 1000 },
  /** Sign-in attempts per IP — credential stuffing defence. */
  signInIp: { limit: 10, windowMs: 15 * 60 * 1000 },
  /** Sign-in attempts per account — targeted brute force defence. */
  signInAccount: { limit: 5, windowMs: 15 * 60 * 1000 },
  signUp: { limit: 5, windowMs: 60 * 60 * 1000 },
  /** Guesses at a password-protected link. */
  linkPassword: { limit: 10, windowMs: 15 * 60 * 1000 },
  /** Redirects per IP — blunts alias enumeration. Generous: real users click a lot. */
  redirect: { limit: 600, windowMs: 60 * 1000 },
  abuseReport: { limit: 10, windowMs: 60 * 60 * 1000 },
  qrGenerate: { limit: 60, windowMs: 60 * 60 * 1000 },
  apiRead: { limit: 2_000, windowMs: 60 * 60 * 1000 },
} as const satisfies Record<string, RateLimitRule>;

export type RateLimitName = keyof typeof RATE_LIMITS;

export async function checkRateLimit(
  name: RateLimitName,
  identifier: string,
): Promise<RateLimitResult> {
  const rule = RATE_LIMITS[name];
  const key = `${name}:${identifier}`;
  const { count, resetAt } = await store.increment(key, rule.windowMs);

  const allowed = count <= rule.limit;
  return {
    allowed,
    limit: rule.limit,
    remaining: Math.max(0, rule.limit - count),
    resetAt,
    retryAfterSeconds: allowed ? 0 : Math.max(1, Math.ceil((resetAt - Date.now()) / 1000)),
  };
}

/** Standard rate-limit response headers (IETF draft naming). */
export function rateLimitHeaders(result: RateLimitResult): Record<string, string> {
  const headers: Record<string, string> = {
    'RateLimit-Limit': String(result.limit),
    'RateLimit-Remaining': String(result.remaining),
    'RateLimit-Reset': String(Math.max(0, Math.ceil((result.resetAt - Date.now()) / 1000))),
  };
  if (!result.allowed) {
    headers['Retry-After'] = String(result.retryAfterSeconds);
  }
  return headers;
}
