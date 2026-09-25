import type { MetadataRoute } from 'next';
import { getAllPosts } from '@/content/blog';
import { PUBLIC_ROUTES } from '@/lib/seo/routes';
import { absoluteUrl } from '@/lib/seo/site';

/**
 * sitemap.xml
 *
 * Generated from the route registry plus published blog posts, so a new public
 * page cannot be shipped without appearing here.
 *
 * Individual short links are deliberately excluded. They are utility objects
 * with no unique content, and listing them would invite crawlers to trigger
 * millions of redirects.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const pages = PUBLIC_ROUTES.map((route) => ({
    url: absoluteUrl(route.path),
    lastModified: now,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));

  const posts = getAllPosts().map((post) => ({
    url: absoluteUrl(`/blog/${post.slug}`),
    lastModified: new Date(post.updatedAt ?? post.publishedAt),
    changeFrequency: 'monthly' as const,
    priority: 0.6,
  }));

  return [...pages, ...posts];
}
