import type { Metadata } from 'next';
import Link from 'next/link';
import { Prose } from '@/components/ui';
import { Breadcrumbs, JsonLd, RelatedTools, Section } from '@/components/marketing/sections';
import { buildMetadata } from '@/lib/seo/metadata';
import { breadcrumbSchema, buildJsonLd } from '@/lib/seo/structured-data';

export const metadata: Metadata = buildMetadata({
  title: 'About Zurl',
  description:
    'Zurl builds simple tools for working with links on the web. What the product does, the principles behind it, and what it deliberately does not do.',
  path: '/about',
});

/**
 * Honesty note: no invented company history, team size, funding, customer count
 * or awards. Only things that are actually true about the product.
 */

export default function AboutPage() {
  const breadcrumbs = [
    { name: 'Home', path: '/' },
    { name: 'About', path: '/about' },
  ];

  return (
    <>
      <JsonLd json={buildJsonLd(breadcrumbSchema(breadcrumbs))} />
      <Breadcrumbs items={breadcrumbs} />

      <Section className="pt-8">
        <h1 className="text-3xl font-semibold tracking-tight text-ink sm:text-4xl">About Zurl</h1>

        <Prose className="mt-6">
          <p>
            Zurl is building simple tools for working with links on the web. The main one is a URL
            shortener; alongside it are a QR code generator, a URL expander, a URL checker and a UTM
            builder.
          </p>

          <h2>What it is for</h2>
          <p>
            Long URLs are awkward to share, impossible to print usefully and hard to measure. A
            short link solves all three, and the tooling around it — QR codes, click analytics,
            campaign tagging — solves the problems that come next.
          </p>
          <p>
            The aim is that the common case takes three seconds and requires nothing: paste a URL,
            get a link, copy it. Everything else stays out of the way until you look for it.
          </p>

          <h2>Principles</h2>
          <p>
            <strong>The free tier is genuinely free.</strong> Links do not expire, clicks are not
            capped, and there are no advertising interstitials between a visitor and your
            destination. Paid tiers, when they exist, will add capabilities rather than take things
            away.
          </p>
          <p>
            <strong>Collect as little as possible.</strong> A URL shortener sits between a person
            and the page they wanted, which makes detailed tracking easy. Zurl deliberately does not
            do it: no visitor IP addresses are stored, no raw user-agent strings, no cookies on
            people who click your links. The{' '}
            <Link href="/privacy">privacy page</Link> sets out exactly what is recorded.
          </p>
          <p>
            <strong>Be honest about limitations.</strong> Zurl does not scan destinations for
            malware or phishing, and does not claim to. Where a safeguard exists it is described
            accurately; where one does not, that is stated plainly.
          </p>
          <p>
            <strong>Redirects should be fast and correct.</strong> A redirect is one indexed
            database lookup, and the click is recorded after the visitor has already been sent on
            their way. Temporary redirects are used rather than permanent ones, so disabling,
            expiring or repointing a link actually takes effect.
          </p>

          <h2>What Zurl does not do</h2>
          <ul>
            <li>
              It does not scan destination pages for malware or phishing. Abuse is handled through{' '}
              <Link href="/report-abuse">reports</Link> and moderation, not automated scanning.
            </li>
            <li>It does not sell data. There is nothing about visitors worth selling.</li>
            <li>It does not track people across links or across sites.</li>
            <li>It does not support custom domains or team accounts yet.</li>
          </ul>

          <h2>Getting in touch</h2>
          <p>
            For questions, bug reports or feature requests, see the{' '}
            <Link href="/contact">contact page</Link>. To report a link being misused, use the{' '}
            <Link href="/report-abuse">abuse report form</Link>.
          </p>
        </Prose>
      </Section>

      <RelatedTools path="/about" />
    </>
  );
}
