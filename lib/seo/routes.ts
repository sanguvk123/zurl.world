/**
 * Route registry — the single source of truth for public, indexable pages.
 *
 * The sitemap, the internal-link graph and the SEO test suite all read from
 * here. A new public page cannot be added without appearing in the sitemap, and
 * a test asserts every registered route is reachable via internal links, which
 * is what prevents orphan pages.
 */

export type RouteGroup = 'core' | 'tool' | 'company' | 'legal' | 'blog';

export type PublicRoute = {
  path: string;
  /** Sitemap priority. Homepage 1.0, primary tools 0.9, support pages lower. */
  priority: number;
  changeFrequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  group: RouteGroup;
  /** Short label used in navigation and internal links. */
  label: string;
};

/**
 * Tool landing pages.
 *
 * Each targets a genuinely distinct search intent and has its own copy, FAQs
 * and — for the four utility tools — its own working functionality. These are
 * not templated duplicates.
 */
export const TOOL_ROUTES: readonly PublicRoute[] = [
  {
    path: '/url-shortener',
    priority: 0.9,
    changeFrequency: 'weekly',
    group: 'tool',
    label: 'URL Shortener',
  },
  {
    path: '/short-url',
    priority: 0.8,
    changeFrequency: 'weekly',
    group: 'tool',
    label: 'Short URL Generator',
  },
  {
    path: '/link-shortener',
    priority: 0.8,
    changeFrequency: 'weekly',
    group: 'tool',
    label: 'Link Shortener',
  },
  {
    path: '/free-url-shortener',
    priority: 0.8,
    changeFrequency: 'weekly',
    group: 'tool',
    label: 'Free URL Shortener',
  },
  {
    path: '/shorten-url',
    priority: 0.8,
    changeFrequency: 'weekly',
    group: 'tool',
    label: 'Shorten URL',
  },
  {
    path: '/custom-url-shortener',
    priority: 0.8,
    changeFrequency: 'weekly',
    group: 'tool',
    label: 'Custom URL Shortener',
  },
  {
    path: '/qr-code-generator',
    priority: 0.9,
    changeFrequency: 'weekly',
    group: 'tool',
    label: 'QR Code Generator',
  },
  {
    path: '/bulk-url-shortener',
    priority: 0.7,
    changeFrequency: 'weekly',
    group: 'tool',
    label: 'Bulk URL Shortener',
  },
  {
    path: '/url-expander',
    priority: 0.7,
    changeFrequency: 'weekly',
    group: 'tool',
    label: 'URL Expander',
  },
  {
    path: '/url-checker',
    priority: 0.7,
    changeFrequency: 'weekly',
    group: 'tool',
    label: 'URL Checker',
  },
  {
    path: '/utm-builder',
    priority: 0.7,
    changeFrequency: 'weekly',
    group: 'tool',
    label: 'UTM Builder',
  },
  {
    path: '/link-analytics',
    priority: 0.7,
    changeFrequency: 'weekly',
    group: 'tool',
    label: 'Link Analytics',
  },
] as const;

export const CORE_ROUTES: readonly PublicRoute[] = [
  { path: '/', priority: 1.0, changeFrequency: 'weekly', group: 'core', label: 'Home' },
  { path: '/tools', priority: 0.7, changeFrequency: 'monthly', group: 'core', label: 'Tools' },
  { path: '/pricing', priority: 0.7, changeFrequency: 'monthly', group: 'core', label: 'Pricing' },
  { path: '/api', priority: 0.7, changeFrequency: 'monthly', group: 'core', label: 'API' },
  { path: '/blog', priority: 0.7, changeFrequency: 'weekly', group: 'blog', label: 'Blog' },
] as const;

export const COMPANY_ROUTES: readonly PublicRoute[] = [
  { path: '/about', priority: 0.4, changeFrequency: 'yearly', group: 'company', label: 'About' },
  {
    path: '/contact',
    priority: 0.4,
    changeFrequency: 'yearly',
    group: 'company',
    label: 'Contact',
  },
] as const;

export const LEGAL_ROUTES: readonly PublicRoute[] = [
  { path: '/privacy', priority: 0.3, changeFrequency: 'yearly', group: 'legal', label: 'Privacy' },
  { path: '/terms', priority: 0.3, changeFrequency: 'yearly', group: 'legal', label: 'Terms' },
  {
    path: '/report-abuse',
    priority: 0.4,
    changeFrequency: 'yearly',
    group: 'legal',
    label: 'Report Abuse',
  },
] as const;

export const PUBLIC_ROUTES: readonly PublicRoute[] = [
  ...CORE_ROUTES,
  ...TOOL_ROUTES,
  ...COMPANY_ROUTES,
  ...LEGAL_ROUTES,
] as const;

/**
 * Prefixes that must never be indexed.
 * Mirrored in `robots.ts` and asserted by the SEO tests.
 */
export const DISALLOWED_PREFIXES: readonly string[] = [
  '/api/',
  '/admin',
  '/dashboard',
  '/account',
  '/links/',
  '/signin',
  '/signup',
  '/logout',
  '/protected/',
] as const;

export function isPublicRoute(path: string): boolean {
  return PUBLIC_ROUTES.some((route) => route.path === path);
}

export function findRoute(path: string): PublicRoute | undefined {
  return PUBLIC_ROUTES.find((route) => route.path === path);
}
