import Link from 'next/link';
import type { BlogPost } from './index';

export const post: BlogPost = {
  slug: 'how-to-create-a-custom-short-url',
  title: 'How to Create a Custom Short URL',
  seoTitle: 'How to Create a Custom Short URL (Branded Link Guide)',
  description:
    'Replace a random short code with a readable one. How to choose a custom link ending, the naming rules, and what to do when a name is taken.',
  heading: 'How to create a custom short URL',
  publishedAt: '2026-02-11',
  readingMinutes: 5,
  relatedTools: [
    { path: '/custom-url-shortener', label: 'Custom URL Shortener' },
    { path: '/url-shortener', label: 'URL Shortener' },
  ],
  relatedPosts: ['how-to-shorten-a-url', 'how-to-track-link-clicks'],
  body: () => (
    <>
      <p>
        A custom short URL replaces the random code with wording you choose, so{' '}
        <code>zurl.world/a8K3xPq</code> becomes <code>zurl.world/spring-sale</code>. It is the same
        redirect underneath; the difference is entirely in how it reads.
      </p>

      <h2>Creating one</h2>

      <ol>
        <li>
          <Link href="/signup">Create a free account</Link>. Custom endings need one so the name
          stays associated with you and cannot be taken over.
        </li>
        <li>
          Open the <Link href="/custom-url-shortener">custom URL shortener</Link> and paste your
          destination.
        </li>
        <li>Expand the options and type your preferred ending.</li>
        <li>Select Shorten URL. If the name is free, it is yours.</li>
      </ol>

      <h2>The rules</h2>

      <p>Custom endings must:</p>

      <ul>
        <li>be between 3 and 48 characters</li>
        <li>use only lowercase letters, numbers, hyphens and underscores</li>
        <li>start and end with a letter or number</li>
        <li>avoid repeated separators such as <code>--</code> or <code>__</code></li>
      </ul>

      <p>Some names are unavailable regardless:</p>

      <ul>
        <li>
          <strong>Application routes</strong> such as <code>api</code>, <code>dashboard</code> and{' '}
          <code>pricing</code>, which would shadow real pages.
        </li>
        <li>
          <strong>Impersonation risks</strong> such as <code>verify</code>,{' '}
          <code>reset-password</code> and <code>billing</code>. A link at{' '}
          <code>zurl.world/verify-account</code> would be a gift to phishing campaigns, so those
          names are permanently reserved.
        </li>
      </ul>

      <h2>Why everything is lowercase</h2>

      <p>
        Custom endings are folded to lowercase. Typing <code>Spring-Sale</code> gives you{' '}
        <code>spring-sale</code>.
      </p>

      <p>
        This is deliberate. Mixed-case links generate a steady stream of &quot;the link
        doesn&rsquo;t work&quot; reports from people who typed it with different capitalisation.
        Worse, allowing case sensitivity means <code>/Sale</code> and <code>/sale</code> could be
        owned by two different people — an obvious impersonation vector. Lowercase removes both
        problems.
      </p>

      <h2>Choosing a good name</h2>

      <p>
        <strong>Keep it short.</strong> The point is brevity. <code>zurl.world/q3-report</code>{' '}
        beats <code>zurl.world/quarterly-financial-report-q3-2026</code>.
      </p>

      <p>
        <strong>Make it predictable.</strong> Someone who half-remembers the link should be able to
        guess it. <code>docs</code>, <code>pricing-2026</code> and <code>demo</code> work well.
      </p>

      <p>
        <strong>Avoid ambiguous characters when it will be spoken.</strong> If you will read the
        link aloud, avoid names where a hyphen or underscore is easy to mishear. Single words are
        safest.
      </p>

      <p>
        <strong>Add a date only if the link is genuinely time-bound.</strong>{' '}
        <code>spring-sale-2026</code> is right if there will be another next year;{' '}
        <code>spring-sale</code> is better if you would rather reuse the same link and repoint it.
      </p>

      <h2>When the name is taken</h2>

      <p>
        Each ending can only be claimed once across the whole service, so short common words go
        early. You will see &quot;That custom alias is already in use.&quot;
      </p>

      <p>Reasonable fallbacks:</p>

      <ul>
        <li>
          Add a qualifier: <code>acme-demo</code> rather than <code>demo</code>.
        </li>
        <li>
          Add a year when the link is time-bound: <code>pricing-2026</code>.
        </li>
        <li>Use your organisation name as a prefix, which also makes the link more credible.</li>
      </ul>

      <h2>Custom endings and trust</h2>

      <p>
        A readable ending makes a link easier to trust, because the reader gets some signal about
        where it goes. That cuts both ways: a convincing-looking custom link is also more effective
        in a phishing attempt, which is exactly why account-sensitive words are reserved and why
        anyone can <Link href="/report-abuse">report a link</Link>.
      </p>

      <h2>Changing it later</h2>

      <p>
        The ending itself is fixed once created — changing it would break every copy already shared.
        The <em>destination</em> can be updated at any time from your dashboard, which is the more
        useful capability: print a QR code with a custom link on it, and you can repoint it later
        without reprinting anything.
      </p>
    </>
  ),
};
