import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Container, Prose } from '@/components/ui';
import { Breadcrumbs, JsonLd, Section } from '@/components/marketing/sections';
import { getAllPosts, getPost, getRelatedPosts } from '@/content/blog';
import { buildMetadata } from '@/lib/seo/metadata';
import { blogPostingSchema, breadcrumbSchema, buildJsonLd } from '@/lib/seo/structured-data';

type Params = { params: Promise<{ slug: string }> };

/** Every article is statically rendered at build time. */
export function generateStaticParams() {
  return getAllPosts().map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const post = getPost(slug);

  if (!post) {
    return { title: 'Article not found', robots: { index: false, follow: false } };
  }

  return buildMetadata({
    title: post.seoTitle ?? post.title,
    description: post.description,
    path: `/blog/${post.slug}`,
    ogTitle: post.title,
    type: 'article',
    publishedTime: post.publishedAt,
    ...(post.updatedAt ? { modifiedTime: post.updatedAt } : {}),
  });
}

export default async function BlogPostPage({ params }: Params) {
  const { slug } = await params;
  const post = getPost(slug);

  if (!post) notFound();

  const related = getRelatedPosts(post.relatedPosts);
  const breadcrumbs = [
    { name: 'Home', path: '/' },
    { name: 'Blog', path: '/blog' },
    { name: post.title, path: `/blog/${post.slug}` },
  ];

  return (
    <>
      <JsonLd
        json={buildJsonLd(
          blogPostingSchema({
            title: post.title,
            description: post.description,
            path: `/blog/${post.slug}`,
            publishedAt: post.publishedAt,
            ...(post.updatedAt ? { updatedAt: post.updatedAt } : {}),
          }),
          breadcrumbSchema(breadcrumbs),
        )}
      />

      <Breadcrumbs items={breadcrumbs} />

      <article>
        <Section className="pt-8 pb-0">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-faint">
            <time dateTime={post.publishedAt}>{formatDate(post.publishedAt)}</time>
            <span aria-hidden="true">·</span>
            <span>{post.readingMinutes} min read</span>
          </div>
          <h1 className="mt-2 max-w-3xl text-3xl font-semibold tracking-tight text-ink text-balance sm:text-4xl">
            {post.heading}
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-muted">{post.description}</p>
        </Section>

        <Section className="pt-8">
          <Prose>{post.body()}</Prose>
        </Section>
      </article>

      <Container>
        <div className="border-t border-border py-10">
          <h2 className="text-sm font-semibold text-ink">Tools mentioned</h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            {post.relatedTools.map((tool) => (
              <li key={tool.path}>
                <Link
                  href={tool.path}
                  className="inline-flex items-center rounded-md border border-border bg-surface px-3 py-1.5 text-sm text-ink transition-colors hover:border-border-strong hover:bg-surface-raised"
                >
                  {tool.label}
                </Link>
              </li>
            ))}
          </ul>

          {related.length > 0 ? (
            <>
              <h2 className="mt-8 text-sm font-semibold text-ink">Read next</h2>
              <ul className="mt-3 space-y-2">
                {related.map((item) => (
                  <li key={item.slug}>
                    <Link
                      href={`/blog/${item.slug}`}
                      className="text-sm text-accent underline underline-offset-2 hover:text-accent-hover"
                    >
                      {item.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </div>
      </Container>
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
