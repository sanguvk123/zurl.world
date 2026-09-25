import Link from 'next/link';
import type { BlogPost } from './index';

export const post: BlogPost = {
  slug: 'how-to-shorten-a-url',
  title: 'How to Shorten a URL',
  seoTitle: 'How to Shorten a URL (Step by Step, Free)',
  description:
    'A step-by-step guide to shortening any link, plus how to add a custom ending, an expiry date or a QR code.',
  heading: 'How to shorten a URL',
  publishedAt: '2026-01-28',
  readingMinutes: 4,
  relatedTools: [
    { path: '/shorten-url', label: 'Shorten a URL' },
    { path: '/qr-code-generator', label: 'QR Code Generator' },
  ],
  relatedPosts: ['what-is-a-url-shortener', 'how-to-create-a-custom-short-url'],
  body: () => (
    <>
      <p>
        Shortening a link takes a few seconds and does not require an account. Here is the process,
        followed by the optional extras worth knowing about.
      </p>

      <h2>The basic steps</h2>

      <ol>
        <li>
          <strong>Copy the long URL.</strong> Select it from your browser&rsquo;s address bar and
          copy the whole thing, including any query parameters after the <code>?</code>. Those
          parameters often carry campaign tracking or the specific product variant, and dropping
          them changes where the link goes.
        </li>
        <li>
          <strong>Paste it into the shortener.</strong> Open the{' '}
          <Link href="/url-shortener">URL shortener</Link> and paste into the input.
        </li>
        <li>
          <strong>Select Shorten URL.</strong> Your short link appears immediately below the input.
        </li>
        <li>
          <strong>Copy the result.</strong> Use the copy button rather than selecting the text — it
          copies the full URL including the <code>https://</code> prefix, which some applications
          need in order to make it clickable.
        </li>
      </ol>

      <p>That is the whole process. The link works immediately and does not expire by default.</p>

      <h2>Checking it worked</h2>

      <p>
        Open the short link once before sharing it. This catches the most common mistake, which is
        copying a partial URL — a truncated link will still shorten successfully, because it is
        still a valid address, and will simply lead somewhere unexpected.
      </p>

      <h2>Optional: a custom ending</h2>

      <p>
        With a free account you can replace the random code with your own, so{' '}
        <code>zurl.world/a8K3xPq</code> becomes <code>zurl.world/spring-sale</code>. This is worth
        doing whenever a human will read the link aloud, type it manually, or judge whether it looks
        trustworthy. See{' '}
        <Link href="/blog/how-to-create-a-custom-short-url">how to create a custom short URL</Link>.
      </p>

      <h2>Optional: an expiry date</h2>

      <p>
        Links can be set to stop working at a specific time. This suits time-limited offers, event
        registration and anything where an out-of-date link is worse than no link. After the expiry
        moment, visitors see a short notice explaining the link has expired rather than being
        redirected.
      </p>

      <h2>Optional: a password</h2>

      <p>
        A link can require a password before the redirect happens. This is a light access control
        for links shared in semi-public places — it keeps casual visitors out, but anyone with the
        password can share it onward, so it is not a substitute for real authentication on the
        destination.
      </p>

      <h2>Optional: a QR code</h2>

      <p>
        Every short link can be turned into a QR code with the QR button on the result. Download the
        PNG for screens and general use, or the SVG for print — SVG stays sharp at any size, which
        matters on posters and packaging. You can also generate a code for any URL directly with the{' '}
        <Link href="/qr-code-generator">QR code generator</Link>.
      </p>

      <h2>Shortening many links at once</h2>

      <p>
        For a batch, paste a list into the{' '}
        <Link href="/bulk-url-shortener">bulk URL shortener</Link> rather than doing them one at a
        time. For anything recurring or automated, the <Link href="/api">API</Link> is a better fit.
      </p>

      <h2>A note on tracking parameters</h2>

      <p>
        If your long URL contains <code>utm_</code> parameters, keep them. The shortener preserves
        your query string exactly as supplied — parameter order and duplicates included — so your
        destination analytics continues to work. If you need to add campaign parameters in the first
        place, the <Link href="/utm-builder">UTM builder</Link> assembles them correctly.
      </p>
    </>
  ),
};
