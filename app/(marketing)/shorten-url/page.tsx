import type { Metadata } from 'next';
import Link from 'next/link';
import { ToolPage } from '@/components/marketing/tool-page';
import { ShortenForm } from '@/components/shortener/shorten-form';
import { buildMetadata } from '@/lib/seo/metadata';
import type { FaqItem } from '@/lib/seo/structured-data';

export const metadata: Metadata = buildMetadata({
  title: 'Shorten a URL – Free, Instant, No Sign-Up',
  description:
    'Shorten any URL in three steps. A practical walkthrough covering copying the full link, avoiding common mistakes, and adding a QR code or expiry date.',
  path: '/shorten-url',
});

/**
 * Intent note: "shorten url" is an action query — people want instructions.
 * This page is structured as a walkthrough with common mistakes, rather than as
 * a feature list.
 */

const FAQS: readonly FaqItem[] = [
  {
    question: 'How do I shorten a URL?',
    answer:
      'Copy the full web address, paste it into the box above, and select Shorten URL. The short link appears immediately and you can copy it with one click. No account is needed.',
  },
  {
    question: 'Do I need to install anything?',
    answer:
      'No. It runs entirely in your browser. There is nothing to install and no extension required.',
  },
  {
    question: 'Why did my URL fail to shorten?',
    answer:
      'Usually because part of the address was missing when it was copied, or because it uses a scheme other than http or https. Links pointing at private addresses such as localhost or 192.168.x.x are also rejected, since they would not work for anyone else.',
  },
  {
    question: 'Should I remove the tracking parameters first?',
    answer:
      'Only if you do not need them. Parameters such as utm_source are read by the destination site to attribute the visit, so removing them loses that attribution. Zurl preserves your query string exactly, so it is safe to leave them in.',
  },
  {
    question: 'Can I shorten a URL on my phone?',
    answer:
      'Yes. The page is designed for one-handed use — the input and button are full width on small screens, and the copy button works in mobile browsers including those that block clipboard access.',
  },
  {
    question: 'How do I test that my short link works?',
    answer:
      'Open it once before sharing. This catches the most common mistake, which is shortening a partially copied URL: the result is still a valid link, so it shortens successfully and simply goes somewhere unintended.',
  },
];

const STEPS = [
  {
    title: 'Copy the full URL',
    description:
      'Select the whole address from your browser bar, including everything after the question mark. A partial copy still shortens successfully but leads somewhere else.',
  },
  {
    title: 'Paste and select Shorten URL',
    description:
      'The short link appears below the input straight away. Use the copy button rather than selecting the text — it includes the https:// prefix that some apps need to make links clickable.',
  },
  {
    title: 'Open it once to check',
    description:
      'A five-second test that catches truncated URLs before you share them with anyone else.',
  },
] as const;

export default function ShortenUrlPage() {
  return (
    <ToolPage
      path="/shorten-url"
      breadcrumbLabel="Shorten a URL"
      heading="Shorten a URL"
      intro="Paste a long web address below and get a short link in one step. Free, instant, and no sign-up required."
      appName="Zurl URL Shortener"
      appDescription="Shortens a long web address into a compact link in a single step."
      tool={<ShortenForm autoFocus />}
      steps={{ title: 'Three steps', items: STEPS }}
      faqs={FAQS}
      body={
        <>
          <h2>Mistakes worth avoiding</h2>
          <p>
            <strong>Copying only part of the URL.</strong> By far the most common problem. Browser
            address bars sometimes visually truncate long URLs, and selecting by dragging can miss
            the end. The result still shortens — it is still a valid address — and quietly points
            somewhere wrong. Opening the short link once before sharing catches this every time.
          </p>
          <p>
            <strong>Shortening a link that is already short.</strong> If the destination is{' '}
            <code>example.com/pricing</code>, shortening it makes the link less informative, not
            more.
          </p>
          <p>
            <strong>Stripping query parameters.</strong> Parameters after the <code>?</code> often
            identify the specific product, page state or campaign. Removing them changes where the
            link goes.
          </p>
          <p>
            <strong>Shortening a private or internal address.</strong> A link to{' '}
            <code>localhost:3000</code> or an internal IP only resolves on your own network, so the
            short link would be useless to anyone else. Zurl rejects these rather than creating a
            link that silently fails.
          </p>

          <h2>Optional extras</h2>
          <p>
            With a free account you can add a{' '}
            <Link href="/custom-url-shortener">custom ending</Link> instead of the generated code,
            set an expiry date so the link stops working at a chosen time, require a password before
            the redirect, and see <Link href="/link-analytics">click analytics</Link>.
          </p>
          <p>
            None of these are required. The core function works without any of them, which is the
            intended default.
          </p>

          <h2>Shortening several links</h2>
          <p>
            For a list, the <Link href="/bulk-url-shortener">bulk URL shortener</Link> takes up to
            20 at a time and returns results you can copy as a batch. For anything automated, use
            the <Link href="/api">API</Link>.
          </p>
        </>
      }
    />
  );
}
