import type { Metadata } from 'next';
import Link from 'next/link';
import { ToolPage } from '@/components/marketing/tool-page';
import { ShortenForm } from '@/components/shortener/shorten-form';
import { buildMetadata } from '@/lib/seo/metadata';
import type { FaqItem } from '@/lib/seo/structured-data';

export const metadata: Metadata = buildMetadata({
  title: 'Link Shortener – Shorten Any URL',
  description:
    'Shorten links for social posts, email, print and messaging. Free link shortener with QR codes, custom endings and click tracking. No account needed.',
  path: '/link-shortener',
});

/**
 * Intent note: "link shortener" skews to marketing and social-sharing use
 * cases, so this page is organised around *where the link will be shared*
 * rather than around the mechanics.
 */

const FAQS: readonly FaqItem[] = [
  {
    question: 'Is a link shortener the same as a URL shortener?',
    answer:
      'Yes. The two terms describe the same tool. "URL" is the technical name for a web address and "link" is what most people call it, so both phrases are widely used and both return the same kind of service.',
  },
  {
    question: 'Which platforms benefit most from shortened links?',
    answer:
      'Anywhere characters are limited or links are read by humans: social posts, SMS, printed material, presentation slides, podcast show notes and packaging. Shortened links also help in email, where long URLs wrap across lines and can break when clicked.',
  },
  {
    question: 'Can I use one short link across several channels?',
    answer:
      'You can, but separate links per channel are more useful. Create one link for your newsletter and another for social, both pointing at the same page, and each accumulates its own click count so you can compare channels directly.',
  },
  {
    question: 'Do shortened links work in every app?',
    answer:
      'Yes. A short link is an ordinary https web address, so anything that handles links handles these. Some messaging apps fetch the link first to build a preview, which can register clicks before a human opens it.',
  },
  {
    question: 'Will a shortened link hurt my SEO?',
    answer:
      'Not for sharing and distribution, which is what short links are for. Do not use short links as the canonical address of your own pages — your real URLs should be the ones search engines index. A redirect passes visitors through to the destination correctly.',
  },
  {
    question: 'Can I change where a link points after sharing it?',
    answer:
      'Yes, for links created while signed in. The short code stays the same and the destination is updated, which is particularly useful for links printed on material you cannot easily reissue.',
  },
];

const FEATURES = [
  {
    title: 'Fits any character limit',
    description: 'A 26-character link leaves room for your actual message in posts and SMS.',
  },
  {
    title: 'Readable in print',
    description:
      'Short enough to typeset on a flyer or business card, and typable without errors.',
  },
  {
    title: 'QR code included',
    description:
      'Pair any link with a scannable code so people do not have to type anything at all.',
  },
  {
    title: 'Per-channel measurement',
    description:
      'Create a separate link per channel and compare click counts directly, with no tagging required.',
  },
  {
    title: 'Editable destination',
    description:
      'Repoint a link after it is published, without reprinting or reposting anything.',
  },
  {
    title: 'Campaign tags preserved',
    description:
      'UTM parameters pass through untouched, so your destination analytics keeps working.',
  },
] as const;

const STEPS = [
  {
    title: 'Pick the destination',
    description: 'Copy the full URL of the page you want people to land on, parameters included.',
  },
  {
    title: 'Create one link per channel',
    description:
      'Shorten it once for each place you will share it, so each channel gets its own click count.',
  },
  {
    title: 'Share and compare',
    description: 'Post the links, then compare their performance in your dashboard.',
  },
] as const;

export default function LinkShortenerPage() {
  return (
    <ToolPage
      path="/link-shortener"
      breadcrumbLabel="Link Shortener"
      heading="Link Shortener"
      intro="Shorten any link for social posts, email, print or messaging. Free, instant, and no account required to start."
      appName="Zurl Link Shortener"
      appDescription="Shortens web links for sharing across social media, email, messaging and print."
      tool={<ShortenForm autoFocus />}
      features={{
        title: 'Built for sharing',
        description: 'The things that matter when a link leaves your screen and goes somewhere public.',
        items: FEATURES,
      }}
      steps={{ title: 'Using links across channels', items: STEPS }}
      faqs={FAQS}
      body={
        <>
          <h2>Where shortened links earn their place</h2>
          <p>
            <strong>Social posts.</strong> Platforms count characters, and a long URL can consume
            most of a post. A short link leaves room for the message and looks intentional rather
            than pasted.
          </p>
          <p>
            <strong>Email and newsletters.</strong> Long URLs wrap across lines in plain-text email,
            and a wrapped URL frequently breaks when clicked. A short link fits on one line.
          </p>
          <p>
            <strong>Print.</strong> Nobody types a 150-character URL from a page. A short link is
            realistic to transcribe, and a{' '}
            <Link href="/qr-code-generator">QR code</Link> removes the typing entirely.
          </p>
          <p>
            <strong>Spoken contexts.</strong> Podcasts and presentations need something a listener
            can hold in their head. A{' '}
            <Link href="/custom-url-shortener">custom ending</Link> helps considerably here.
          </p>

          <h2>One link per channel</h2>
          <p>
            The most useful habit when using a link shortener for marketing is to create a distinct
            short link for each place you share. Three links to the same page — one for the
            newsletter, one for social, one for the printed flyer — give you three independent click
            counts, so you can see which channel actually drove traffic.
          </p>
          <p>
            This works without any tagging on the destination. If you also want to know what
            visitors did after arriving, add{' '}
            <Link href="/utm-builder">UTM parameters</Link> so your destination analytics can
            attribute the session. The two layers complement each other: the short link counts
            clicks, the destination measures outcomes.
          </p>

          <h2>What click counts do and do not tell you</h2>
          <p>
            A click means a redirect was served. It does not mean a human read the page — messaging
            apps and security scanners fetch links automatically to build previews, which inflates
            counts, particularly in the first minutes after posting. Zurl labels recognisable
            automated traffic as <code>Bot</code>, but that detection relies on how clients identify
            themselves and is never complete.
          </p>
          <p>
            Read click data as a comparison between channels rather than an absolute measure of
            human interest. See{' '}
            <Link href="/link-analytics">link analytics</Link> for what is recorded.
          </p>
        </>
      }
    />
  );
}
