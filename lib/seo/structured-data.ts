/**
 * Schema.org JSON-LD builders.
 *
 * Only schemas that genuinely describe the page are emitted. In particular
 * there are no `aggregateRating`, `review` or `award` properties anywhere:
 * Zurl has no ratings to report, and inventing them is both dishonest and a
 * structured-data policy violation.
 */

import { SITE, absoluteUrl } from './site';

type JsonLd = Record<string, unknown>;

const ORGANIZATION_ID = absoluteUrl('/#organization');
const WEBSITE_ID = absoluteUrl('/#website');

export function organizationSchema(): JsonLd {
  return {
    '@type': 'Organization',
    '@id': ORGANIZATION_ID,
    name: SITE.name,
    url: absoluteUrl('/'),
    description: SITE.description,
    logo: {
      '@type': 'ImageObject',
      url: absoluteUrl('/icon.svg'),
    },
  };
}

export function websiteSchema(): JsonLd {
  return {
    '@type': 'WebSite',
    '@id': WEBSITE_ID,
    name: SITE.name,
    url: absoluteUrl('/'),
    description: SITE.description,
    publisher: { '@id': ORGANIZATION_ID },
    inLanguage: 'en',
  };
}

/**
 * SoftwareApplication for tool pages.
 *
 * `offers` at price 0 is accurate — the free tier genuinely requires no
 * payment and no account.
 */
export function softwareApplicationSchema(input: {
  name: string;
  description: string;
  path: string;
}): JsonLd {
  return {
    '@type': 'SoftwareApplication',
    name: input.name,
    description: input.description,
    url: absoluteUrl(input.path),
    applicationCategory: 'UtilitiesApplication',
    operatingSystem: 'Any',
    browserRequirements: 'Requires JavaScript for interactive features.',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
    publisher: { '@id': ORGANIZATION_ID },
  };
}

export type FaqItem = { question: string; answer: string };

/**
 * FAQPage.
 *
 * Only call this when the questions and answers are actually rendered on the
 * page — marking up invisible content is a policy violation.
 */
export function faqSchema(items: readonly FaqItem[]): JsonLd {
  return {
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: { '@type': 'Answer', text: item.answer },
    })),
  };
}

export type Breadcrumb = { name: string; path: string };

export function breadcrumbSchema(items: readonly Breadcrumb[]): JsonLd {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

export function blogPostingSchema(input: {
  title: string;
  description: string;
  path: string;
  publishedAt: string;
  updatedAt?: string;
}): JsonLd {
  return {
    '@type': 'BlogPosting',
    headline: input.title,
    description: input.description,
    url: absoluteUrl(input.path),
    datePublished: input.publishedAt,
    dateModified: input.updatedAt ?? input.publishedAt,
    // Author is the organisation: no fictional bylines.
    author: { '@id': ORGANIZATION_ID },
    publisher: { '@id': ORGANIZATION_ID },
    mainEntityOfPage: { '@type': 'WebPage', '@id': absoluteUrl(input.path) },
    inLanguage: 'en',
  };
}

/**
 * Wraps schemas in a single `@graph` document.
 * One script tag per page keeps the payload small and avoids duplicate nodes.
 */
export function buildJsonLd(...schemas: JsonLd[]): string {
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@graph': schemas,
  });
}
