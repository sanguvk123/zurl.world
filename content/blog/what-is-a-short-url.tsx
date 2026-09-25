import Link from 'next/link';
import type { BlogPost } from './index';

export const post: BlogPost = {
  slug: 'what-is-a-short-url',
  title: 'What Is a Short URL?',
  seoTitle: 'What Is a Short URL? Anatomy, Uses and Limits',
  description:
    'A short URL is a compact web address that redirects to a longer one. Here is how one is structured, where they help, and what they cost you.',
  heading: 'What is a short URL?',
  publishedAt: '2026-02-04',
  readingMinutes: 4,
  relatedTools: [
    { path: '/short-url', label: 'Short URL Generator' },
    { path: '/url-checker', label: 'URL Checker' },
  ],
  relatedPosts: ['what-is-a-url-shortener', 'how-do-url-shorteners-work'],
  body: () => (
    <>
      <p>
        A short URL is a web address deliberately kept brief, which forwards visitors to a longer
        address. It is the output of a URL shortener rather than a different kind of link — browsers
        treat it exactly like any other URL.
      </p>

      <h2>Anatomy of a short URL</h2>

      <p>
        Take <code>https://zurl.world/a8K3xPq</code>. It has three parts:
      </p>

      <ul>
        <li>
          <strong>Protocol</strong> — <code>https://</code>. The connection is encrypted, same as
          any other secure site.
        </li>
        <li>
          <strong>Domain</strong> — <code>zurl.world</code>. The service that holds the mapping and
          performs the redirect.
        </li>
        <li>
          <strong>Short code</strong> — <code>a8K3xPq</code>. The key that identifies which
          destination to forward to.
        </li>
      </ul>

      <p>
        The short code is the only part that varies per link. Seven characters drawn from a
        56-character alphabet is enough for over a trillion distinct links, which is why codes stay
        short even at large scale.
      </p>

      <h2>Why codes avoid certain characters</h2>

      <p>
        Zurl&rsquo;s alphabet deliberately omits <code>0</code>, <code>O</code>, <code>o</code>,{' '}
        <code>1</code>, <code>l</code> and <code>I</code>. These are the characters people reliably
        misread, and short links are often read from a screen and typed by hand, printed on
        material, or dictated over a phone. Removing the ambiguous ones costs a little code space
        and prevents a category of support problem entirely.
      </p>

      <h2>Where short URLs earn their place</h2>

      <ul>
        <li>
          <strong>Character-limited contexts.</strong> Social posts, SMS messages and anywhere a
          long URL would consume most of the available space.
        </li>
        <li>
          <strong>Print.</strong> Nobody types a 150-character URL from a page. A short link is
          realistic to transcribe, and a{' '}
          <Link href="/qr-code-generator">QR code</Link> removes the typing entirely.
        </li>
        <li>
          <strong>Spoken contexts.</strong> Podcasts and presentations need a URL a listener can
          remember for ten seconds. A custom ending helps even more here.
        </li>
        <li>
          <strong>Measurement.</strong> A short link counts its own clicks, which works even when
          you do not control the destination page.
        </li>
      </ul>

      <h2>What short URLs cost you</h2>

      <p>Three real trade-offs, worth weighing before using one:</p>

      <p>
        <strong>The destination is hidden.</strong> A reader cannot see where the link leads. This
        is the property attackers exploit. A{' '}
        <Link href="/url-expander">URL expander</Link> resolves a short link so you can see the
        destination before opening it.
      </p>

      <p>
        <strong>You add a dependency.</strong> The link works as long as the shortening service
        does. For links intended to last indefinitely, link directly.
      </p>

      <p>
        <strong>Slightly slower first visit.</strong> The extra redirect costs a few milliseconds.
        Rarely significant, but not zero.
      </p>

      <h2>Short URLs and SEO</h2>

      <p>
        A common question is whether short links affect search rankings. For links pointing{' '}
        <em>to</em> your site, a properly implemented redirect passes visitors through to the
        destination and search engines follow it to the final URL. What matters far more is that the
        destination itself is canonical and reachable directly.
      </p>

      <p>
        Short links should not be used as the canonical address of your own pages. They are for
        sharing and distribution — your site&rsquo;s real URLs remain the addresses search engines
        should index.
      </p>

      <h2>Create one</h2>

      <p>
        The <Link href="/short-url">short URL generator</Link> produces one instantly, no account
        needed.
      </p>
    </>
  ),
};
