/**
 * Destination URL validation and normalisation.
 *
 * This is the primary security boundary of the product: everything a user
 * submits ends up being handed to a browser as a `Location` header, so a gap
 * here is a redirect-abuse or XSS vulnerability.
 *
 * Rules, in order:
 *   1. Parse with the WHATWG URL parser (never a regex).
 *   2. Allow only `http:` and `https:` — checked *after* parsing, so tricks like
 *      `java\nscript:` or `JaVaScRiPt:` cannot slip past a textual check.
 *   3. Reject hosts that are not publicly routable.
 *   4. Reject self-referential links (Zurl pointing at Zurl).
 *   5. Normalise conservatively — never touch the query string or fragment.
 */

export const MAX_URL_LENGTH = 2048;
export const MIN_URL_LENGTH = 4;

export type UrlRejectionReason =
  | 'empty'
  | 'too_long'
  | 'too_short'
  | 'malformed'
  | 'unsupported_protocol'
  | 'missing_host'
  | 'private_host'
  | 'self_reference'
  | 'credentials_in_url';

export type UrlValidationResult =
  | { ok: true; url: string; parsed: URL; warnings: UrlWarning[] }
  | { ok: false; reason: UrlRejectionReason; message: string };

export type UrlWarning = 'idn_homograph' | 'deep_subdomain' | 'shortener_chain';

/** The only protocols a short link may ever point at. */
const ALLOWED_PROTOCOLS: ReadonlySet<string> = new Set(['http:', 'https:']);

/**
 * Hostnames that are never publicly routable. Allowing these would let Zurl be
 * used to probe a visitor's own network, or to target our infrastructure.
 */
const BLOCKED_HOSTNAMES: ReadonlySet<string> = new Set([
  'localhost',
  '127.0.0.1',
  '0.0.0.0',
  '::1',
  '[::1]',
  'broadcasthost',
  'metadata.google.internal',
]);

/** Suffixes that indicate a private or non-public namespace. */
const BLOCKED_HOST_SUFFIXES = ['.local', '.internal', '.localhost', '.test', '.invalid', '.onion'];

/** Other URL shorteners. Chaining them defeats abuse review, so we warn. */
const KNOWN_SHORTENER_HOSTS: ReadonlySet<string> = new Set([
  'bit.ly',
  't.co',
  'tinyurl.com',
  'goo.gl',
  'ow.ly',
  'is.gd',
  'buff.ly',
  'rebrand.ly',
  'cutt.ly',
  'shorturl.at',
  't.ly',
  'rb.gy',
]);

/** Returns true when the hostname is an IPv4 literal. */
function isIpv4Literal(hostname: string): boolean {
  return /^\d{1,3}(\.\d{1,3}){3}$/.test(hostname);
}

/** Returns true when the hostname is a bracketed IPv6 literal. */
function isIpv6Literal(hostname: string): boolean {
  return hostname.startsWith('[') && hostname.endsWith(']');
}

/**
 * Private / reserved IPv4 ranges (RFC1918, loopback, link-local, CGNAT, and the
 * cloud metadata address).
 */
function isPrivateIpv4(hostname: string): boolean {
  const parts = hostname.split('.').map((p) => Number.parseInt(p, 10));
  if (parts.length !== 4 || parts.some((p) => Number.isNaN(p) || p < 0 || p > 255)) {
    // Not a well-formed dotted quad; treat as suspicious.
    return true;
  }
  const [a, b] = parts as [number, number, number, number];

  if (a === 10) return true; // 10.0.0.0/8
  if (a === 127) return true; // loopback
  if (a === 0) return true; // "this" network
  if (a === 169 && b === 254) return true; // link-local incl. 169.254.169.254 metadata
  if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12
  if (a === 192 && b === 168) return true; // 192.168.0.0/16
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT 100.64.0.0/10
  if (a >= 224) return true; // multicast + reserved

  return false;
}

/** Detects mixed-script hostnames, a common homograph phishing signal. */
function hasHomographRisk(hostname: string): boolean {
  if (hostname.startsWith('xn--') || hostname.includes('.xn--')) return true;
  // Any non-ASCII character in a hostname that also contains ASCII letters.
  const hasNonAscii = /[^\u0000-\u007F]/.test(hostname);
  const hasAsciiLetter = /[a-z]/i.test(hostname);
  return hasNonAscii && hasAsciiLetter;
}

/**
 * Hosts belonging to this deployment. A short link pointing at our own domain
 * is either a redirect loop or an attempt to launder a Zurl URL.
 */
function selfHosts(): Set<string> {
  const hosts = new Set(['zurl.world', 'www.zurl.world']);
  const configured = process.env.NEXT_PUBLIC_APP_URL;
  if (configured) {
    try {
      hosts.add(new URL(configured).hostname.toLowerCase());
    } catch {
      // Ignore a malformed env value; the defaults still apply.
    }
  }
  return hosts;
}

/**
 * Adds a scheme when the user omitted one. `example.com/x` is what people
 * actually paste, and silently failing on it is poor UX — but we only ever
 * assume `https:`, never a dangerous scheme.
 */
function withAssumedScheme(input: string): string {
  const trimmed = input.trim();
  // Already has some scheme (including a dangerous one — leave it so the
  // protocol check below can reject it explicitly).
  if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed)) return trimmed;
  if (trimmed.startsWith('//')) return `https:${trimmed}`;
  return `https://${trimmed}`;
}

