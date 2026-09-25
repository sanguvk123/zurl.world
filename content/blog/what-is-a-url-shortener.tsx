import Link from 'next/link';
import type { BlogPost } from './index';

export const post: BlogPost = {
  slug: 'what-is-a-url-shortener',
  title: 'What Is a URL Shortener?',
  seoTitle: 'What Is a URL Shortener? How They Work and When to Use One',
  description:
    'A URL shortener turns a long web address into a short one that redirects to the original. Here is what they do, why people use them, and what to watch out for.',
  heading: 'What is a URL shortener?',
  publishedAt: '2026-01-14',
  readingMinutes: 5,
  relatedTools: [
    { path: '/url-shortener', label: 'URL Shortener' },
    { path: '/url-expander', label: 'URL Expander' },
  ],
  relatedPosts: ['how-do-url-shorteners-work', 'what-is-a-short-url'],
  body: () => (
    <>
      <p>
        A URL shortener is a service that takes a long web address and gives you a much shorter one
        that points to the same place. When someone opens the short link, the service looks up where
        it should go and forwards the browser to the original address.
      </p>

      <p>That is the entire concept. A link like this:</p>

      <p>
        <code>https://example.com/products/spring-collection?utm_source=newsletter&amp;utm_campaign=spring-2026</code>
      </p>

      <p>becomes something like this:</p>

      <p>
        <code>https://zurl.world/a8K3xPq</code>
      </p>

      <p>
        Both open the same page. The second one fits in a tweet, a printed flyer, or a spoken
        sentence.
      </p>

      <h2>Why people shorten URLs</h2>

      <p>There are four common reasons, and they are quite different from each other.</p>

      <h3>Length</h3>
      <p>
        Modern URLs are long. Content management systems add slugs, ecommerce platforms add product
        and variant identifiers, and marketing tools append campaign parameters. A URL that started
        as a clean path can easily reach 150 characters. Long URLs wrap awkwardly in email, get
        truncated in chat applications, and are impossible to type from a printed page.
      </p>

      <h3>Appearance</h3>
      <p>
        A short link looks deliberate. In a social post or a slide deck, a wall of query parameters
        reads as clutter and can make an otherwise legitimate link look untrustworthy.
      </p>

      <h3>Measurement</h3>
      <p>
        Because every visit passes through the shortener before reaching the destination, the
        shortener can count clicks. This is how you find out that a link in a newsletter was opened
        400 times without adding any tracking code to the destination page. See{' '}
        <Link href="/blog/how-to-track-link-clicks">how to track link clicks</Link> for what that
        data does and does not tell you.
      </p>

      <h3>Changeability</h3>
      <p>
        Some shorteners let you edit where a link points after it has been shared. If you print a
        QR code on packaging and the campaign page later moves, you can repoint the short link
        instead of reprinting the packaging.
      </p>

      <h2>What a URL shortener is not</h2>

      <p>
        A shortener does not compress the destination page, make it load faster, or change anything
        about the site you end up on. It adds one very fast redirect at the start of the journey —
        typically a few milliseconds — and then gets out of the way.
      </p>

      <p>
        It also does not hide the destination from the person who created it. The mapping between
        short code and destination is stored by the service, which is exactly what allows abuse
        reports to work.
      </p>

      <h2>The trade-off: short links hide the destination</h2>

      <p>
        This is the real downside and it is worth stating plainly. When you see{' '}
        <code>https://zurl.world/a8K3xPq</code>, you cannot tell whether it leads to a news article
        or something malicious. Attackers know this, which is why short links appear regularly in
        phishing messages.
      </p>

      <p>Three things help:</p>

      <ul>
        <li>
          <strong>Preview before opening.</strong> A{' '}
          <Link href="/url-expander">URL expander</Link> resolves a short link and shows you the
          destination without opening it.
        </li>
        <li>
          <strong>Context matters more than the link.</strong> An unexpected short link in an
          unexpected message is a warning sign regardless of which service produced it.
        </li>
        <li>
          <strong>Reputable services restrict what can be shortened.</strong> Zurl only accepts
          standard <code>http</code> and <code>https</code> addresses, rejects links pointing at
          private network addresses, and provides a{' '}
          <Link href="/report-abuse">reporting route</Link> so bad links can be disabled.
        </li>
      </ul>

      <p>
        To be clear about what Zurl does not do: there is no malware or phishing scanner behind it.
        Treat an unfamiliar short link the way you would treat any unfamiliar link.
      </p>

      <h2>When you should not use one</h2>

      <p>
        If the destination URL is already short and readable, shortening it adds a dependency for no
        benefit. <code>https://example.com/pricing</code> is clearer than any short code could be.
      </p>

      <p>
        For links that must keep working for decades with no third party involved — citations in
        academic work, for instance — link directly, or use a permanent archival identifier
        designed for that purpose.
      </p>

      <h2>Getting started</h2>

      <p>
        Shortening a link takes about three seconds and needs no account. Paste a URL into the{' '}
        <Link href="/url-shortener">URL shortener</Link> and you will have a short link
        immediately.
      </p>
    </>
  ),
};
