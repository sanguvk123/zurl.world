/**
 * GET /:code — the redirect.
 *
 * The hottest and most latency-sensitive path in the product. Kept to a single
 * indexed database query, an in-memory state check, and an immediate response.
 * Analytics is written *after* the response is produced, never before.
 *
 * This is a Route Handler rather than a page so there is no React render, no
 * layout, and no HTML payload on the happy path.
 */

import { after } from 'next/server';
import type { NextRequest } from 'next/server';
import { recordClick } from '@/lib/analytics/service';
import { findRedirectTarget, linkState } from '@/lib/links/service';
import { isNonCodePath } from '@/lib/links/reserved';
import { logger } from '@/lib/observability/logger';
import { checkRateLimit } from '@/lib/security/rate-limit';
import { getClientIp, hashIp } from '@/lib/security/request';
import { SITE, absoluteUrl } from '@/lib/seo/site';

export const runtime = 'nodejs';
// Never cached: link state can change at any moment (disable, expire, edit).
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest, context: { params: Promise<{ code: string }> }) {
  const { code } = await context.params;

  // Cheap rejection before touching the database. Static-asset probes and
  // dotfile scans never reach Postgres.
  if (isNonCodePath(code) || code.length > 48) {
    return notFound();
  }

  // Blunts alias enumeration. The limit is generous so genuine traffic to a
  // popular link is never affected.
  const limit = await checkRateLimit('redirect', hashIp(getClientIp(request.headers)));
  if (!limit.allowed) {
    return new Response('Too many requests', {
      status: 429,
      headers: {
        'retry-after': String(limit.retryAfterSeconds),
        'cache-control': 'no-store',
      },
    });
  }

  let target;
  try {
    target = await findRedirectTarget(code);
  } catch (error) {
    logger.error('redirect.lookup_failed', {
      code,
      error: error instanceof Error ? error.message : String(error),
    });
    return new Response('Service unavailable', {
      status: 503,
      headers: { 'cache-control': 'no-store', 'retry-after': '5' },
    });
  }

  if (!target) {
    return notFound();
  }

  const state = linkState(target);

  // 410 Gone, not 404: the link existed and is deliberately no longer served.
  // This is also the correct signal for crawlers to drop it.
  if (state === 'disabled') {
    return redirectTo(absoluteUrl('/disabled'), 302);
  }
  if (state === 'expired') {
    return redirectTo(absoluteUrl('/expired'), 302);
  }

  // Password-protected links get an interstitial instead of a redirect.
  if (target.passwordHash) {
    return redirectTo(absoluteUrl(`/protected/${encodeURIComponent(code)}`), 302);
  }

  const linkId = target.id;
  const headers = cloneRelevantHeaders(request.headers);

  /*
   * Record the click after the response is sent.
   *
   * `after()` runs the callback once the response has been handed to the
   * client, so the visitor never waits on an analytics INSERT. On hosts that do
   * not support it, the fallback still does not await the promise.
   */
  try {
    after(() => recordClick({ linkId, headers }));
  } catch {
    void recordClick({ linkId, headers }).catch(() => {
      // Already logged inside recordClick.
    });
  }

  /*
   * 302, not 301.
   *
   * A 301 is cached by browsers effectively forever, which would make
   * disabling, expiring or editing a link silently fail for anyone who has
   * already visited it. Correct behaviour beats saving one round trip.
   */
  return redirectTo(target.destinationUrl, 302);
}

function redirectTo(location: string, status: 301 | 302 | 307 | 308): Response {
  return new Response(null, {
    status,
    headers: {
      location,
      'cache-control': 'no-store, no-cache, must-revalidate',
      // Short links are utility objects, never search results.
      'x-robots-tag': 'noindex, nofollow',
      referrerpolicy: 'strict-origin-when-cross-origin',
    },
  });
}

/**
 * Responds with a genuine 404 for an unknown code.
 *
 * This must return the status directly rather than redirecting. `not-found.tsx`
 * is a Next.js convention file, not a routable path, so redirecting to
 * `/not-found` would fall straight back through to this same handler and loop
 * forever. A route handler also cannot render a React page, so the markup is
 * inlined and kept deliberately small.
 */
function notFound(): Response {
  return new Response(NOT_FOUND_HTML, {
    status: 404,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'no-store',
      'x-robots-tag': 'noindex, nofollow',
    },
  });
}

const NOT_FOUND_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>Link not found — ${SITE.name}</title>
<style>
  :root { color-scheme: light dark; }
  body {
    margin: 0; min-height: 100vh; display: grid; place-items: center;
    padding: 1.5rem;
    font: 16px/1.6 ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
    background: #fff; color: #111827;
  }
  main { max-width: 26rem; text-align: center; }
  h1 { font-size: 1.375rem; margin: 0 0 .5rem; letter-spacing: -.01em; }
  p { margin: 0 0 1.5rem; color: #4b5563; }
  a {
    display: inline-block; padding: .625rem 1.125rem; border-radius: .5rem;
    background: #111827; color: #fff; text-decoration: none; font-weight: 500;
  }
  a:focus-visible { outline: 2px solid #2563eb; outline-offset: 2px; }
  @media (prefers-color-scheme: dark) {
    body { background: #0b0f19; color: #f3f4f6; }
    p { color: #9ca3af; }
    a { background: #f3f4f6; color: #111827; }
  }
</style>
</head>
<body>
  <main>
    <h1>This link doesn't exist</h1>
    <p>It may have been mistyped, or the person who created it may have deleted it.</p>
    <a href="/">Create a short link</a>
  </main>
</body>
</html>`;

/**
 * Copies only the headers analytics needs.
 *
 * The request object cannot be safely retained after the response, so the few
 * relevant values are snapshotted. Notably this does *not* include cookies or
 * authorization.
 */
function cloneRelevantHeaders(source: Headers): Headers {
  const headers = new Headers();
  const keys = [
    'user-agent',
    'referer',
    'referrer',
    'cf-ipcountry',
    'cf-region-code',
    'cf-ipcity',
    'x-vercel-ip-country',
    'x-vercel-ip-country-region',
    'x-vercel-ip-city',
  ];
  for (const key of keys) {
    const value = source.get(key);
    if (value) headers.set(key, value);
  }
  return headers;
}
