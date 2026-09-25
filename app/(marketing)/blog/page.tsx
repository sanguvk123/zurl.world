import type { Metadata } from 'next';
import Link from 'next/link';
import { Container } from '@/components/ui';
import { Breadcrumbs, JsonLd, RelatedTools, Section } from '@/components/marketing/sections';
import { getAllPosts } from '@/content/blog';
import { buildMetadata } from '@/lib/seo/metadata';
import { breadcrumbSchema, buildJsonLd } from '@/lib/seo/structured-data';

export const metadata: Metadata = buildMetadata({
  title: 'Blog — Guides to Links, Short URLs and QR Codes',
  description:
    'Practical guides on URL shorteners, short links, custom aliases, click tracking and QR codes. Written to answer the question, not to fill a page.',
  path: '/blog',
});

export default function BlogIndexPage() {
  const posts = getAllPosts();

  return (
    <>
      <JsonLd
        json={buildJsonLd(
          breadcrumbSchema([
            { name: 'Home', path: '/' },
            { name: 'Blog', path: '/blog' },
          ]),
        )}
      />

      <Breadcrumbs
        items={[
          { name: 'Home', path: '/' },
          { name: 'Blog', path: '/blog' },
        ]}
      />

      <Section className="pt-8 pb-10">
        <h1 className="text-3xl font-semibold tracking-tight text-ink sm:text-4xl">Blog</h1>
        <p className="mt-3 max-w-2xl text-[0.9375rem] leading-7 text-muted">
          Guides on shortening URLs, tracking clicks and making QR codes that actually scan.
        </p>
      </Section>

      <Container>
        <ul className="divide-y divide-border border-y border-border">
          {posts.map((post) => (
            <li key={post.slug}>
              <article>
                <Link
                  href={`/blog/${post.slug}`}
                  className="group block py-6 transition-colors hover:bg-surface/40"
                >
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-faint">
                    <time dateTime={post.publishedAt}>{formatDate(post.publishedAt)}</time>
                    <span aria-hidden="true">·</span>
                    <span>{post.readingMinutes} min read</span>
                  </div>
                  <h2 className="mt-1.5 text-lg font-semibold tracking-tight text-ink group-hover:text-accent">
                    {post.title}
                  </h2>
                  <p className="mt-1.5 max-w-2xl text-sm leading-6 text-muted">
                    {post.description}
                  </p>
                </Link>
              </article>
            </li>
          ))}
        </ul>
      </Container>

      <RelatedTools path="/blog" />
    </>
  );
}

function formatDate(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-GB', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  });
}
