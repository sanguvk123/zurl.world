/**
 * SEO guarantees.
 *
 * These exist to catch the mistakes that are invisible in review but very
 * costly in production: a public page shipped with `noindex`, a page missing
 * from the sitemap, an orphan page with no inbound links, or invalid JSON-LD.
 */

import { describe, expect, it } from 'vitest';
import robots from '@/app/robots';
import sitemap from '@/app/sitemap';
import { getAllPosts } from '@/content/blog';
import { buildMetadata, buildPrivateMetadata } from '@/lib/seo/metadata';
import { linkedPaths, relatedLinksFor } from '@/lib/seo/internal-links';
import { DISALLOWED_PREFIXES, PUBLIC_ROUTES, TOOL_ROUTES } from '@/lib/seo/routes';
import { absoluteUrl, requestOrigin, shortUrlFor } from '@/lib/seo/site';
import {
  blogPostingSchema,
  breadcrumbSchema,
  buildJsonLd,
  faqSchema,
  organizationSchema,
  softwareApplicationSchema,
  websiteSchema,
} from '@/lib/seo/structured-data';

describe('metadata builder', () => {
  const metadata = buildMetadata({
    title: 'Test Page',
    description: 'A description of the test page.',
    path: '/url-shortener',
  });

  it('sets a title and description', () => {
    expect(metadata.title).toBe('Test Page');
    expect(metadata.description).toBe('A description of the test page.');
  });

  it('sets an absolute canonical URL', () => {
    const canonical = metadata.alternates?.canonical;
    expect(canonical).toBe('https://zurl.world/url-shortener');
  });

  it('marks public pages indexable explicitly', () => {
    expect(metadata.robots).toMatchObject({ index: true, follow: true });
  });

  it('includes complete Open Graph metadata', () => {
    expect(metadata.openGraph?.title).toBe('Test Page');
    expect(metadata.openGraph?.description).toBe('A description of the test page.');
    expect(metadata.openGraph?.url).toBe('https://zurl.world/url-shortener');
    expect(metadata.openGraph?.siteName).toBe('Zurl');
    expect(metadata.openGraph?.images).toBeDefined();
  });

  it('includes Twitter card metadata', () => {
    // The Twitter metadata type is a union; narrow it before asserting on card.
    const twitter = metadata.twitter as { card?: string; title?: string; images?: unknown };
    expect(twitter.card).toBe('summary_large_image');
    expect(twitter.title).toBe('Test Page');
    expect(twitter.images).toBeDefined();
  });

  it('supports a distinct OG title', () => {
    const custom = buildMetadata({
      title: 'SEO Title – Keyword Rich',
      ogTitle: 'Friendly Social Title',
      description: 'Description.',
      path: '/',
    });
    expect(custom.title).toBe('SEO Title – Keyword Rich');
    expect(custom.openGraph?.title).toBe('Friendly Social Title');
  });

  it('omits keywords unless supplied', () => {
    expect(metadata.keywords).toBeUndefined();
  });

  it('can mark a page noindex', () => {
    const hidden = buildMetadata({
      title: 'Hidden',
      description: 'Not for search engines.',
      path: '/hidden',
      index: false,
    });
    expect(hidden.robots).toMatchObject({ index: false, follow: false });
  });
});

describe('private metadata', () => {
  it('is always noindex, nofollow', () => {
    const metadata = buildPrivateMetadata('Dashboard');
    expect(metadata.robots).toMatchObject({ index: false, follow: false, nocache: true });
  });

  it('never sets a canonical URL', () => {
    expect(buildPrivateMetadata('Dashboard').alternates).toBeUndefined();
  });
});

describe('route registry', () => {
  it('contains no duplicate paths', () => {
    const paths = PUBLIC_ROUTES.map((route) => route.path);
    expect(new Set(paths).size).toBe(paths.length);
  });

  it('gives every route a valid priority', () => {
    for (const route of PUBLIC_ROUTES) {
      expect(route.priority, route.path).toBeGreaterThan(0);
      expect(route.priority, route.path).toBeLessThanOrEqual(1);
    }
  });

  it('gives the homepage the highest priority', () => {
    const home = PUBLIC_ROUTES.find((route) => route.path === '/');
    expect(home?.priority).toBe(1);
  });

  it('starts every path with a slash', () => {
    for (const route of PUBLIC_ROUTES) {
      expect(route.path.startsWith('/'), route.path).toBe(true);
    }
  });

  it('includes all twelve required tool pages', () => {
    const required = [
      '/url-shortener',
      '/short-url',
      '/link-shortener',
      '/free-url-shortener',
      '/shorten-url',
      '/custom-url-shortener',
      '/qr-code-generator',
      '/bulk-url-shortener',
      '/url-expander',
      '/url-checker',
      '/utm-builder',
      '/link-analytics',
    ];
    const paths = TOOL_ROUTES.map((route) => route.path);
    for (const path of required) {
      expect(paths, `${path} must be registered`).toContain(path);
    }
  });
});

