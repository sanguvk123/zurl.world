import type { Metadata } from 'next';
import Link from 'next/link';
import { ToolPage } from '@/components/marketing/tool-page';
import { BulkShortener } from '@/components/tools/bulk-shortener';
import { buildMetadata } from '@/lib/seo/metadata';
import type { FaqItem } from '@/lib/seo/structured-data';

export const metadata: Metadata = buildMetadata({
  title: 'Bulk URL Shortener – Shorten Multiple Links at Once',
  description:
    'Paste a list of URLs and shorten them all in one go. Free bulk link shortener, up to 20 URLs at a time, with results you can copy as a batch.',
  path: '/bulk-url-shortener',
});

const FAQS: readonly FaqItem[] = [
  {
    question: 'How many URLs can I shorten at once?',
    answer:
      'Up to 20 per batch. Anonymous use is additionally limited to 10 links per hour, so a signed-in account is needed for repeated batches. For larger or automated workloads, the API is the right tool.',
  },
  {
    question: 'What format should my list be in?',
    answer:
      'One URL per line, or separated by commas. Blank lines are ignored. Each URL is validated individually, so one bad entry does not stop the rest.',
  },
  {
    question: 'What happens if one URL fails?',
    answer:
      'That row shows the reason and the others continue. Common causes are a missing protocol, a typo, or a destination that points at a private network address.',
  },
  {
    question: 'Can I assign custom endings in bulk?',
    answer:
      'No. Custom endings have to be chosen individually because each one has to be unique and checked against reserved names. Create those one at a time with the custom URL shortener.',
  },
  {
    question: 'Can I download the results?',
    answer:
      'Use "Copy all" to copy every short link as a newline-separated list, which pastes directly into a spreadsheet column. For structured output, the API returns JSON.',
  },
  {
    question: 'Why does it process links one at a time?',
    answer:
      'Sequential submission means every link goes through the same validation as a single create, and a batch does not arrive as a burst that would trip rate limiting. The small delay between requests is intentional.',
  },
];

export default function BulkUrlShortenerPage() {
  return (
    <ToolPage
      path="/bulk-url-shortener"
      breadcrumbLabel="Bulk URL Shortener"
      heading="Bulk URL Shortener"
      intro="Shorten a list of links in one pass. Paste your URLs below, one per line, and copy the results as a batch when they are done."
      appName="Zurl Bulk URL Shortener"
      appDescription="Shortens multiple URLs in a single batch, with per-link validation and copyable results."
      tool={<BulkShortener />}
      faqs={FAQS}
      body={
        <>
          <h2>When bulk shortening is the right approach</h2>
          <p>
            Bulk shortening suits a defined, one-off list: every product in a catalogue export,
            every link in a newsletter draft, or a set of channel-specific links for one campaign.
            You paste the list, get the results, and paste them into a spreadsheet.
          </p>
          <p>
            It is the wrong approach for anything recurring or programmatic. If links need creating
            whenever a record appears in your system, that belongs in the{' '}
            <Link href="/api">API</Link>, where you get structured responses, error handling and
            higher rate limits.
          </p>

          <h2>Preparing your list</h2>
          <p>
            Include the full URL with its protocol. <code>https://example.com/page</code> is
            unambiguous; <code>example.com/page</code> will be accepted with an assumed{' '}
            <code>https</code>, which is usually right but not always.
          </p>
          <p>
            Keep query strings intact. If your URLs already carry campaign parameters, they pass
            through to the destination unchanged, so tagged links stay tagged. If you need to add
            those parameters first, the <Link href="/utm-builder">UTM builder</Link> handles the
            formatting.
          </p>
          <p>
            Check for duplicates before submitting. Each submission creates a new short link, so the
            same URL submitted twice produces two distinct codes with separate click counts — which
            is occasionally what you want, and usually not.
          </p>

          <h2>After the batch</h2>
          <p>
            Signed in, every link from a batch appears in your dashboard where you can add titles,
            set expiry dates, and see click counts per link. Adding a title at that point is worth
            the effort: twenty random codes in a list are indistinguishable a week later.
          </p>
          <p>
            Created anonymously, the links work permanently but cannot be edited or deleted
            afterwards, because nothing associates them with you.
          </p>
        </>
      }
    />
  );
}
