import type { Metadata } from 'next';
import Link from 'next/link';
import { Container, SectionHeading } from '@/components/ui';
import {
  Faq,
  FeatureGrid,
  FinalCta,
  HowItWorks,
  JsonLd,
  RelatedTools,
  Section,
} from '@/components/marketing/sections';
import { ShortenForm } from '@/components/shortener/shorten-form';
import { AnalyticsPreview } from '@/components/marketing/analytics-preview';
import { buildMetadata } from '@/lib/seo/metadata';
import {
  buildJsonLd,
  faqSchema,
  organizationSchema,
  websiteSchema,
  type FaqItem,
} from '@/lib/seo/structured-data';

export const metadata: Metadata = buildMetadata({
  title: 'Zurl — Free URL Shortener & QR Code Generator',
  description:
    'Shorten long URLs into clean, shareable links in seconds. Free URL shortener with custom links, QR codes and click analytics. No account required.',
  path: '/',
  ogTitle: 'Zurl — Short links. Zero hassle.',
});

const FAQS: readonly FaqItem[] = [
  {
    question: 'What is a URL shortener?',
    answer:
      'A URL shortener converts a long web address into a much shorter one. When someone opens the short link, they are redirected to the original address. Short links are easier to share in messages, social posts, printed material and anywhere character count matters.',
  },
  {
    question: 'How does a URL shortener work?',
    answer:
      'When you shorten a URL, Zurl stores your destination address and assigns it a short code, for example zurl.world/a8K3xPq. Opening that short link looks up the code and sends the browser to the original address with an HTTP redirect. The whole round trip usually takes a few milliseconds.',
  },
  {
    question: 'Is Zurl free?',
    answer:
      'Yes. Shortening links, generating QR codes and using the URL expander, URL checker and UTM builder are all free, and none of them require an account. A free account adds custom links, expiry dates, password protection and click analytics.',
  },
  {
    question: 'How long do Zurl links last?',
    answer:
      'Links do not expire by default — they keep working until you delete them or set an expiry date yourself. If you add an expiry date, the link stops redirecting after that moment and shows an expiry notice instead.',
  },
  {
    question: 'Can I create a custom short URL?',
    answer:
      'Yes, with a free account. Instead of a random code you can choose your own ending, such as zurl.world/spring-sale. Custom links use lowercase letters, numbers, hyphens and underscores, and each one can only be claimed once.',
  },
  {
    question: 'Can I track clicks on my links?',
    answer:
      'Yes, with a free account. Each link has an analytics view showing total clicks, clicks over time, top countries, referring sites, and a device, browser and operating system breakdown. Zurl does not store visitor IP addresses or raw user-agent strings.',
  },
  {
    question: 'Can I create a QR code from a short URL?',
    answer:
      'Yes. Every link you create has a QR button that generates a scannable code you can download as a PNG or SVG. You can also generate a QR code for any URL without shortening it first, using the QR code generator.',
  },
  {
    question: 'Can I use Zurl without an account?',
    answer:
      'Yes. Shortening a URL and generating a QR code both work immediately with no sign-up. An account is only needed if you want to manage your links later, choose custom endings, or see analytics.',
  },
  {
    question: 'Are shortened URLs safe?',
    answer:
      'Short links hide the destination, which is why Zurl only allows http and https addresses, blocks links pointing at private network addresses, and lets anyone report a link for abuse. Zurl does not run malware or phishing scanning, so treat unfamiliar short links with the same caution as any other link. You can use the URL expander to preview where a short link leads before opening it.',
  },
  {
    question: 'Can I delete a shortened URL?',
    answer:
      'Links created while signed in can be disabled or deleted at any time from your dashboard. Disabling keeps the short code reserved but stops the redirect; deleting removes it entirely. Links created anonymously cannot be deleted later, because they are not tied to an account.',
  },
];

const FEATURES = [
  {
    title: 'Instant short links',
    description:
      'Paste a URL and get a short link immediately. No sign-up, no configuration, no waiting.',
  },
  {
    title: 'Custom endings',
    description:
      'Replace the random code with something readable, like zurl.world/spring-sale, so people know what they are clicking.',
  },
  {
    title: 'QR codes built in',
    description:
      'Every link can become a QR code, downloadable as PNG or SVG for print, packaging or slides.',
  },
  {
    title: 'Click analytics',
    description:
      'See total clicks, traffic over time, countries, referrers and device breakdown — without tracking individual people.',
  },
  {
    title: 'Expiry and passwords',
    description:
      'Set a date after which a link stops working, or require a password before the redirect happens.',
  },
  {
    title: 'A real API',
    description:
      'Create and manage links programmatically with API keys, documented request and response shapes, and clear rate limits.',
  },
] as const;

const STEPS = [
  {
    title: 'Paste your long URL',
    description:
      'Drop in any http or https address, however long, including query parameters and campaign tags.',
  },
  {
    title: 'Get your short link',
    description:
      'Zurl generates a short, unique code instantly. Copy it, or open the QR code to share it offline.',
  },
  {
    title: 'Share and track',
    description:
      'Use the link anywhere. Signed in, you can see how many clicks it gets and where they come from.',
  },
] as const;