describe('sitemap', () => {
  const entries = sitemap();

  it('includes every registered public route', () => {
    const urls = new Set(entries.map((entry) => entry.url));
    for (const route of PUBLIC_ROUTES) {
      expect(urls, `${route.path} must be in the sitemap`).toContain(absoluteUrl(route.path));
    }
  });

  it('includes every blog post', () => {
    const urls = new Set(entries.map((entry) => entry.url));
    for (const post of getAllPosts()) {
      expect(urls).toContain(absoluteUrl(`/blog/${post.slug}`));
    }
  });

  it('uses absolute URLs only', () => {
    for (const entry of entries) {
      expect(entry.url.startsWith('https://'), entry.url).toBe(true);
    }
  });

  it('contains no duplicates', () => {
    const urls = entries.map((entry) => entry.url);
    expect(new Set(urls).size).toBe(urls.length);
  });

  it('excludes private routes', () => {
    const urls = entries.map((entry) => entry.url).join(' ');
    for (const path of ['/dashboard', '/account', '/admin', '/signin', '/signup']) {
      expect(urls).not.toContain(`https://zurl.world${path}`);
    }
  });

  it('excludes individual short links', () => {
    // Short links are utility redirects, not landing pages.
    for (const entry of entries) {
      const path = entry.url.replace('https://zurl.world', '');
      const isRegistered =
        PUBLIC_ROUTES.some((route) => route.path === path) || path.startsWith('/blog/');
      expect(isRegistered, `${entry.url} is not a registered page`).toBe(true);
    }
  });

  it('gives every entry a lastModified date', () => {
    for (const entry of entries) {
      expect(entry.lastModified).toBeDefined();
    }
  });
});

describe('robots.txt', () => {
  const config = robots();

  it('allows crawling of the site root', () => {
    const rule = Array.isArray(config.rules) ? config.rules[0] : config.rules;
    expect(rule?.allow).toBe('/');
  });

  it('disallows every private prefix', () => {
    const rule = Array.isArray(config.rules) ? config.rules[0] : config.rules;
    const disallowed = Array.isArray(rule?.disallow) ? rule.disallow : [rule?.disallow];
    for (const prefix of DISALLOWED_PREFIXES) {
      expect(disallowed, `${prefix} must be disallowed`).toContain(prefix);
    }
  });

  it('points at the sitemap', () => {
    expect(config.sitemap).toBe('https://zurl.world/sitemap.xml');
  });

  it('does not disallow public tool pages', () => {
    const rule = Array.isArray(config.rules) ? config.rules[0] : config.rules;
    const disallowed = (Array.isArray(rule?.disallow) ? rule.disallow : [rule?.disallow]).join(' ');
    for (const route of TOOL_ROUTES) {
      expect(disallowed).not.toContain(route.path);
    }
  });
});

describe('internal linking', () => {
  it('links to every tool page from somewhere', () => {
    // Prevents orphan pages: a page nothing links to is effectively invisible.
    const linked = linkedPaths();
    for (const route of TOOL_ROUTES) {
      expect(linked, `${route.path} is an orphan page`).toContain(route.path);
    }
  });

  it('gives every public route related links', () => {
    for (const route of PUBLIC_ROUTES) {
      expect(relatedLinksFor(route.path).length, route.path).toBeGreaterThan(0);
    }
  });

  it('never links a page to itself', () => {
    for (const route of PUBLIC_ROUTES) {
      const related = relatedLinksFor(route.path);
      expect(
        related.every((link) => link.path !== route.path),
        `${route.path} links to itself`,
      ).toBe(true);
    }
  });

  it('keeps the related-link count reasonable', () => {
    // Excessive internal linking is itself a quality problem.
    for (const route of PUBLIC_ROUTES) {
      expect(relatedLinksFor(route.path).length, route.path).toBeLessThanOrEqual(6);
    }
  });

  it('only links to real registered routes', () => {
    const valid = new Set<string>(PUBLIC_ROUTES.map((route) => route.path));
    for (const route of PUBLIC_ROUTES) {
      for (const link of relatedLinksFor(route.path)) {
        expect(valid, `${link.path} linked from ${route.path} is not registered`).toContain(
          link.path,
        );
      }
    }
  });
});

