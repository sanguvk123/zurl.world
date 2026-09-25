import type { Metadata } from 'next';
import Link from 'next/link';
import { ToolPage } from '@/components/marketing/tool-page';
import { UrlChecker } from '@/components/tools/url-checker';
import { buildMetadata } from '@/lib/seo/metadata';
import type { FaqItem } from '@/lib/seo/structured-data';

export const metadata: Metadata = buildMetadata({
  title: 'URL Checker – Inspect Any Link Before You Open It',
  description:
    'Break a URL into its protocol, host, path and parameters. Flags embedded credentials, punycode domains and other patterns used to disguise links. Runs in your browser.',
  path: '/url-checker',
});

const FAQS: readonly FaqItem[] = [
  {
    question: 'Is the URL I paste sent to Zurl?',
    answer:
      'No. The URL checker parses everything in your browser using the built-in URL parser. Nothing is transmitted, logged or stored. That is deliberate — people paste links here precisely because they are unsure about them.',
  },
  {
    question: 'What does it check for?',
    answer:
      'It separates the URL into its components and flags several patterns commonly used to disguise a destination: embedded credentials before the @ sign, punycode domains containing non-ASCII characters, raw IP addresses instead of domain names, unusual subdomain depth, and unencrypted http connections.',
  },
  {
    question: 'What are embedded credentials in a URL?',
    answer:
      'A URL can contain a username and password before the host, as in https://apple.com@evil.example.com/. Everything before the @ is credentials, not the destination — the actual host here is evil.example.com. It reads as a trusted domain at a glance, which is exactly the point. Zurl refuses to shorten URLs containing credentials.',
  },
  {
    question: 'What is a punycode domain?',
    answer:
      'Punycode encodes non-ASCII characters in domain names, producing hostnames beginning xn--. It exists for legitimate internationalised domains, but it also allows characters that look identical to Latin letters, so a domain can be visually indistinguishable from a familiar one while being entirely different.',
  },
  {
    question: 'Does a clean result mean the link is safe?',
    answer:
      'No. This tool analyses structure, not reputation or content. A URL can be perfectly well-formed and still lead somewhere harmful. Zurl does not scan pages for malware or phishing.',
  },
  {
    question: 'Can I check a shortened link here?',
    answer:
      'You can inspect its structure, but the destination stays hidden because a short link contains no information about where it leads. Use the URL expander first to resolve it, then check the result here.',
  },
];

export default function UrlCheckerPage() {
  return (
    <ToolPage
      path="/url-checker"
      breadcrumbLabel="URL Checker"
      heading="URL Checker"
      intro="Paste any link to break it into its parts and see what it is really made of. Everything is parsed in your browser — the URL is never sent to Zurl."
      appName="Zurl URL Checker"
      appDescription="Parses a URL into its components and flags structural patterns used to disguise link destinations."
      tool={<UrlChecker />}
      faqs={FAQS}
      body={
        <>
          <h2>Reading a URL properly</h2>
          <p>
            Most people read a URL left to right and stop at the first recognisable word. That
            instinct is exactly what link-disguising techniques exploit, because the part that
            determines where you actually go is not necessarily the part that catches your eye.
          </p>
          <p>
            The authoritative part is the <strong>host</strong>: the section immediately after{' '}
            <code>://</code> and before the next <code>/</code>. Everything after that first single
            slash is a path on that host and is controlled by whoever runs it.
          </p>

          <h2>Three patterns worth recognising</h2>
          <p>
            <strong>Credentials before the host.</strong> In{' '}
            <code>https://apple.com@evil.example.com/login</code>, the destination is{' '}
            <code>evil.example.com</code>. Everything before the <code>@</code> is a username. The
            familiar name is decoration.
          </p>
          <p>
            <strong>Subdomains that imitate a domain.</strong> In{' '}
            <code>https://apple.com.security-check.example.net/</code>, the real domain is{' '}
            <code>example.net</code>. Read hostnames from the right: the last two labels are what
            matter.
          </p>
          <p>
            <strong>Visually identical characters.</strong> Some non-Latin characters render
            identically to Latin ones. A domain can look exactly like a familiar brand and be a
            completely different registration. The checker flags these as punycode.
          </p>

          <h2>Query parameters</h2>
          <p>
            The checker lists every query parameter separately, which is useful for two reasons.
            Long parameter strings often hide a second URL inside them — a redirect target — and
            reviewing them individually makes that visible. It is also how you confirm that campaign
            tags are present and spelled correctly before sharing a link.
          </p>
          <p>
            If you are adding campaign parameters rather than checking them, the{' '}
            <Link href="/utm-builder">UTM builder</Link> constructs them correctly.
          </p>

          <h2>What structure cannot tell you</h2>
          <p>
            A well-formed URL on a legitimate-looking domain can still be hostile, and an ugly URL
            can be entirely fine. This tool narrows uncertainty; it does not remove it. For
            shortened links, resolve them first with the{' '}
            <Link href="/url-expander">URL expander</Link>.
          </p>
        </>
      }
    />
  );
}
