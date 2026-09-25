import type { Metadata } from 'next';
import Link from 'next/link';
import { Badge, ButtonLink, Container } from '@/components/ui';
import { Breadcrumbs, Faq, JsonLd, RelatedTools, Section } from '@/components/marketing/sections';
import { buildMetadata } from '@/lib/seo/metadata';
import { breadcrumbSchema, buildJsonLd, faqSchema, type FaqItem } from '@/lib/seo/structured-data';
import { cn } from '@/lib/utils/cn';

export const metadata: Metadata = buildMetadata({
  title: 'Pricing – Free URL Shortening, Paid Plans for Teams',
  description:
    'Zurl is free for individuals: unlimited links, custom endings, QR codes and analytics. Pro and Business plans are in development for teams and custom domains.',
  path: '/pricing',
});

/**
 * Honesty note: Pro and Business are clearly marked as not yet available. No
 * billing is implemented, and the page does not pretend otherwise.
 */

const TIERS = [
  {
    name: 'Free',
    price: 'Free',
    cadence: 'No card required',
    summary: 'Everything an individual needs. Not a trial.',
    available: true,
    featured: true,
    features: [
      'Unlimited short links',
      'Links never expire unless you set an expiry',
      'Custom link endings',
      'QR codes as PNG and SVG',
      'Click analytics with 12 months of history',
      'Password-protected links',
      'API access, 1,000 links per hour',
      '120 links per hour from the dashboard',
    ],
    cta: { label: 'Create a free account', href: '/signup' },
  },
  {
    name: 'Pro',
    price: 'Not yet available',
    cadence: 'In development',
    summary: 'For people who need a branded domain and deeper reporting.',
    available: false,
    featured: false,
    features: [
      'Everything in Free',
      'Custom domain, such as go.yourcompany.com',
      'Longer analytics retention',
      'CSV export',
      'Higher API limits',
    ],
    cta: null,
  },
  {
    name: 'Business',
    price: 'Not yet available',
    cadence: 'In development',
    summary: 'For teams sharing a link workspace.',
    available: false,
    featured: false,
    features: [
      'Everything in Pro',
      'Multiple team members',
      'Shared link workspace',
      'Role-based access',
      'Multiple custom domains',
    ],
    cta: null,
  },
] as const;

const FAQS: readonly FaqItem[] = [
  {
    question: 'Is the free plan a trial?',
    answer:
      'No. It has no time limit and no card requirement. Links created on the free plan do not expire, are not deleted for inactivity, and do not stop working if paid plans launch later.',
  },
  {
    question: 'Can I buy Pro or Business today?',
    answer:
      'No. Neither is available yet and no billing is implemented. They are listed here so the intended direction is clear, not to take payment.',
  },
  {
    question: 'Will features move from Free to paid?',
    answer:
      'That is not the plan. Paid tiers are intended to add capabilities that cost real money to provide — custom domains, team access, longer retention — rather than to restrict what is currently free.',
  },
  {
    question: 'What are the rate limits on the free plan?',
    answer:
      'Anonymous use allows 10 links per hour per network address. A free account allows 120 per hour from the dashboard and 1,000 per hour through the API. These exist to prevent automated abuse, not to encourage upgrades.',
  },
  {
    question: 'Is there a limit on clicks?',
    answer:
      'No. Links can be opened any number of times, on any plan, without throttling.',
  },
  {
    question: 'Do you show ads on redirects?',
    answer:
      'No. Links redirect directly to your destination with no interstitial page, on every plan.',
  },
];

export default function PricingPage() {
  const breadcrumbs = [
    { name: 'Home', path: '/' },
    { name: 'Pricing', path: '/pricing' },
  ];

  return (
    <>
      <JsonLd json={buildJsonLd(faqSchema(FAQS), breadcrumbSchema(breadcrumbs))} />
      <Breadcrumbs items={breadcrumbs} />

      <Section className="pt-8 pb-10">
        <h1 className="text-3xl font-semibold tracking-tight text-ink sm:text-4xl">Pricing</h1>
        <p className="mt-3 max-w-2xl text-[0.9375rem] leading-7 text-muted">
          Zurl is free for individual use, and that is not a trial. Paid tiers are in development
          for teams and custom domains — they are listed below so the direction is clear, but
          neither can be purchased yet.
        </p>
      </Section>

      <Container>
        <div className="grid gap-4 lg:grid-cols-3">
          {TIERS.map((tier) => (
            <div
              key={tier.name}
              className={cn(
                'flex flex-col rounded-xl border p-6',
                tier.featured ? 'border-accent/40 bg-surface' : 'border-border bg-surface/50',
              )}
            >
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-ink">{tier.name}</h2>
                {!tier.available ? <Badge tone="neutral">Coming later</Badge> : null}
              </div>

              <p className="mt-3 text-2xl font-semibold text-ink">{tier.price}</p>
              <p className="text-xs text-subtle">{tier.cadence}</p>
              <p className="mt-3 text-sm leading-6 text-muted">{tier.summary}</p>

              <ul className="mt-5 flex-1 space-y-2">
                {tier.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-sm text-muted">
                    <svg
                      viewBox="0 0 16 16"
                      fill="none"
                      aria-hidden="true"
                      className={cn(
                        'mt-1 h-3 w-3 shrink-0',
                        tier.available ? 'text-accent' : 'text-faint',
                      )}
                    >
                      <path
                        d="M13 4.5L6.5 11 3 7.5"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              {tier.cta ? (
                <ButtonLink
                  href={tier.cta.href}
                  variant={tier.featured ? 'primary' : 'secondary'}
                  className="mt-6 w-full"
                >
                  {tier.cta.label}
                </ButtonLink>
              ) : (
                <p className="mt-6 text-center text-xs text-faint">Not available yet</p>
              )}
            </div>
          ))}
        </div>

        <p className="mt-6 text-sm text-subtle">
          You do not need an account at all to shorten a link or make a QR code — try the{' '}
          <Link
            href="/url-shortener"
            className="text-accent underline underline-offset-2 hover:text-accent-hover"
          >
            URL shortener
          </Link>{' '}
          first.
        </p>
      </Container>

      <Faq items={FAQS} />
      <RelatedTools path="/pricing" />
    </>
  );
}
