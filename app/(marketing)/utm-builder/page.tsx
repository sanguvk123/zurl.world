import type { Metadata } from 'next';
import Link from 'next/link';
import { ToolPage } from '@/components/marketing/tool-page';
import { UtmBuilder } from '@/components/tools/utm-builder';
import { buildMetadata } from '@/lib/seo/metadata';
import type { FaqItem } from '@/lib/seo/structured-data';

export const metadata: Metadata = buildMetadata({
  title: 'UTM Builder – Create Campaign Tracking URLs',
  description:
    'Build correctly formatted UTM campaign URLs for Google Analytics and other tools. Free UTM link builder with guidance on naming conventions.',
  path: '/utm-builder',
});

const FAQS: readonly FaqItem[] = [
  {
    question: 'What are UTM parameters?',
    answer:
      'UTM parameters are query values appended to a URL that tell your analytics tool where a visitor came from. They are read by the analytics on the destination site, not by the link itself. The five standard ones are utm_source, utm_medium, utm_campaign, utm_term and utm_content.',
  },
  {
    question: 'Which UTM parameters do I actually need?',
    answer:
      'Source, medium and campaign cover almost every case. Term is only relevant for paid search keywords, and content is for distinguishing two links to the same page within one campaign, such as a header button versus a footer link.',
  },
  {
    question: 'Why does the builder lowercase everything?',
    answer:
      'Analytics tools treat utm_source=Newsletter and utm_source=newsletter as two different sources. Mixed capitalisation quietly splits one campaign across several rows in your reports, and it is difficult to repair afterwards. Lowercasing everything prevents it.',
  },
  {
    question: 'Should I use hyphens or underscores in values?',
    answer:
      'Either works, but pick one and apply it consistently, because spring-sale and spring_sale are different values. Avoid spaces — they become %20 and are awkward to read in reports.',
  },
  {
    question: 'Can I shorten a URL that has UTM parameters?',
    answer:
      'Yes, and this is the usual workflow. Build the campaign URL here, then shorten it. Zurl preserves your query string exactly, including parameter order and duplicates, so the tags reach the destination unchanged.',
  },
  {
    question: 'Do UTM parameters affect SEO?',
    answer:
      'They are for inbound campaign links and are not intended for internal navigation. Using them on links between pages of your own site overwrites the original attribution of the session, making your reports less accurate rather than more.',
  },
];

export default function UtmBuilderPage() {
  return (
    <ToolPage
      path="/utm-builder"
      breadcrumbLabel="UTM Builder"
      heading="UTM Builder"
      intro="Build campaign URLs that your analytics tool can attribute correctly. Fill in the fields below and copy the finished link."
      appName="Zurl UTM Builder"
      appDescription="Builds correctly formatted UTM campaign tracking URLs for web analytics tools."
      tool={<UtmBuilder />}
      faqs={FAQS}
      body={
        <>
          <h2>What each parameter is for</h2>
          <p>
            <strong>utm_source</strong> — the specific origin of the traffic:{' '}
            <code>newsletter</code>, <code>twitter</code>, <code>partner-blog</code>. Answers
            &quot;which property sent this person?&quot;
          </p>
          <p>
            <strong>utm_medium</strong> — the category of channel: <code>email</code>,{' '}
            <code>social</code>, <code>cpc</code>, <code>referral</code>. Answers &quot;what kind of
            marketing was this?&quot;
          </p>
          <p>
            <strong>utm_campaign</strong> — the initiative the link belongs to:{' '}
            <code>spring-sale</code>, <code>product-launch</code>. This is what groups links
            together in reports.
          </p>
          <p>
            <strong>utm_term</strong> — the paid keyword, for search advertising only.
          </p>
          <p>
            <strong>utm_content</strong> — distinguishes variants pointing at the same page in the
            same campaign, such as <code>header-button</code> versus <code>footer-link</code>.
          </p>

          <h2>Consistency matters more than the scheme</h2>
          <p>
            The most common UTM problem is not choosing the wrong values — it is choosing them
            inconsistently. <code>Email</code>, <code>email</code> and <code>e-mail</code> become
            three separate mediums, and the traffic that should be one row in your report is spread
            across three.
          </p>
          <p>
            Write down your conventions before running campaigns: a fixed list of mediums, a naming
            pattern for campaigns, and a rule about hyphens. Keeping that list somewhere shared is
            worth more than any tooling.
          </p>

          <h2>UTM tags and short links together</h2>
          <p>
            These measure different things and work well in combination. A short link counts clicks
            — it knows a redirect was served, regardless of whether the destination has analytics.
            UTM parameters tell the destination&rsquo;s analytics where the visitor came from, so it
            can attribute what they did afterwards.
          </p>
          <p>
            The practical workflow is to build the campaign URL here, then{' '}
            <Link href="/url-shortener">shorten it</Link>. You get a clean link to share, click
            counts from <Link href="/link-analytics">Zurl analytics</Link>, and full attribution in
            your own analytics tool.
          </p>
          <p>
            Shortening also solves the presentation problem: a URL with five UTM parameters is long
            and visibly tagged, which looks worse in a social post and invites people to strip the
            parameters.
          </p>
        </>
      }
    />
  );
}
