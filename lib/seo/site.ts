/**
 * Site-wide constants.
 *
 * `zurl.world` (apex, no `www`) is the single canonical host. `www` 308s here
 * via `next.config.ts`.
 */

export const SITE = {
  name: 'Zurl',
  domain: 'zurl.world',
  tagline: 'Short links. Zero hassle.',
  description:
    'Create short, shareable links in seconds. Free, fast, and built for the web.',
  locale: 'en_US',
  twitter: '@zurlworld',
} as const;

/**
 * Absolute origin.
 *
 * Reads `NEXT_PUBLIC_APP_URL` so preview deployments produce correct canonicals
 * instead of pointing every preview at production.
 */
export function siteUrl(): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL;
  if (configured) return configured.replace(/\/$/, '');
  if (process.env.VERCEL_ENV === 'production') return `https://${SITE.domain}`;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return 'http://localhost:3000';
}

/** Builds an absolute URL from a site-relative path. */
export function absoluteUrl(path = '/'): string {
  const base = siteUrl();
  if (!path.startsWith('/')) return `${base}/${path}`;
  return `${base}${path}`;
}

/** The host shown in UI examples. Always the production brand, never localhost. */
export function displayDomain(): string {
  return SITE.domain;
}

/** Short URL as displayed to a user, e.g. `zurl.world/a8K3xPq`. */
export function displayShortUrl(code: string): string {
  return `${SITE.domain}/${code}`;
}

/** Fully-qualified short URL for copying. */
export function shortUrl(code: string): string {
  return absoluteUrl(`/${code}`);
}

/**
 * Origin of the incoming request, honouring the proxy headers a platform sets
 * when it terminates TLS.
 *
 * `NEXT_PUBLIC_APP_URL` is inlined at build time, so `siteUrl()` is frozen to
 * whatever the origin was when the bundle was compiled. That is correct for
 * canonicals and the sitemap, which must always point at the canonical host,
 * but wrong for an API response: if the same build is served from a preview
 * URL or the domain changes, the returned `shortUrl` would reference a host the
 * caller never used and may not be able to reach.
 *
 * Only `x-forwarded-*` is trusted, since the platform overwrites those. The
 * client-controlled `Host` header is used solely as a last-resort fallback for
 * local development, where there is no proxy in front.
 */
export function requestOrigin(request: Request): string {
  const headers = request.headers;
  const forwardedHost = headers.get('x-forwarded-host');
  const host = forwardedHost ?? headers.get('host');

  if (!host) return siteUrl();

  const proto =
    headers.get('x-forwarded-proto') ??
    (host.startsWith('localhost') || host.startsWith('127.0.0.1')
      ? 'http'
      : 'https');

  return `${proto}://${host}`;
}

/** Fully-qualified short URL, resolved against the host the caller used. */
export function shortUrlFor(request: Request, code: string): string {
  return `${requestOrigin(request)}/${code}`;
}
