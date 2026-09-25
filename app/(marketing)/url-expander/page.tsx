import type { Metadata } from 'next';
import Link from 'next/link';
import { ToolPage } from '@/components/marketing/tool-page';
import { UrlExpander } from '@/components/tools/url-expander';
import { buildMetadata } from '@/lib/seo/metadata';
import type { FaqItem } from '@/lib/seo/structured-data';

export const metadata: Metadata = buildMetadata({
  title: 'URL Expander – See Where a Short Link Goes',
  description:
    'Expand a shortened URL to reveal its destination before you open it. Follows the full redirect chain and shows every hop. Free, no account.',
  path: '/url-expander',
});

const FAQS: readonly FaqItem[] = [
  {
    question: 'What does a URL expander do?',
    answer:
      'It resolves a shortened link and shows you the address it points to, without opening the destination page. This lets you judge a link before clicking it.',
  },
  {
    question: 'Does expanding a link open it?',
    answer:
      'No. Zurl requests only the headers of the link, not the page content, and stops as soon as the destination is known. No scripts run and nothing is downloaded.',
  },
  {
    question: 'Which shorteners does this work with?',
    answer:
      'Any service that uses standard HTTP redirects, which is effectively all of them. It also resolves Zurl links directly from our own records, which is why it can tell you when a Zurl link is expired or disabled rather than just failing.',
  },
  {
    question: 'What is a redirect chain?',
    answer:
      'Some links pass through several redirects before reaching the final page — a shortener pointing at another shortener, or a tracking redirect in the middle. The expander shows every hop, so you can see whether a link is taking an unusual route.',
  },
  {
    question: 'Does this tell me whether a link is safe?',
    answer:
      'No, and this matters. It tells you where the link goes, not whether the destination is trustworthy. Zurl does not scan pages for malware or phishing. Seeing a familiar-looking domain is not proof of safety, particularly if it uses unusual characters or many subdomains.',
  },
  {
    question: 'Why did expanding fail?',
    answer:
      'Some sites block automated requests, some are simply offline, and some short links have expired or been removed. Zurl also refuses to follow a chain that points at a private network address, since that would let the tool be used to probe internal systems.',
  },
];

export default function UrlExpanderPage() {
  return (
    <ToolPage
      path="/url-expander"
      breadcrumbLabel="URL Expander"
      heading="URL Expander"
      intro="Paste a shortened link to see where it actually leads. Zurl follows the redirect chain and shows you the destination without opening the page."
      appName="Zurl URL Expander"
      appDescription="Resolves shortened URLs to reveal their destination and the full redirect chain."
      tool={<UrlExpander />}
      faqs={FAQS}
      body={
        <>
          <h2>Why short links need expanding</h2>
          <p>
            A short link deliberately hides its destination. That is useful — it is what makes the
            link short — but it also means you are asked to click something with no information
            about where it goes. Attackers rely on exactly this, which is why shortened links appear
            so often in phishing messages.
          </p>
          <p>
            Expanding the link first restores the information a normal URL would have given you.
          </p>

          <h2>How to read the result</h2>
          <p>
            <strong>Check the domain, carefully.</strong> The destination host is the single most
            important piece of information. Read it character by character —{' '}
            <code>paypa1.com</code> and <code>paypal.com</code> differ by one glyph, and that is a
            deliberate technique.
          </p>
          <p>
            <strong>Look at the chain length.</strong> One or two hops is normal. A link passing
            through five different domains is worth treating with suspicion.
          </p>
          <p>
            <strong>Notice unexpected shorteners in the chain.</strong> A short link pointing at
            another short link is a common way of evading review.
          </p>

          <h2>What this tool cannot tell you</h2>
          <p>
            It resolves addresses. It does not evaluate reputation, and Zurl operates no malware or
            phishing scanner. A link can resolve to a perfectly ordinary-looking domain and still be
            hostile.
          </p>
          <p>
            Context remains the strongest signal. An unexpected link in an unexpected message is
            suspicious regardless of where it resolves, and no expander changes that.
          </p>

          <h2>Inspecting the destination further</h2>
          <p>
            Once you have the full URL, the <Link href="/url-checker">URL checker</Link> breaks it
            into its protocol, host, path and query parameters, and flags patterns like embedded
            credentials, punycode domains and unusual subdomain depth.
          </p>
          <p>
            If a Zurl link is being used for something harmful, please{' '}
            <Link href="/report-abuse">report it</Link> — reports are reviewed and links can be
            disabled.
          </p>
        </>
      }
    />
  );
}
