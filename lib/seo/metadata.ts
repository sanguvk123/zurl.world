/**
 * Metadata builders.
 *
 * Every public route calls `buildMetadata`; no route hand-writes an OG tag.
 * That guarantees canonical URLs are absolute and consistent, and makes it
 * impossible to ship a page missing Open Graph or Twitter metadata.
 */

import type { Metadata } from 'next';
import { SITE, absoluteUrl } from './site';

export type PageMetadataInput = {
  title: string;
  description: string;
  /** Site-relative path, e.g. `/url-shortener`. Becomes the canonical URL. */
  path: string;
  /** Overrides the OG title when the SEO title is awkward as a social headline. */
  ogTitle?: string;
  ogDescription?: string;
  /** Set false for pages that must not be indexed. */
  index?: boolean;
  type?: 'website' | 'article';
  publishedTime?: string;
  modifiedTime?: string;
  /**
   * Only supply when the terms genuinely describe the page. Most search
   * engines ignore this, so it is used sparingly rather than stuffed.
   */
  keywords?: readonly string[];
};

/** OG image is generated at `/opengraph-image`, so every page has a real card. */
function ogImage(): { url: string; width: number; height: number; alt: string } {
  return {
    url: absoluteUrl('/opengraph-image'),
    width: 1200,
    height: 630,
    alt: `${SITE.name} — ${SITE.tagline}`,
  };
}

export function buildMetadata(input: PageMetadataInput): Metadata {
  const canonical = absoluteUrl(input.path);
  const index = input.index ?? true;
  const image = ogImage();

  return {
    title: input.title,
    description: input.description,
    ...(input.keywords?.length ? { keywords: [...input.keywords] } : {}),

    alternates: { canonical },

    // Explicit on every page: an accidental noindex on a public page is one of
    // the most damaging SEO mistakes, so it is never left to a default.
    robots: index
      ? {
          index: true,
          follow: true,
          googleBot: {
            index: true,
            follow: true,
            'max-image-preview': 'large',
            'max-snippet': -1,
            'max-video-preview': -1,
          },
        }
      : { index: false, follow: false, nocache: true },

    openGraph: {
      type: input.type ?? 'website',
      siteName: SITE.name,
      locale: SITE.locale,
      url: canonical,
      title: input.ogTitle ?? input.title,
      description: input.ogDescription ?? input.description,
      images: [image],
      ...(input.publishedTime ? { publishedTime: input.publishedTime } : {}),
      ...(input.modifiedTime ? { modifiedTime: input.modifiedTime } : {}),
    },

    twitter: {
      card: 'summary_large_image',
      site: SITE.twitter,
      creator: SITE.twitter,
      title: input.ogTitle ?? input.title,
      description: input.ogDescription ?? input.description,
      images: [image.url],
    },
  };
}

/** Metadata for private pages: always noindex, nofollow. */
export function buildPrivateMetadata(title: string, description?: string): Metadata {
  return {
    title,
    ...(description ? { description } : {}),
    robots: { index: false, follow: false, nocache: true },
  };
}