export function validateDestinationUrl(rawInput: string): UrlValidationResult {
  const input = rawInput.trim();

  if (input.length === 0) {
    return { ok: false, reason: 'empty', message: 'Enter a URL to shorten.' };
  }
  if (input.length < MIN_URL_LENGTH) {
    return { ok: false, reason: 'too_short', message: 'That URL is too short to be valid.' };
  }
  if (input.length > MAX_URL_LENGTH) {
    return {
      ok: false,
      reason: 'too_long',
      message: `URLs must be ${MAX_URL_LENGTH.toLocaleString()} characters or fewer.`,
    };
  }

  // Control characters are used to smuggle schemes past naive checks
  // (e.g. "java\tscript:alert(1)"). Reject outright.
  if (/[\u0000-\u001F\u007F]/.test(input)) {
    return {
      ok: false,
      reason: 'malformed',
      message: 'That URL contains invalid characters.',
    };
  }

  let parsed: URL;
  try {
    parsed = new URL(withAssumedScheme(input));
  } catch {
    return {
      ok: false,
      reason: 'malformed',
      message: 'Enter a valid URL starting with http:// or https://.',
    };
  }

  // Protocol allowlist. This is checked on the *parsed* protocol, which the
  // WHATWG parser has already normalised and lowercased.
  if (!ALLOWED_PROTOCOLS.has(parsed.protocol)) {
    return {
      ok: false,
      reason: 'unsupported_protocol',
      message: 'Only http:// and https:// links are supported.',
    };
  }

  const hostname = parsed.hostname.toLowerCase();

  if (hostname.length === 0) {
    return {
      ok: false,
      reason: 'missing_host',
      message: 'Enter a valid URL starting with http:// or https://.',
    };
  }

  // Embedded credentials ("https://user:pass@evil.com") are a classic spoof:
  // the visible part of the URL looks like a trusted domain.
  if (parsed.username.length > 0 || parsed.password.length > 0) {
    return {
      ok: false,
      reason: 'credentials_in_url',
      message: 'URLs containing a username or password are not supported.',
    };
  }

  if (BLOCKED_HOSTNAMES.has(hostname)) {
    return {
      ok: false,
      reason: 'private_host',
      message: 'That URL points to a private address and cannot be shortened.',
    };
  }

  if (BLOCKED_HOST_SUFFIXES.some((suffix) => hostname.endsWith(suffix))) {
    return {
      ok: false,
      reason: 'private_host',
      message: 'That URL points to a private address and cannot be shortened.',
    };
  }

  if (isIpv4Literal(hostname) && isPrivateIpv4(hostname)) {
    return {
      ok: false,
      reason: 'private_host',
      message: 'That URL points to a private address and cannot be shortened.',
    };
  }

  if (isIpv6Literal(hostname)) {
    const inner = hostname.slice(1, -1);
    // Loopback, unique-local (fc00::/7) and link-local (fe80::/10).
    if (inner === '::1' || /^f[cd]/i.test(inner) || /^fe[89ab]/i.test(inner)) {
      return {
        ok: false,
        reason: 'private_host',
        message: 'That URL points to a private address and cannot be shortened.',
      };
    }
  }

  // A hostname with no dot and which is not an IP literal is not publicly
  // resolvable (e.g. "http://intranet/").
  if (!hostname.includes('.') && !isIpv6Literal(hostname)) {
    return {
      ok: false,
      reason: 'private_host',
      message: 'Enter a full domain name, for example https://example.com.',
    };
  }

  if (selfHosts().has(hostname)) {
    return {
      ok: false,
      reason: 'self_reference',
      message: 'You cannot shorten a Zurl link with Zurl.',
    };
  }

  const warnings: UrlWarning[] = [];
  if (hasHomographRisk(hostname)) warnings.push('idn_homograph');
  if (hostname.split('.').length > 5) warnings.push('deep_subdomain');
  if (KNOWN_SHORTENER_HOSTS.has(hostname)) warnings.push('shortener_chain');

  return { ok: true, url: normaliseUrl(parsed), parsed, warnings };
}

/**
 * Conservative normalisation.
 *
 * What we DO change:
 *   - lowercase the scheme and host (case-insensitive per RFC 3986)
 *   - drop a default port (`:80` on http, `:443` on https)
 *   - ensure a bare origin has a `/` path
 *
 * What we deliberately DO NOT change:
 *   - the query string — parameter order and duplicates are meaningful to many
 *     applications, and stripping or reordering them breaks campaign tracking
 *   - the fragment
 *   - path case, or a trailing slash on a non-empty path
 *
 * The brief is explicit that query parameters must not be unexpectedly modified.
 */
export function normaliseUrl(parsed: URL): string {
  const url = new URL(parsed.toString());

  url.protocol = url.protocol.toLowerCase();
  url.hostname = url.hostname.toLowerCase();

  if (
    (url.protocol === 'http:' && url.port === '80') ||
    (url.protocol === 'https:' && url.port === '443')
  ) {
    url.port = '';
  }

  if (url.pathname === '') {
    url.pathname = '/';
  }

  return url.toString();
}

/** Host shown in the UI, with `www.` removed for readability. */
export function displayHost(rawUrl: string): string {
  try {
    return new URL(rawUrl).hostname.replace(/^www\./, '');
  } catch {
    return rawUrl;
  }
}

/** Truncates a URL for display without breaking the layout. */
export function truncateUrl(rawUrl: string, max = 60): string {
  if (rawUrl.length <= max) return rawUrl;
  return `${rawUrl.slice(0, max - 1)}…`;
}
