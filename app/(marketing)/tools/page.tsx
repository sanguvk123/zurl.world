import type { Metadata } from 'next';
import Link from 'next/link';
import { Container } from '@/components/ui';
import { Breadcrumbs, JsonLd, Section } from '@/components/marketing/sections';
import { buildMetadata } from '@/lib/seo/metadata';
import { breadcrumbSchema, buildJsonLd } from '@/lib/seo/structured-data';

export const metadata: Metadata = buildMetadata({
  title: 'Link Tools – Shorteners, QR Codes and URL Utilities',
  description:
    'Every Zurl tool in one place: URL shortener, QR code generator, bulk shortener, URL expander, URL checker, UTM builder and link analytics. All free.',
  path: '/tools',
});

const GROUPS = [
  {
    heading: 'Shortening',
    description: 'Turn long addresses into links people can actually use.',
    tools: [
      {
        path: '/url-shortener',
        label: 'URL Shortener',
        description: 'The main tool. Paste a long URL, get a short link instantly.',
      },
      {
        path: '/short-url',
        label: 'Short URL Generator',
        description: 'The same shortening, framed around how a short URL is built.',
      },
      {
        path: '/link-shortener',
        label: 'Link Shortener',
        description: 'Shortening focused on sharing across social, email and print.',
      },
      {
        path: '/custom-url-shortener',
        label: 'Custom URL Shortener',
        description: 'Choose your own link ending instead of a generated code.',
      },
      {
        path: '/bulk-url-shortener',
        label: 'Bulk URL Shortener',
        description: 'Shorten up to 20 links in one pass and copy the results together.',
      },
      {
        path: '/free-url-shortener',
        label: 'Free URL Shortener',
        description: 'Exactly what is free, and what the limits are.',
      },
    ],
  },
  {
    heading: 'Inspecting',
    description: 'Work out what a link is before you open it.',
    tools: [
      {
        path: '/url-expander',
        label: 'URL Expander',
        description: 'Resolve a short link and see the full redirect chain.',
      },
      {
        path: '/url-checker',
        label: 'URL Checker',
        description: 'Break a URL into its parts and flag disguising patterns.',
      },
    ],
  },
  {
    heading: 'Sharing and measuring',
    description: 'Get links in front of people, and find out what happened.',
    tools: [
      {
        path: '/qr-code-generator',
        label: 'QR Code Generator',
        description: 'Create a scannable code for any URL, as PNG or SVG.',
      },
      {
        path: '/utm-builder',
        label: 'UTM Builder',
        description: 'Build correctly formatted campaign tracking URLs.',
      },
      {
        path: '/link-analytics',
        label: 'Link Analytics',
        description: 'Clicks, countries, referrers and devices, without invasive tracking.',
      },
    ],
  },
] as const;

export default function ToolsPage() {
  const breadcrumbs = [
    { name: 'Home', path: '/' },
    { name: 'Tools', path: '/tools' },
  ];

  return (
    <>
      <JsonLd json={buildJsonLd(breadcrumbSchema(breadcrumbs))} />
      <Breadcrumbs items={breadcrumbs} />

      <Section className="pt-8 pb-10">
        <h1 className="text-3xl font-semibold tracking-tight text-ink sm:text-4xl">Link tools</h1>
        <p className="mt-3 max-w-2xl text-[0.9375rem] leading-7 text-muted">
          Every Zurl tool. All free, all usable without an account except where analytics or custom
          endings require one.
        </p>
      </Section>

      <Container>
        <div className="space-y-12 pb-8">
          {GROUPS.map((group) => (
            <section key={group.heading}>
              <h2 className="text-lg font-semibold tracking-tight text-ink">{group.heading}</h2>
              <p className="mt-1 text-sm text-subtle">{group.description}</p>

              <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {group.tools.map((tool) => (
                  <li key={tool.path}>
                    <Link
                      href={tool.path}
                      className="block h-full rounded-lg border border-border bg-surface p-4 transition-colors hover:border-border-strong hover:bg-surface-raised"
                    >
                      <span className="text-sm font-medium text-ink">{tool.label}</span>
                      <span className="mt-1 block text-sm leading-6 text-subtle">
                        {tool.description}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </Container>

      <Section className="border-t border-border">
        <h2 className="text-lg font-semibold tracking-tight text-ink">Working programmatically?</h2>
        <p className="mt-2 max-w-2xl text-sm leading-7 text-muted">
          The <Link href="/api" className="text-accent underline underline-offset-2 hover:text-accent-hover">API</Link>{' '}
          creates and manages links from your own applications, with API key authentication and
          documented JSON responses.
        </p>
      </Section>
    </>
  );
}
