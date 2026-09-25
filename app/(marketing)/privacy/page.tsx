import type { Metadata } from 'next';
import Link from 'next/link';
import { Prose } from '@/components/ui';
import { Breadcrumbs, JsonLd, RelatedTools, Section } from '@/components/marketing/sections';
import { buildMetadata } from '@/lib/seo/metadata';
import { breadcrumbSchema, buildJsonLd } from '@/lib/seo/structured-data';

export const metadata: Metadata = buildMetadata({
  title: 'Privacy',
  description:
    'Exactly what Zurl records, what it deliberately does not record, how long data is kept, and which third parties are involved.',
  path: '/privacy',
});

const LAST_UPDATED = '14 March 2026';

/**
 * Honesty note: this describes the behaviour actually implemented in the code —
 * no IP storage, no raw user-agent storage, referrer host only, no analytics
 * vendor. It makes no claims about certifications or legal status.
 */

export default function PrivacyPage() {
  const breadcrumbs = [
    { name: 'Home', path: '/' },
    { name: 'Privacy', path: '/privacy' },
  ];

  return (
    <>
      <JsonLd json={buildJsonLd(breadcrumbSchema(breadcrumbs))} />
      <Breadcrumbs items={breadcrumbs} />

      <Section className="pt-8">
        <h1 className="text-3xl font-semibold tracking-tight text-ink sm:text-4xl">Privacy</h1>
        <p className="mt-2 text-sm text-faint">Last updated {LAST_UPDATED}</p>

        <Prose className="mt-6">
          <p>
            This page describes what Zurl records and what it does not. It is written to be specific
            rather than comprehensive-sounding — everything below reflects how the service actually
            behaves.
          </p>

          <h2>If you click a Zurl link</h2>
          <p>
            You do not need an account, and Zurl sets no cookie on you. When a short link is opened,
            the following is written to the database:
          </p>
          <ul>
            <li>which link was opened, and when</li>
            <li>
              a two-letter country code, plus a region or city label when the network provides one
            </li>
            <li>
              the <strong>host</strong> of the referring page, for example <code>example.com</code>
            </li>
            <li>
              three labels derived from your browser&rsquo;s user-agent: device type (desktop,
              mobile, tablet or bot), browser family, and operating system
            </li>
          </ul>

          <p>The following is explicitly not stored:</p>
          <ul>
            <li>
              <strong>Your IP address.</strong> It is used momentarily to determine the country and
              for rate limiting, then discarded. It is never written to the database.
            </li>
            <li>
              <strong>Your full user-agent string.</strong> It is reduced to the three labels above
              and discarded.
            </li>
            <li>
              <strong>The full referring URL.</strong> Only the host is kept, because a full URL can
              contain search terms and private paths.
            </li>
            <li>
              <strong>Any identifier for you.</strong> No cookie, no fingerprint, no visitor id.
              There is no way to connect two clicks to the same person.
            </li>
          </ul>

          <p>
            The practical consequence is that the owner of a link can see aggregate patterns and
            cannot see who visited. Neither can Zurl.
          </p>

          <h2>If you create a link without an account</h2>
          <p>
            The destination URL, the generated short code, and the time of creation are stored. A
            salted hash of your IP address is stored for abuse attribution and rate limiting — the
            address itself is not stored, and the hash cannot be reversed to recover it.
          </p>

          <h2>If you create an account</h2>
          <p>Zurl stores:</p>
          <ul>
            <li>your email address, used to sign in and nothing else</li>
            <li>
              a scrypt hash of your password, never the password itself
            </li>
            <li>the links you create, and their analytics</li>
            <li>
              session records, which contain a hash of your session token rather than the token
            </li>
          </ul>
          <p>
            Your session cookie is <code>HttpOnly</code>, <code>SameSite=Lax</code> and — in
            production — <code>Secure</code>. It exists solely to keep you signed in. There is no
            advertising or analytics cookie anywhere on the site.
          </p>

          <h2>Tools that send nothing</h2>
          <p>
            The <Link href="/url-checker">URL checker</Link> and{' '}
            <Link href="/utm-builder">UTM builder</Link> run entirely in your browser. Nothing you
            type into them reaches Zurl at all.
          </p>
          <p>
            The <Link href="/qr-code-generator">QR code generator</Link> sends content to the server
            to render the image, but does not store it. The{' '}
            <Link href="/url-expander">URL expander</Link> makes a request to the link you supply in
            order to follow its redirects, and does not store the result.
          </p>

          <h2>How long data is kept</h2>
          <ul>
            <li>
              <strong>Links:</strong> until you delete them. Anonymous links have no owner and
              therefore cannot be deleted by their creator.
            </li>
            <li>
              <strong>Individual click events:</strong> 12 months, then removed.
            </li>
            <li>
              <strong>Total click counts:</strong> kept for the life of the link, as a running
              counter with no per-event detail.
            </li>
            <li>
              <strong>Sessions:</strong> 30 days, or until you sign out.
            </li>
            <li>
              <strong>Abuse reports:</strong> kept while the report is open and for a period
              afterwards, so repeat abuse can be recognised.
            </li>
          </ul>

          <h2>Third parties</h2>
          <p>
            Zurl runs on hosting and database infrastructure operated by third-party providers,
            which necessarily process requests on our behalf. Beyond that there is no analytics
            vendor, no advertising network, no tag manager, no embedded social widgets and no
            third-party fonts. The site loads no external scripts.
          </p>
          <p>
            Product usage is recorded in our own server logs as structured events, which deliberately
            exclude IP addresses, email addresses and tokens.
          </p>

          <h2>What Zurl does not claim</h2>
          <p>
            Zurl does not scan destination pages for malware or phishing, and makes no representation
            that a link is safe. Abuse is handled reactively through{' '}
            <Link href="/report-abuse">reports</Link> and moderation.
          </p>
          <p>
            This page does not claim any certification, audit or formal compliance status. It
            describes the implemented behaviour, which you can compare against the service directly.
          </p>

          <h2>Your data</h2>
          <p>
            You can delete any link you own from your dashboard, which removes its click events
            along with it. To delete your account and everything associated with it, or to ask what
            is stored about you, use the <Link href="/contact">contact page</Link>.
          </p>
        </Prose>
      </Section>

      <RelatedTools path="/privacy" />
    </>
  );
}
