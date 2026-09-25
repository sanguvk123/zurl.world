import type { Metadata } from 'next';
import Link from 'next/link';
import { ToolPage } from '@/components/marketing/tool-page';
import { AnalyticsPreview } from '@/components/marketing/analytics-preview';
import { buildMetadata } from '@/lib/seo/metadata';
import type { FaqItem } from '@/lib/seo/structured-data';

export const metadata: Metadata = buildMetadata({
  title: 'Link Analytics – Track Clicks Without Invasive Tracking',
  description:
    'See total clicks, traffic over time, countries, referrers and devices for every short link. No IP addresses stored, no cross-site tracking, no cookies on visitors.',
  path: '/link-analytics',
});

const FAQS: readonly FaqItem[] = [
  {
    question: 'What does link analytics show?',
    answer:
      'Total clicks, a daily time series, top countries, referring hosts, and a breakdown by device type, browser and operating system, plus the most recent click events. Enough to understand how a link is performing.',
  },
  {
    question: 'Does Zurl store visitor IP addresses?',
    answer:
      'No. The IP address is used momentarily to derive a coarse country and is then discarded. It is never written to the database, which means Zurl cannot reconstruct who visited a link even if asked.',
  },
  {
    question: 'Are cookies set on people who click my links?',
    answer:
      'No. The redirect sets no cookies and includes no tracking script. Zurl only sets a cookie for its own signed-in users, to maintain their session.',
  },
  {
    question: 'Can I see individual visitors?',
    answer:
      'No, and this is a deliberate design limit rather than a missing feature. Zurl records aggregate patterns, not identities. There is no visitor profile, no cross-link tracking and no way to follow one person between links.',
  },
  {
    question: 'Why do my click counts look higher than expected?',
    answer:
      'Automated traffic. Messaging apps, email clients and security scanners fetch links to build previews or check for threats, which registers clicks before any human sees the link. Zurl labels recognisable bots in the device breakdown, but detection depends on how clients identify themselves and is never complete.',
  },
  {
    question: 'Why is so much referrer data "Unknown"?',
    answer:
      'Many clicks legitimately arrive with no referrer — from native apps, email clients, or because of browser privacy settings. A large unknown share is normal and does not indicate a problem.',
  },
  {
    question: 'How long is analytics data kept?',
    answer:
      'Individual click events are retained for 12 months, after which they are removed. The total click count on a link is a running counter and is kept for as long as the link exists.',
  },
  {
    question: 'Can I export the data?',
    answer:
      'Per-link analytics are available through the API for accounts with an API key. A direct CSV export from the dashboard is not implemented yet.',
  },
];

const FEATURES = [
  {
    title: 'Clicks over time',
    description: 'A daily series showing exactly when traffic arrived, so you can see what worked.',
  },
  {
    title: 'Geographic breakdown',
    description: 'Country-level data derived from network routing, not from precise location.',
  },
  {
    title: 'Referring hosts',
    description:
      'Which sites sent visitors. Host only — never the full referring URL, which can contain private paths.',
  },
  {
    title: 'Device, browser and OS',
    description: 'Broad categories, derived and then discarded rather than stored in raw form.',
  },
  {
    title: 'No visitor cookies',
    description: 'The redirect sets nothing on the visitor and loads no tracking script.',
  },
  {
    title: 'Fast redirects regardless',
    description:
      'Analytics is written after the redirect is sent, so recording never delays the visitor.',
  },
] as const;

export default function LinkAnalyticsPage() {
  return (
    <ToolPage
      path="/link-analytics"
      breadcrumbLabel="Link Analytics"
      heading="Link Analytics"
      intro="Every link you create while signed in gets its own analytics view. Enough detail to understand performance, deliberately not enough to identify individual people."
      appName="Zurl Link Analytics"
      appDescription="Privacy-conscious click analytics for short links, showing clicks over time, countries, referrers and device breakdown."
      tool={<AnalyticsPreview />}
      toolNote="Example data, shown to illustrate the interface."
      features={{
        title: 'What you can see',
        items: FEATURES,
      }}
      faqs={FAQS}
      body={
        <>
          <h2>What is recorded, precisely</h2>
          <p>For each click, Zurl stores a row containing:</p>
          <ul>
            <li>the link it belongs to, and a timestamp</li>
            <li>a two-letter country code, and region or city when the network provides one</li>
            <li>
              the referring <em>host</em>, such as <code>example.com</code>
            </li>
            <li>
              three labels derived from the user-agent: device type, browser family and operating
              system
            </li>
          </ul>

          <p>That is the complete list. Specifically not stored:</p>
          <ul>
            <li>
              <strong>IP addresses.</strong> Used transiently to derive the country, then discarded.
            </li>
            <li>
              <strong>Raw user-agent strings.</strong> Detailed enough to fingerprint a device, so
              they are reduced to three labels and dropped.
            </li>
            <li>
              <strong>Full referring URLs.</strong> These can contain search terms and private
              paths. Only the host is kept.
            </li>
            <li>
              <strong>Any visitor identifier.</strong> There is no cookie, no fingerprint and no way
              to link two clicks to the same person.
            </li>
          </ul>

          <h2>Why the limits are the point</h2>
          <p>
            A shortener sits between a person and the page they wanted. That position makes
            comprehensive surveillance technically easy, which is exactly why it is worth
            constraining deliberately.
          </p>
          <p>
            The practical consequence is that Zurl can answer &quot;400 clicks, mostly from India,
            mostly mobile, mostly from Twitter&quot; and cannot answer &quot;who clicked
            this?&quot;. That is enough for the decisions people actually make with link data.
          </p>

          <h2>Reading the data honestly</h2>
          <p>
            <strong>Clicks are not visits.</strong> A click means a redirect was served. The person
            may have closed the tab immediately. Only the destination&rsquo;s own analytics can tell
            you what happened next.
          </p>
          <p>
            <strong>Bots inflate early numbers.</strong> Post a link in a group chat and previews
            are generated within seconds. Treat the first minutes of data with scepticism.
          </p>
          <p>
            <strong>Country data reflects network routing.</strong> VPNs, corporate networks and
            mobile carriers all shift the apparent location. It is directionally useful, not exact.
          </p>

          <h2>Combining with destination analytics</h2>
          <p>
            Link analytics tells you a link was opened. To know what visitors did afterwards, you
            need analytics on the destination, with{' '}
            <Link href="/utm-builder">UTM parameters</Link> to attribute the source. Zurl preserves
            query strings exactly, so both layers work together: Zurl counts the clicks, your
            analytics measures the outcomes.
          </p>
          <p>
            Full details of data handling and retention are on the{' '}
            <Link href="/privacy">privacy page</Link>.
          </p>
        </>
      }
    />
  );
}
