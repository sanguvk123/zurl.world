import Link from 'next/link';
import type { BlogPost } from './index';

export const post: BlogPost = {
  slug: 'how-do-url-shorteners-work',
  title: 'How Do URL Shorteners Work?',
  seoTitle: 'How Do URL Shorteners Work? The Technical Explanation',
  description:
    'What actually happens between clicking a short link and landing on the destination page: short codes, database lookups, HTTP redirects and why the status code matters.',
  heading: 'How do URL shorteners work?',
  publishedAt: '2026-01-21',
  readingMinutes: 7,
  relatedTools: [
    { path: '/url-shortener', label: 'URL Shortener' },
    { path: '/api', label: 'API' },
  ],
  relatedPosts: ['what-is-a-url-shortener', 'how-to-create-a-custom-short-url'],
  body: () => (
    <>
      <p>
        A URL shortener is, at its core, a lookup table with an HTTP redirect attached. The
        interesting parts are how the keys are generated and what happens on the redirect path.
      </p>

      <h2>Step 1: storing the destination</h2>

      <p>
        When you submit a long URL, the service validates it and stores it in a database alongside a
        newly generated short code:
      </p>

      <ul>
        <li>
          <code>a8K3xPq</code> → <code>https://example.com/products/spring-collection</code>
        </li>
      </ul>

      <p>
        Validation matters more than it sounds. The destination will eventually be handed to a
        browser as a <code>Location</code> header, so a shortener that accepts anything can be used
        to launch <code>javascript:</code> URLs or to probe private network addresses. Zurl accepts
        only <code>http</code> and <code>https</code>, and checks the protocol after parsing the URL
        rather than by matching text — otherwise tricks like a tab character inside{' '}
        <code>java&#8203;script:</code> slip through.
      </p>

      <h2>Step 2: generating the short code</h2>

      <p>There are two broad approaches, and the difference is significant.</p>

      <h3>Sequential encoding</h3>
      <p>
        Take the database row id, encode it in base62, and use that as the code. Row 1 becomes{' '}
        <code>1</code>, row 100000 becomes <code>q0U</code>. It is compact and collisions are
        impossible by construction.
      </p>
      <p>
        The problem is that it is completely predictable. Anyone can walk the entire link database
        by counting, which exposes every link anyone has ever created. It also leaks how many links
        the service has ever stored.
      </p>

      <h3>Random generation</h3>
      <p>
        Generate a random string from a fixed alphabet and check that it is not already taken. Zurl
        uses seven characters from a 56-character alphabet, which gives roughly 1.7 × 10<sup>12</sup>{' '}
        possibilities. Codes cannot be enumerated in practice, and nothing about your link volume is
        revealed.
      </p>
      <p>
        Two details matter here. The randomness must be cryptographically secure —{' '}
        <code>Math.random()</code> is predictable enough to be attacked. And the mapping from random
        bytes to characters must avoid modulo bias: naively taking a byte modulo 56 makes the first
        32 characters of the alphabet more likely than the rest, because 256 does not divide evenly
        by 56. The fix is rejection sampling, which discards bytes that would skew the distribution.
      </p>

      <h3>Handling collisions</h3>
      <p>
        With random codes, two links can in principle be assigned the same code. The robust solution
        is a unique constraint in the database plus a retry: attempt the insert, and if the database
        rejects it, generate a new code and try again. Checking &quot;is this code free?&quot; before
        inserting is a race condition — two simultaneous requests can both see the code as free.
      </p>

      <h2>Step 3: the redirect</h2>

      <p>When someone opens the short link, the service:</p>

      <ol>
        <li>Extracts the code from the path.</li>
        <li>Looks it up, using an indexed query on a unique column.</li>
        <li>Checks whether the link exists, is expired, or has been disabled.</li>
        <li>
          Returns an HTTP redirect with a <code>Location</code> header pointing at the destination.
        </li>
      </ol>

      <p>
        The browser receives the redirect and immediately requests the destination. The user
        typically never notices the intermediate hop.
      </p>

      <h2>Why the status code matters</h2>

      <p>This is the decision most shortener implementations get wrong.</p>

      <p>
        A <strong>301 Moved Permanently</strong> tells the browser the mapping will never change.
        Browsers take that literally and cache it aggressively — often until the cache is manually
        cleared. It saves a round trip on repeat visits.
      </p>

      <p>
        A <strong>302 Found</strong> tells the browser the redirect is temporary, so it asks the
        server again next time.
      </p>

      <p>
        The trap with 301 is that it makes link management stop working. If you disable a link,
        change its destination, or let it expire, anyone who already visited it keeps going to the
        old destination — potentially for years — because their browser never asks again. For a
        service that offers editable, expirable, disableable links, that is a correctness bug, not
        an optimisation. Zurl uses 302 for this reason and accepts the extra round trip.
      </p>

      <h2>Recording the click without slowing it down</h2>

      <p>
        Analytics is the part most likely to hurt performance. Writing a click record takes a
        database round trip, and if the redirect waits for it, every visitor pays that cost.
      </p>

      <p>
        The fix is to send the redirect first and record the click afterwards. On modern serverless
        platforms there is an explicit mechanism for work that should continue after the response
        has been delivered. The visitor is already on their way to the destination while the click
        is being written.
      </p>

      <p>
        It also means an analytics failure cannot break a redirect. If the write fails, it is logged
        and the visitor is unaffected — the right trade-off, since the redirect is the product and
        analytics is reporting.
      </p>

      <h2>What gets recorded</h2>

      <p>
        This is a design decision, not a technical necessity. A shortener could store the full IP
        address, the complete user-agent string and the full referring URL for every click. That
        produces a detailed record of individual people.
      </p>

      <p>
        Zurl records a coarse country, a device and browser category, and the referring{' '}
        <em>host</em> only. The IP address is used to derive the country and then discarded; the
        user-agent is reduced to three labels and discarded. There is enough data to answer
        &quot;where is my traffic coming from?&quot; and not enough to profile a visitor. See the{' '}
        <Link href="/privacy">privacy page</Link> for specifics.
      </p>

      <h2>Trying it</h2>

      <p>
        The <Link href="/url-shortener">URL shortener</Link> does all of the above in a few
        milliseconds. If you want to build it into your own application, the{' '}
        <Link href="/api">API</Link> exposes the same functionality.
      </p>
    </>
  ),
};
