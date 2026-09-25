/**
 * Request context: client IP, coarse geo, and IP hashing.
 *
 * Privacy stance: the raw IP is used only transiently, for rate limiting and to
 * derive a hash for abuse attribution. It is never written to the database.
 */

import { createHash } from 'node:crypto';

/**
 * Extracts the client IP from proxy headers.
 *
 * `x-forwarded-for` is a comma-separated chain; the left-most entry is the
 * original client, but it is also client-controlled and therefore spoofable.
 * Platform-specific headers (`x-real-ip`, `cf-connecting-ip`) are set by the
 * edge and are preferred where present.
 */
export function getClientIp(headers: Headers): string {
  const candidates = [
    headers.get('cf-connecting-ip'),
    headers.get('x-real-ip'),
    headers.get('x-vercel-forwarded-for'),
  ];

  for (const candidate of candidates) {
    if (candidate && candidate.trim().length > 0) return candidate.trim();
  }

  const forwarded = headers.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim();
    if (first && first.length > 0) return first;
  }

  return '0.0.0.0';
}

/**
 * Stable, non-reversible identifier for an IP.
 *
 * Salted with `IP_HASH_SECRET`; without a secret the hash of a 32-bit address
 * space is trivially brute-forced, which would make it personal data again.
 */
export function hashIp(ip: string): string {
  const secret = process.env.IP_HASH_SECRET ?? 'zurl-development-ip-salt';
  return createHash('sha256').update(`${secret}:${ip}`).digest('hex').slice(0, 32);
}

export type GeoInfo = {
  country: string | null;
  region: string | null;
  city: string | null;
};

/**
 * Coarse geo from CDN headers. Zurl performs no IP geolocation lookup of its
 * own and ships no geo database — if the platform does not provide these
 * headers, geo is simply unknown.
 */
export function getGeo(headers: Headers): GeoInfo {
  const country = headers.get('x-vercel-ip-country') ?? headers.get('cf-ipcountry');
  const region = headers.get('x-vercel-ip-country-region') ?? headers.get('cf-region-code');
  const city = headers.get('x-vercel-ip-city') ?? headers.get('cf-ipcity');

  return {
    country: normaliseCountry(country),
    region: region ? safeDecode(region).slice(0, 64) : null,
    city: city ? safeDecode(city).slice(0, 64) : null,
  };
}

function normaliseCountry(value: string | null): string | null {
  if (!value) return null;
  const upper = value.trim().toUpperCase();
  // The DB constrains this to exactly two letters; XX is CF's "unknown".
  if (!/^[A-Z]{2}$/.test(upper) || upper === 'XX') return null;
  return upper;
}

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

/**
 * Reduces a referrer to its host.
 *
 * Only the host is retained — the full referring URL can contain search terms,
 * session identifiers and private paths that we have no reason to store.
 */
export function getReferrerHost(headers: Headers): string | null {
  const referrer = headers.get('referer') ?? headers.get('referrer');
  if (!referrer) return null;
  try {
    const host = new URL(referrer).hostname.toLowerCase();
    return host.length > 0 ? host.slice(0, 253) : null;
  } catch {
    return null;
  }
}