describe('structured data', () => {
  it('produces valid JSON', () => {
    const json = buildJsonLd(organizationSchema(), websiteSchema());
    expect(() => JSON.parse(json)).not.toThrow();
  });

  it('sets the schema.org context and a graph', () => {
    const parsed = JSON.parse(buildJsonLd(organizationSchema())) as Record<string, unknown>;
    expect(parsed['@context']).toBe('https://schema.org');
    expect(Array.isArray(parsed['@graph'])).toBe(true);
  });

  it('builds a valid FAQPage', () => {
    const faq = faqSchema([{ question: 'Is it free?', answer: 'Yes.' }]) as Record<string, unknown>;
    expect(faq['@type']).toBe('FAQPage');
    const entities = faq.mainEntity as { '@type': string; acceptedAnswer: unknown }[];
    expect(entities).toHaveLength(1);
    expect(entities[0]?.['@type']).toBe('Question');
  });

  it('builds a BreadcrumbList with sequential positions', () => {
    const crumbs = breadcrumbSchema([
      { name: 'Home', path: '/' },
      { name: 'Tools', path: '/tools' },
      { name: 'URL Shortener', path: '/url-shortener' },
    ]) as Record<string, unknown>;

    const items = crumbs.itemListElement as { position: number; item: string }[];
    expect(items.map((item) => item.position)).toEqual([1, 2, 3]);
    expect(items[0]?.item).toBe('https://zurl.world/');
  });

  it('builds a SoftwareApplication with a free offer', () => {
    const app = softwareApplicationSchema({
      name: 'Zurl URL Shortener',
      description: 'Shortens URLs.',
      path: '/url-shortener',
    }) as Record<string, unknown>;

    expect(app['@type']).toBe('SoftwareApplication');
    expect(app.offers).toMatchObject({ price: '0' });
  });

  it('builds a BlogPosting with dates', () => {
    const posting = blogPostingSchema({
      title: 'Title',
      description: 'Description',
      path: '/blog/slug',
      publishedAt: '2026-01-01',
    }) as Record<string, unknown>;

    expect(posting['@type']).toBe('BlogPosting');
    expect(posting.datePublished).toBe('2026-01-01');
    expect(posting.dateModified).toBe('2026-01-01');
  });

  it('never fabricates ratings, reviews or awards', () => {
    // Inventing these is both dishonest and a structured-data policy violation.
    const json = buildJsonLd(
      organizationSchema(),
      websiteSchema(),
      softwareApplicationSchema({ name: 'X', description: 'Y', path: '/z' }),
      faqSchema([{ question: 'Q', answer: 'A' }]),
    );
    for (const banned of ['aggregateRating', 'reviewCount', 'ratingValue', 'award', 'review']) {
      expect(json, `${banned} must not appear`).not.toContain(banned);
    }
  });
});

describe('blog content', () => {
  const posts = getAllPosts();

  it('has posts', () => {
    expect(posts.length).toBeGreaterThanOrEqual(8);
  });

  it('gives every post a unique slug', () => {
    const slugs = posts.map((post) => post.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it('gives every post complete metadata', () => {
    for (const post of posts) {
      expect(post.title.length, post.slug).toBeGreaterThan(0);
      expect(post.description.length, post.slug).toBeGreaterThan(50);
      expect(post.heading.length, post.slug).toBeGreaterThan(0);
      expect(post.publishedAt, post.slug).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(post.readingMinutes, post.slug).toBeGreaterThan(0);
    }
  });

  it('keeps descriptions within a sensible meta length', () => {
    for (const post of posts) {
      expect(post.description.length, `${post.slug} description too long`).toBeLessThanOrEqual(200);
    }
  });

  it('links every post to at least one tool', () => {
    for (const post of posts) {
      expect(post.relatedTools.length, post.slug).toBeGreaterThan(0);
    }
  });

  it('only references real related posts', () => {
    const slugs = new Set(posts.map((post) => post.slug));
    for (const post of posts) {
      for (const related of post.relatedPosts) {
        expect(slugs, `${post.slug} references unknown post ${related}`).toContain(related);
      }
    }
  });

  it('never references itself as a related post', () => {
    for (const post of posts) {
      expect(post.relatedPosts, post.slug).not.toContain(post.slug);
    }
  });
});

describe('request origin resolution', () => {
  const req = (headers: Record<string, string>) =>
    new Request('http://internal.invalid/api/links', { headers });

  it('prefers the forwarded host set by the proxy', () => {
    expect(
      requestOrigin(req({ 'x-forwarded-host': 'zurl.world', 'x-forwarded-proto': 'https' })),
    ).toBe('https://zurl.world');
  });

  it('ignores a spoofed Host when the proxy set a forwarded host', () => {
    // A caller controls `host`; the platform overwrites `x-forwarded-host`.
    // The forwarded value must win, or an attacker could choose the origin
    // echoed back in the response body.
    expect(
      requestOrigin(
        req({
          host: 'attacker.example',
          'x-forwarded-host': 'zurl.world',
          'x-forwarded-proto': 'https',
        }),
      ),
    ).toBe('https://zurl.world');
  });

  it('assumes https for a non-local host when no proto header is present', () => {
    expect(requestOrigin(req({ host: 'zurl.world' }))).toBe('https://zurl.world');
  });

  it('uses http for localhost so local development works', () => {
    expect(requestOrigin(req({ host: 'localhost:3000' }))).toBe('http://localhost:3000');
  });

  it('builds a short URL against the host the caller actually used', () => {
    expect(
      shortUrlFor(req({ 'x-forwarded-host': 'zurl.world', 'x-forwarded-proto': 'https' }), 'a8K3xPq'),
    ).toBe('https://zurl.world/a8K3xPq');
  });
});
