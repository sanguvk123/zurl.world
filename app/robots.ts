import type { MetadataRoute } from 'next';
import { DISALLOWED_PREFIXES } from '@/lib/seo/routes';
import { absoluteUrl } from '@/lib/seo/site';

/**
 * robots.txt
 *
 * Private surfaces are disallowed explicitly. Short links themselves are also
 * disallowed: they are utility redirects, not content, and having crawlers
 * walk them would both pollute analytics and waste crawl budget.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [...DISALLOWED_PREFIXES],
      },
    ],
    sitemap: absoluteUrl('/sitemap.xml'),
    host: absoluteUrl('/'),
  };
}
