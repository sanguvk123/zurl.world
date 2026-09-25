/**
 * Blog content registry.
 *
 * Articles are typed TypeScript modules rather than MDX. That means no MDX
 * toolchain dependency, full type checking on every article's metadata, and
 * internal links that break the build if a target route is removed.
 *
 * Content rule: every article answers a real question properly. Quality over
 * quantity — eight substantial articles, not eighty thin ones.
 */

import type { ReactNode } from 'react';

export type BlogPost = {
  slug: string;
  title: string;
  /** SEO title. Falls back to `title` when omitted. */
  seoTitle?: string;
  description: string;
  /** Rendered as the H1. */
  heading: string;
  publishedAt: string;
  updatedAt?: string;
  readingMinutes: number;
  /** Tool pages this article should link to. */
  relatedTools: readonly { path: string; label: string }[];
  /** Other articles worth reading next. */
  relatedPosts: readonly string[];
  body: () => ReactNode;
};

import { post as howUrlShortenersWork } from './how-do-url-shorteners-work';
import { post as whatIsAUrlShortener } from './what-is-a-url-shortener';
import { post as howToShortenAUrl } from './how-to-shorten-a-url';
import { post as urlVsLinkShortener } from './url-shortener-vs-link-shortener';
import { post as whatIsAShortUrl } from './what-is-a-short-url';
import { post as customShortUrl } from './how-to-create-a-custom-short-url';
import { post as trackLinkClicks } from './how-to-track-link-clicks';
import { post as whatIsAQrCode } from './what-is-a-qr-code';

/** Newest first. */
export const BLOG_POSTS: readonly BlogPost[] = [
  whatIsAUrlShortener,
  howUrlShortenersWork,
  howToShortenAUrl,
  whatIsAShortUrl,
  customShortUrl,
  trackLinkClicks,
  urlVsLinkShortener,
  whatIsAQrCode,
];

export function getAllPosts(): readonly BlogPost[] {
  return BLOG_POSTS;
}

export function getPost(slug: string): BlogPost | undefined {
  return BLOG_POSTS.find((post) => post.slug === slug);
}

export function getRelatedPosts(slugs: readonly string[]): readonly BlogPost[] {
  return slugs
    .map((slug) => getPost(slug))
    .filter((post): post is BlogPost => post !== undefined);
}
