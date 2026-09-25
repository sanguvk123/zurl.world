/**
 * Reserved short codes / aliases.
 *
 * Anything here cannot be claimed as a custom alias, because doing so would
 * either shadow a real application route or impersonate system functionality.
 *
 * Three groups:
 *  1. Real routes that exist in the app today.
 *  2. Routes we intend to add (reserved now so they stay available).
 *  3. Words that would let an attacker impersonate Zurl or a well-known service
 *     (`admin`, `billing`, `security`, `verify`, `password-reset`, …).
 */

/** Routes that physically exist in `app/`. Shadowing these would break the app. */
const APPLICATION_ROUTES = [
  'api',
  'admin',
  'dashboard',
  'account',
  'settings',
  'login',
  'logout',
  'signin',
  'sign-in',
  'signup',
  'sign-up',
  'register',
  'links',
  'pricing',
  'about',
  'blog',
  'contact',
  'privacy',
  'terms',
  'report-abuse',
  'report',
  'tools',
  'docs',
  'status',
  'expired',
  'disabled',
  'protected',
] as const;

/** SEO landing pages. */
const SEO_ROUTES = [
  'url-shortener',
  'short-url',
  'link-shortener',
  'free-url-shortener',
  'shorten-url',
  'custom-url-shortener',
  'qr-code-generator',
  'bulk-url-shortener',
  'url-expander',
  'url-checker',
  'utm-builder',
  'link-analytics',
] as const;

/** Reserved for future product surface area. */
const FUTURE_ROUTES = [
  'team',
  'teams',
  'org',
  'organization',
  'workspace',
  'billing',
  'invoice',
  'invoices',
  'upgrade',
  'checkout',
  'plans',
  'enterprise',
  'partners',
  'affiliate',
  'careers',
  'jobs',
  'press',
  'brand',
  'legal',
  'dpa',
  'gdpr',
  'security',
  'changelog',
  'roadmap',
  'feedback',
  'support',
  'help',
  'faq',
  'guides',
  'integrations',
  'developers',
  'developer',
  'sdk',
  'cli',
  'webhooks',
  'analytics',
  'domains',
  'domain',
  'qr',
  'go',
  'l',
  's',
  'u',
  'r',
] as const;

/**
 * Words that would let a link impersonate Zurl itself or a trusted flow.
 * A link at `zurl.world/verify-account` is a phishing gift.
 */
const IMPERSONATION_RISK = [
  'zurl',
  'official',
  'staff',
  'team-zurl',
  'root',
  'sysadmin',
  'administrator',
  'moderator',
  'mod',
  'verify',
  'verification',
  'verify-account',
  'confirm',
  'confirmation',
  'reset',
  'reset-password',
  'password',
  'password-reset',
  'secure',
  'auth',
  'oauth',
  'sso',
  'token',
  'session',
  'unsubscribe',
  'payment',
  'payments',
  'pay',
  'refund',
  'wallet',
  'bank',
  'invoice-payment',
] as const;

/** File-like paths served from the origin root. */
const WELL_KNOWN_FILES = [
  'favicon',
  'favicon.ico',
  'robots',
  'robots.txt',
  'sitemap',
  'sitemap.xml',
  'manifest',
  'manifest.json',
  'site.webmanifest',
  'apple-touch-icon',
  'apple-touch-icon.png',
  'opensearch.xml',
  'ads.txt',
  'humans.txt',
  'security.txt',
  '.well-known',
  '_next',
  '_vercel',
  'static',
  'public',
  'assets',
  'images',
  'img',
  'css',
  'js',
  'fonts',
  'icon',
  'icons',
  'og',
  'null',
  'undefined',
  'true',
  'false',
] as const;

export const RESERVED_ALIASES: ReadonlySet<string> = new Set<string>([
  ...APPLICATION_ROUTES,
  ...SEO_ROUTES,
  ...FUTURE_ROUTES,
  ...IMPERSONATION_RISK,
  ...WELL_KNOWN_FILES,
]);

/**
 * True when the alias may not be used.
 * Comparison is case-insensitive because aliases are stored lowercased.
 */
export function isReservedAlias(alias: string): boolean {
  return RESERVED_ALIASES.has(alias.trim().toLowerCase());
}

/**
 * Paths the redirect route should never attempt to resolve as a short code.
 * Used as a cheap pre-database guard on the hot path.
 */
export function isNonCodePath(segment: string): boolean {
  if (segment.length === 0) return true;
  if (segment.startsWith('.')) return true;
  if (segment.startsWith('_')) return true;
  // Anything with a file extension is a static asset probe, not a short code.
  if (/\.[a-z0-9]{2,5}$/i.test(segment)) return true;
  return false;
}
