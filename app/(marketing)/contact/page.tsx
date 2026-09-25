import type { Metadata } from 'next';
import Link from 'next/link';
import { Prose } from '@/components/ui';
import { Breadcrumbs, JsonLd, RelatedTools, Section } from '@/components/marketing/sections';
import { buildMetadata } from '@/lib/seo/metadata';
import { breadcrumbSchema, buildJsonLd } from '@/lib/seo/structured-data';

export const metadata: Metadata = buildMetadata({
  title: 'Contact',
  description:
    'How to reach Zurl for support, bug reports, privacy requests and abuse reports, and which route is fastest for each.',
  path: '/contact',
});

/**
 * Honesty note: the addresses below are placeholders on the zurl.world domain
 * and must be configured before launch. See README, "Before going live".
 */

const ROUTES = [
  {
    heading: 'Abuse reports',
    body: 'Use the report form — it reaches the moderation queue directly and is much faster than email.',
    href: '/report-abuse',
    hrefLabel: 'Report a link',
  },
  {
    heading: 'Support and bug reports',
    body: 'Problems with a link, the dashboard or the API. Include the short code and what you expected to happen.',
    email: 'support@zurl.world',
  },
  {
    heading: 'Privacy requests',
    body: 'Ask what data is held about you, or request deletion of your account and its links.',
    email: 'privacy@zurl.world',
  },
  {
    heading: 'Security',
    body: 'Report a vulnerability. Please give us reasonable time to fix an issue before disclosing it publicly.',
    email: 'security@zurl.world',
  },
] as const;

export default function ContactPage() {
  const breadcrumbs = [
    { name: 'Home', path: '/' },
    { name: 'Contact', path: '/contact' },
  ];

  return (
    <>
      <JsonLd json={buildJsonLd(breadcrumbSchema(breadcrumbs))} />
      <Breadcrumbs items={breadcrumbs} />

      <Section className="pt-8">
        <h1 className="text-3xl font-semibold tracking-tight text-ink sm:text-4xl">Contact</h1>
        <p className="mt-3 max-w-2xl text-[0.9375rem] leading-7 text-muted">
          Pick the route that matches what you need — it gets to the right place faster.
        </p>

        <ul className="mt-8 max-w-2xl space-y-4">
          {ROUTES.map((route) => (
            <li key={route.heading} className="rounded-lg border border-border bg-surface p-5">
              <h2 className="text-sm font-semibold text-ink">{route.heading}</h2>
              <p className="mt-1.5 text-sm leading-6 text-muted">{route.body}</p>

              {'href' in route ? (
                <Link
                  href={route.href}
                  className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-accent hover:text-accent-hover"
                >
                  {route.hrefLabel}
                  <span aria-hidden="true">→</span>
                </Link>
              ) : (
                <a
                  href={`mailto:${route.email}`}
                  className="mt-2 inline-block font-mono text-sm text-accent hover:text-accent-hover"
                >
                  {route.email}
                </a>
              )}
            </li>
          ))}
        </ul>

        <Prose className="mt-10">
          <h2>Response times</h2>
          <p>
            Abuse reports are prioritised. Other messages are answered as quickly as we can, but
            there is no guaranteed response time and no support SLA — the{' '}
            <Link href="/terms">terms</Link> are explicit about this.
          </p>

          <h2>Things we cannot help with</h2>
          <p>
            We cannot remove content from a destination site, because Zurl does not host it. We can
            disable the short link that points at it; removing the content itself requires
            contacting the site&rsquo;s host.
          </p>
          <p>
            We also cannot recover links created without an account. Anonymous links have nothing
            associating them with you, so there is no way to verify ownership.
          </p>
        </Prose>
      </Section>

      <RelatedTools path="/contact" />
    </>
  );
}