export default function HomePage() {
  const jsonLd = buildJsonLd(organizationSchema(), websiteSchema(), faqSchema(FAQS));

  return (
    <>
      <JsonLd json={jsonLd} />

      {/* Hero */}
      <section className="pt-16 pb-12 sm:pt-24 sm:pb-16">
        <Container>
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="text-4xl font-semibold tracking-tight text-ink text-balance sm:text-5xl lg:text-[3.5rem] lg:leading-[1.05]">
              Short links. Zero hassle.
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-base leading-7 text-muted text-pretty sm:text-lg">
              Create short, shareable links in seconds. Free, fast, and built for the web.
            </p>
          </div>

          {/* The input is the visual centre of the page. */}
          <div className="mx-auto mt-9 max-w-3xl">
            <ShortenForm autoFocus />
          </div>

          <p className="mt-5 text-center text-sm text-subtle">
            Free to use.{' '}
            <Link
              href="/qr-code-generator"
              className="text-accent underline underline-offset-2 hover:text-accent-hover"
            >
              Create a QR code
            </Link>{' '}
            instead.
          </p>
        </Container>
      </section>

      {/* Example transformation */}
      <Section className="py-0">
        <div className="mx-auto max-w-3xl rounded-xl border border-border bg-surface p-5 sm:p-6">
          <p className="text-2xs font-semibold tracking-widest text-faint uppercase">
            What it looks like
          </p>

          <div className="mt-4 space-y-3">
            <div>
              <p className="text-xs text-subtle">Long URL</p>
              <p className="mt-1 truncate font-mono text-sm text-muted">
                https://example.com/products/spring-collection?utm_source=newsletter&amp;utm_campaign=spring
              </p>
            </div>

            <div className="flex items-center gap-2 text-faint" aria-hidden="true">
              <svg viewBox="0 0 16 16" fill="none" className="h-4 w-4">
                <path
                  d="M8 3v10M4.5 9.5L8 13l3.5-3.5"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <div className="h-px flex-1 bg-border" />
            </div>

            <div>
              <p className="text-xs text-subtle">Short URL</p>
              <p className="mt-1 font-mono text-base font-medium text-accent">zurl.world/a8K3xPq</p>
            </div>
          </div>
        </div>
      </Section>

      <FeatureGrid
        eyebrow="Features"
        title="Everything you need from a link shortener"
        description="The basics work instantly and for free. The rest is there when you need it."
        features={FEATURES}
      />

      <HowItWorks steps={STEPS} />

      {/* Analytics preview */}
      <Section>
        <SectionHeading
          eyebrow="Analytics"
          title="See how your links perform"
          description="Every link gets a simple analytics view. Zurl records where clicks come from and what kind of device they used — never who the visitor is."
        />
        <div className="mt-8">
          <AnalyticsPreview />
        </div>
        <p className="mt-4 text-sm text-subtle">
          Zurl does not store IP addresses or raw user-agent strings.{' '}
          <Link
            href="/privacy"
            className="text-accent underline underline-offset-2 hover:text-accent-hover"
          >
            Read how analytics works
          </Link>
          .
        </p>
      </Section>

      {/* QR + API */}
      <Section className="border-y border-border bg-surface/30">
        <div className="grid gap-10 lg:grid-cols-2">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-ink">
              QR codes for every link
            </h2>
            <p className="mt-3 text-[0.9375rem] leading-7 text-muted">
              Turn any short link into a QR code for posters, packaging, business cards or slides.
              Download it as a PNG for general use, or an SVG that stays sharp at any print size.
            </p>
            <Link
              href="/qr-code-generator"
              className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-accent hover:text-accent-hover"
            >
              Open the QR code generator
              <span aria-hidden="true">→</span>
            </Link>
          </div>

          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-ink">Built for developers</h2>
            <p className="mt-3 text-[0.9375rem] leading-7 text-muted">
              Create links from your own applications with a straightforward REST API, API key
              authentication and predictable JSON responses.
            </p>

            <pre className="mt-4 overflow-x-auto rounded-lg border border-border bg-canvas p-4 font-mono text-xs leading-6 text-muted">
              <code>{`curl -X POST https://zurl.world/api/v1/links \\
  -H "Authorization: Bearer zurl_sk_..." \\
  -H "Content-Type: application/json" \\
  -d '{"url": "https://example.com/page"}'`}</code>
            </pre>

            <Link
              href="/api"
              className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-accent hover:text-accent-hover"
            >
              Read the API documentation
              <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>
      </Section>

      <Faq items={FAQS} />

      {/* SEO content */}
      <Section className="border-t border-border">
        <div className="max-w-2xl">
          <h2 className="text-2xl font-semibold tracking-tight text-ink">
            About short links
          </h2>
          <div className="mt-4 space-y-4 text-[0.9375rem] leading-7 text-muted">
            <p>
              Long URLs are awkward. They wrap across lines in email, get truncated in chat apps,
              eat into character limits on social platforms, and are impossible to read aloud or
              print on anything small. A link shortener solves this by giving a long address a
              short stand-in that redirects to the original.
            </p>
            <p>
              Beyond tidiness, short links are measurable. Because every visit passes through the
              shortener first, you can count clicks and see broad patterns — which country traffic
              comes from, which site referred it, whether people are on mobile or desktop — without
              adding tracking scripts to the destination page.
            </p>
            <p>
              The trade-off is that a short link hides where it goes. That is why Zurl restricts
              destinations to standard web addresses, blocks links that point at private network
              addresses, and provides a{' '}
              <Link
                href="/url-expander"
                className="text-accent underline underline-offset-2 hover:text-accent-hover"
              >
                URL expander
              </Link>{' '}
              so anyone can preview a short link before opening it. If you find a Zurl link being
              misused, you can{' '}
              <Link
                href="/report-abuse"
                className="text-accent underline underline-offset-2 hover:text-accent-hover"
              >
                report it
              </Link>
              .
            </p>
          </div>
        </div>
      </Section>

      <RelatedTools path="/" />

      <FinalCta
        title="Shorten your first link"
        description="No account, no setup. Paste a URL and you will have a short link a second later."
      >
        <ShortenForm compact />
      </FinalCta>
    </>
  );
}
