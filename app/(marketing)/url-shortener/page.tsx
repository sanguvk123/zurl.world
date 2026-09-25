import type { Metadata } from 'next';
import Link from 'next/link';
import { ToolPage } from '@/components/marketing/tool-page';
import { ShortenForm } from '@/components/shortener/shorten-form';
import { buildMetadata } from '@/lib/seo/metadata';
import type { FaqItem } from '@/lib/seo/structured-data';

export const metadata: Metadata = buildMetadata({
  title: 'URL Shortener – Create Short Links Free',
  description:
    'Free URL shortener. Paste a long link and get a short, shareable URL instantly — with optional custom endings, QR codes and click analytics. No account required.',
  path: '/url-shortener',
  ogTitle: 'Free URL Shortener — Zurl',
});

const FAQS: readonly FaqItem[] = [
  {
    question: 'Is this URL shortener really free?',
    answer:
      'Yes. Shortening links is free with no account and no usage cost. A free account adds custom endings, expiry dates, password protection and click analytics. There is no paid tier required for ordinary use.',
  },
  {
    question: 'Do I need an account to shorten a URL?',
    answer:
      'No. Paste a URL and select Shorten URL — the link is created immediately. An account is only needed if you want to manage links afterwards or see how many clicks they receive.',
  },
  {
    question: 'How long is a Zurl short link?',
    answer:
      'A generated link is 26 characters in total, such as https://zurl.world/a8K3xPq. The code itself is seven characters drawn from an alphabet that excludes easily confused characters like 0, O, 1 and l.',
  },
  {
    question: 'Do shortened links expire?',
    answer:
      'Not by default. A link keeps working until you delete it. You can optionally set an expiry date, after which visitors see an expiry notice instead of being redirected.',
  },
  {
    question: 'What kinds of URLs can I shorten?',
    answer:
      'Any standard http or https web address, up to 2,048 characters, including query strings and campaign parameters. Other schemes such as javascript:, data: and file: are rejected, as are links pointing at private network addresses like localhost or 192.168.x.x.',
  },
  {
    question: 'Will shortening change my tracking parameters?',
    answer:
      'No. Your query string is preserved exactly as you supplied it, including parameter order and any duplicates. UTM tags and other campaign parameters reach the destination unchanged.',
  },
  {
    question: 'Is there a limit on how many links I can create?',
    answer:
      'Anonymous use is limited to 10 links per hour per network address to prevent automated abuse. A free account raises this to 120 per hour, and API keys have their own higher limit.',
  },
  {
    question: 'Can I see who clicked my link?',
    answer:
      'You can see how many clicks a link received and broad patterns — country, referring site, device type, browser and operating system. You cannot see individual people: Zurl does not store IP addresses or raw user-agent strings.',
  },
];

const FEATURES = [
  {
    title: 'Works instantly',
    description:
      'Paste and shorten. No sign-up step, no email verification, no configuration before your first link.',
  },
  {
    title: 'Links that last',
    description:
      'No automatic expiry and no deletion of inactive links. Your short link keeps working until you remove it.',
  },
  {
    title: 'Readable codes',
    description:
      'Generated codes exclude characters people misread, so a link copied from print or read aloud still resolves.',
  },
  {
    title: 'Custom endings',
    description:
      'Swap the random code for something meaningful, like zurl.world/spring-sale, with a free account.',
  },
  {
    title: 'QR code for every link',
    description:
      'Turn any short link into a downloadable QR code in PNG or SVG, ready for print or screens.',
  },
  {
    title: 'Privacy-conscious analytics',
    description:
      'Track clicks, countries and devices without storing IP addresses or raw user-agent strings.',
  },
] as const;

const STEPS = [
  {
    title: 'Paste your long URL',
    description: 'Any http or https address, including query strings and campaign parameters.',
  },
  {
    title: 'Select Shorten URL',
    description: 'Your short link is generated immediately and appears below the input.',
  },
  {
    title: 'Copy and share it',
    description: 'Use the copy button, or open the QR code to share the link offline.',
  },
] as const;

export default function UrlShortenerPage() {
  return (
    <ToolPage
      path="/url-shortener"
      breadcrumbLabel="URL Shortener"
      heading="Free URL Shortener"
      intro="Turn long, unwieldy web addresses into short links you can share anywhere. Paste a URL below and get a short link in a second — no account, no cost, no expiry."
      appName="Zurl URL Shortener"
      appDescription="Free tool for converting long URLs into short, shareable links with optional custom endings, QR codes and click analytics."
      tool={<ShortenForm autoFocus />}
      toolNote={
        <>
          Need many links at once? Use the{' '}
          <Link
            href="/bulk-url-shortener"
            className="text-accent underline underline-offset-2 hover:text-accent-hover"
          >
            bulk URL shortener
          </Link>
          .
        </>
      }
      features={{
        title: 'What you get',
        description:
          'The core function is free and instant. Everything else is optional and stays out of the way until you need it.',
        items: FEATURES,
      }}
      steps={{ items: STEPS }}
      faqs={FAQS}
      body={
        <>
          <h2>When a short URL is the right choice</h2>
          <p>
            Shortening is worth it whenever the address will be seen, typed or counted by a human.
            That covers social posts where characters are limited, printed material where a long URL
            is impossible to transcribe, presentations where the link needs to be readable from the
            back of a room, and any campaign where you want to know how many people clicked.
          </p>
          <p>
            It is not worth it when the destination is already short and descriptive. A link to{' '}
            <code>example.com/pricing</code> communicates more than any short code, and adding a
            redirect there gains nothing.
          </p>

          <h2>What happens when someone opens your link</h2>
          <p>
            Zurl looks up the short code with a single indexed database query, checks that the link
            is active and not expired, and sends the browser to your destination with an HTTP
            redirect. The click is recorded after the redirect has already been issued, so the
            visitor never waits for analytics to be written.
          </p>
          <p>
            Zurl uses a temporary redirect rather than a permanent one. A permanent redirect is
            cached by browsers indefinitely, which would mean that disabling a link, changing its
            destination or letting it expire silently fails for anyone who already visited it.
            Correct behaviour is worth one extra round trip.
          </p>

          <h2>Safety and shortened links</h2>
          <p>
            Short links hide where they lead, which is genuinely useful and genuinely exploitable.
            Zurl limits the damage in several ways: only <code>http</code> and <code>https</code>{' '}
            destinations are accepted, links pointing at private or internal network addresses are
            rejected, URLs containing embedded credentials are refused, and anyone can{' '}
            <Link href="/report-abuse">report a link</Link> for review.
          </p>
          <p>
            To be explicit about the limits: Zurl does not scan destinations for malware or
            phishing. If you want to see where an unfamiliar short link goes before opening it, the{' '}
            <Link href="/url-expander">URL expander</Link> resolves it and shows you the
            destination.
          </p>

          <h2>Related terms</h2>
          <p>
            &quot;URL shortener&quot;, &quot;<Link href="/link-shortener">link shortener</Link>
            &quot; and &quot;<Link href="/short-url">short URL generator</Link>&quot; all describe
            this same tool — the wording differs, the function does not. A{' '}
            <Link href="/custom-url-shortener">custom URL shortener</Link> is meaningfully
            different: it lets you choose the ending rather than accepting a generated code.
          </p>
        </>
      }
    />
  );
}
