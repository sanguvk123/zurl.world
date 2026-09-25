/**
 * Internal linking graph.
 *
 * Related-tool modules are generated from this map rather than hand-written per
 * page, so the graph stays consistent and no page becomes an orphan. A test
 * asserts every registered public route is linked from at least one other page.
 *
 * Links are chosen for genuine topical relevance — a visitor on the QR page
 * plausibly wants the shortener; they do not need the Terms page. Excessive
 * cross-linking is itself a quality signal problem, so each page lists three
 * to five related pages, not twelve.
 */

export type RelatedLink = {
  path: string;
  label: string;
  /** One line explaining why this is relevant. Rendered in the UI. */
  blurb: string;
};

const L = {
  urlShortener: {
    path: '/url-shortener',
    label: 'URL Shortener',
    blurb: 'Turn any long link into a short, shareable URL.',
  },
  shortUrl: {
    path: '/short-url',
    label: 'Short URL Generator',
    blurb: 'Generate a compact short URL in one step.',
  },
  linkShortener: {
    path: '/link-shortener',
    label: 'Link Shortener',
    blurb: 'Shorten links for social posts, email and print.',
  },
  freeUrlShortener: {
    path: '/free-url-shortener',
    label: 'Free URL Shortener',
    blurb: 'Free short links with no account required.',
  },
  shortenUrl: {
    path: '/shorten-url',
    label: 'Shorten a URL',
    blurb: 'Step-by-step guide to shortening a link.',
  },
  customUrlShortener: {
    path: '/custom-url-shortener',
    label: 'Custom URL Shortener',
    blurb: 'Choose your own memorable link ending.',
  },
  qrCodeGenerator: {
    path: '/qr-code-generator',
    label: 'QR Code Generator',
    blurb: 'Create a downloadable QR code for any URL.',
  },
  bulkUrlShortener: {
    path: '/bulk-url-shortener',
    label: 'Bulk URL Shortener',
    blurb: 'Shorten many links at once.',
  },
  urlExpander: {
    path: '/url-expander',
    label: 'URL Expander',
    blurb: 'See where a short link actually goes before clicking.',
  },
  urlChecker: {
    path: '/url-checker',
    label: 'URL Checker',
    blurb: 'Inspect a URL’s structure, protocol and parameters.',
  },
  utmBuilder: {
    path: '/utm-builder',
    label: 'UTM Builder',
    blurb: 'Build campaign-tagged URLs for analytics.',
  },
  linkAnalytics: {
    path: '/link-analytics',
    label: 'Link Analytics',
    blurb: 'Understand how your links are performing.',
  },
  api: { path: '/api', label: 'API', blurb: 'Create links programmatically.' },
  blog: { path: '/blog', label: 'Blog', blurb: 'Guides on links, QR codes and tracking.' },
  tools: { path: '/tools', label: 'All Tools', blurb: 'Every Zurl link utility in one place.' },
  pricing: { path: '/pricing', label: 'Pricing', blurb: 'What is free and what is not.' },
} as const satisfies Record<string, RelatedLink>;

/** Related pages, keyed by the page they appear on. */
export const RELATED_LINKS: Record<string, readonly RelatedLink[]> = {
  '/': [L.urlShortener, L.qrCodeGenerator, L.customUrlShortener, L.linkAnalytics, L.api],

  '/url-shortener': [
    L.shortUrl,
    L.linkShortener,
    L.customUrlShortener,
    L.qrCodeGenerator,
    L.linkAnalytics,
  ],
  '/short-url': [L.urlShortener, L.shortenUrl, L.customUrlShortener, L.qrCodeGenerator],
  '/link-shortener': [L.urlShortener, L.shortUrl, L.freeUrlShortener, L.linkAnalytics],
  '/free-url-shortener': [L.urlShortener, L.linkShortener, L.pricing, L.qrCodeGenerator],
  '/shorten-url': [L.urlShortener, L.shortUrl, L.bulkUrlShortener, L.blog],
  '/custom-url-shortener': [L.urlShortener, L.shortUrl, L.linkAnalytics, L.qrCodeGenerator],
  '/qr-code-generator': [L.urlShortener, L.shortUrl, L.linkAnalytics, L.customUrlShortener],
  '/bulk-url-shortener': [L.urlShortener, L.api, L.utmBuilder, L.linkAnalytics],
  '/url-expander': [L.urlChecker, L.urlShortener, L.qrCodeGenerator, L.blog],
  '/url-checker': [L.urlExpander, L.urlShortener, L.linkAnalytics, L.blog],
  '/utm-builder': [L.linkAnalytics, L.urlShortener, L.bulkUrlShortener, L.urlChecker],
  '/link-analytics': [L.urlShortener, L.utmBuilder, L.customUrlShortener, L.api],

  '/tools': [L.urlShortener, L.qrCodeGenerator, L.urlExpander, L.utmBuilder, L.linkAnalytics],
  '/pricing': [L.urlShortener, L.freeUrlShortener, L.api, L.linkAnalytics],
  '/api': [L.urlShortener, L.bulkUrlShortener, L.linkAnalytics, L.tools],
  '/blog': [L.urlShortener, L.qrCodeGenerator, L.linkAnalytics, L.tools],
  '/about': [L.urlShortener, L.tools, L.blog],
  '/contact': [L.urlShortener, L.tools],
  '/privacy': [L.linkAnalytics, L.urlShortener],
  '/terms': [L.urlShortener, L.pricing],
  '/report-abuse': [L.urlShortener, L.urlExpander],
};

export function relatedLinksFor(path: string): readonly RelatedLink[] {
  return RELATED_LINKS[path] ?? [L.urlShortener, L.qrCodeGenerator, L.tools];
}

/** Every path referenced by at least one page. Used to detect orphans. */
export function linkedPaths(): Set<string> {
  const paths = new Set<string>();
  for (const links of Object.values(RELATED_LINKS)) {
    for (const link of links) paths.add(link.path);
  }
  return paths;
}
