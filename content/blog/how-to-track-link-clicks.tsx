import Link from 'next/link';
import type { BlogPost } from './index';

export const post: BlogPost = {
  slug: 'how-to-track-link-clicks',
  title: 'How to Track Link Clicks',
  seoTitle: 'How to Track Link Clicks (Without Invasive Tracking)',
  description:
    'How click tracking works on a short link, which metrics are trustworthy, and how to read the data without over-interpreting it.',
  heading: 'How to track link clicks',
  publishedAt: '2026-02-18',
  readingMinutes: 6,
  relatedTools: [
    { path: '/link-analytics', label: 'Link Analytics' },
    { path: '/utm-builder', label: 'UTM Builder' },
  ],
  relatedPosts: ['how-do-url-shorteners-work', 'how-to-create-a-custom-short-url'],
  body: () => (
    <>
      <p>
        If you share a link, you usually want to know whether anyone opened it. A short link makes
        this straightforward, because every visit passes through the shortener before reaching the
        destination.
      </p>

      <h2>How it works</h2>

      <p>
        When someone opens a Zurl link, the service looks up the destination, sends the browser on
        its way, and then records that a click happened. No code needs to be added to the
        destination page, which is what makes this useful for links to sites you do not control.
      </p>

      <p>
        <Link href="/signup">Create a free account</Link>, create your links while signed in, then
        open any link in your dashboard to see its analytics.
      </p>

      <h2>What you can see</h2>

      <ul>
        <li>
          <strong>Total clicks</strong> — every redirect served, for the life of the link.
        </li>
        <li>
          <strong>Clicks over time</strong> — a daily series showing when traffic arrived.
        </li>
        <li>
          <strong>Top countries</strong> — derived from a coarse geographic lookup.
        </li>
        <li>
          <strong>Referrers</strong> — the <em>host</em> that sent the visitor, such as{' '}
          <code>example.com</code>. Never the full referring URL.
        </li>
        <li>
          <strong>Devices, browsers and operating systems</strong> — broad categories only.
        </li>
        <li>
          <strong>Recent clicks</strong> — the last few events, useful for confirming a link works.
        </li>
      </ul>

      <h2>What is deliberately not recorded</h2>

      <p>
        Zurl does not store IP addresses. The IP is used momentarily to derive a country and is then
        discarded. It does not store raw user-agent strings, which are detailed enough to
        fingerprint a device; they are reduced to three broad labels first. It does not store the
        full referring URL, only the host, because the full URL can contain search terms and private
        paths.
      </p>

      <p>
        The practical consequence is that Zurl can tell you &quot;400 clicks, mostly from India,
        mostly mobile&quot; and cannot tell you anything about a specific individual. That is the
        intended limit. The <Link href="/privacy">privacy page</Link> documents it precisely.
      </p>

      <h2>Reading the numbers honestly</h2>

      <p>
        Click counts are noisier than they look, and three effects dominate.
      </p>

      <p>
        <strong>Bots inflate counts.</strong> Chat applications, email clients and security scanners
        fetch links to build previews or check for threats. Post a link in a group chat and it may
        register clicks before any human sees it. Zurl labels recognisable automated traffic as{' '}
        <code>Bot</code> in the device breakdown, but detection is based on how clients identify
        themselves and is never complete.
      </p>

      <p>
        <strong>Clicks are not visits.</strong> A click means a redirect was served. The visitor may
        have closed the tab immediately. Only analytics on the destination page can tell you what
        happened next.
      </p>

      <p>
        <strong>Referrer data is incomplete.</strong> Many clicks arrive with no referrer at all —
        from applications, native clients, or because of privacy settings. A large &quot;Unknown&quot;
        share is normal and does not indicate a problem.
      </p>

      <h2>Getting more precise attribution</h2>

      <p>
        Click counts tell you a link was opened. To know which campaign drove a conversion, you need
        the destination&rsquo;s own analytics, which is what UTM parameters are for:
      </p>

      <p>
        <code>https://example.com/pricing?utm_source=newsletter&amp;utm_medium=email&amp;utm_campaign=spring</code>
      </p>

      <p>
        These are read by the analytics tool on the destination site. Shortening a URL preserves the
        query string exactly, so the parameters survive the redirect and both layers work together:
        the short link counts clicks, the destination attributes what those visitors did. The{' '}
        <Link href="/utm-builder">UTM builder</Link> assembles the parameters correctly.
      </p>

      <h2>Comparing links properly</h2>

      <p>
        The most useful pattern is one distinct short link per channel. Create separate links for
        the newsletter, the social post and the printed flyer, all pointing at the same page. Each
        accumulates its own click count, so you can compare channels directly rather than trying to
        untangle a single number.
      </p>

      <p>
        A <Link href="/custom-url-shortener">custom ending</Link> per channel makes these easy to
        tell apart in your dashboard.
      </p>
    </>
  ),
};
