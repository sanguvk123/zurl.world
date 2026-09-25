import type { Metadata } from 'next';
import Link from 'next/link';
import { Prose } from '@/components/ui';
import { Breadcrumbs, JsonLd, RelatedTools, Section } from '@/components/marketing/sections';
import { buildMetadata } from '@/lib/seo/metadata';
import { breadcrumbSchema, buildJsonLd } from '@/lib/seo/structured-data';

export const metadata: Metadata = buildMetadata({
  title: 'Terms of Service',
  description:
    'The terms covering use of Zurl: acceptable use, what happens to links that break the rules, service availability, and the limits of our responsibility.',
  path: '/terms',
});

const LAST_UPDATED = '14 March 2026';

/**
 * Honesty note: no invented company entity, registration number, address or
 * governing jurisdiction. Those must be supplied by the operator before launch;
 * see the note in README under "Before going live".
 */

export default function TermsPage() {
  const breadcrumbs = [
    { name: 'Home', path: '/' },
    { name: 'Terms', path: '/terms' },
  ];

  return (
    <>
      <JsonLd json={buildJsonLd(breadcrumbSchema(breadcrumbs))} />
      <Breadcrumbs items={breadcrumbs} />

      <Section className="pt-8">
        <h1 className="text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
          Terms of Service
        </h1>
        <p className="mt-2 text-sm text-faint">Last updated {LAST_UPDATED}</p>

        <Prose className="mt-6">
          <p>
            These terms cover your use of Zurl. By creating a link, generating a QR code or using
            any other tool on this site, you agree to them.
          </p>

          <h2>1. The service</h2>
          <p>
            Zurl provides URL shortening and related link tools. A short link is a redirect: it
            forwards visitors to a destination you choose. Zurl does not host, control or endorse
            any destination content.
          </p>

          <h2>2. Acceptable use</h2>
          <p>You may not use Zurl to create links to, or in connection with:</p>
          <ul>
            <li>phishing, credential harvesting, or impersonation of any person or organisation</li>
            <li>malware, ransomware, or any software intended to cause harm</li>
            <li>unsolicited bulk messaging, in any medium</li>
            <li>content that is illegal in the jurisdiction where it is accessed</li>
            <li>child sexual abuse material, which is reported to the relevant authorities</li>
            <li>
              deceptive redirect chains intended to conceal a destination from moderation or from
              the people clicking
            </li>
            <li>
              automated abuse, including attempts to bypass rate limits, enumerate short codes, or
              claim custom names in bulk
            </li>
          </ul>

          <h2>3. Custom link names</h2>
          <p>
            Custom endings are allocated on a first-come basis. Names matching application routes,
            or words associated with account security, billing or verification, are reserved and
            cannot be claimed.
          </p>
          <p>
            We may reclaim a custom name that is being used to impersonate a person or organisation,
            or that was registered in bulk to prevent others using it.
          </p>

          <h2>4. Moderation</h2>
          <p>
            Anyone can <Link href="/report-abuse">report a link</Link>. Reports are reviewed, and a
            link found to breach these terms is disabled — after which visitors see a notice instead
            of being redirected.
          </p>
          <p>
            Links may be disabled without prior notice where the breach is serious, and accounts
            repeatedly creating such links may be closed.
          </p>
          <p>
            To be clear about our capabilities: Zurl does not scan destinations for malware or
            phishing. Moderation is reactive and depends on reports.
          </p>

          <h2>5. Your content</h2>
          <p>
            You keep all rights in the URLs you shorten. You are responsible for having the right to
            link to the destinations you choose, and for the content found there.
          </p>

          <h2>6. Availability</h2>
          <p>
            Zurl is provided as-is, without a service level agreement or uptime guarantee. We aim
            for high availability but do not promise uninterrupted service, and maintenance or
            failures may make links temporarily unreachable.
          </p>
          <p>
            Do not use Zurl as the sole access route to anything safety-critical, or where an outage
            would cause serious harm.
          </p>

          <h2>7. Accounts</h2>
          <p>
            You are responsible for keeping your password and API keys confidential, and for
            activity under your account. Tell us promptly if you believe your account has been
            accessed by someone else.
          </p>
          <p>
            You can delete your account at any time. Doing so removes your links, which stops them
            redirecting.
          </p>

          <h2>8. Rate limits</h2>
          <p>
            Limits apply to link creation and API use to prevent abuse. Current limits are published
            on the <Link href="/pricing">pricing page</Link> and in the{' '}
            <Link href="/api">API documentation</Link>, and may be adjusted where necessary to
            protect the service.
          </p>

          <h2>9. Liability</h2>
          <p>
            Zurl is not liable for content at any destination, for loss arising from a link becoming
            unavailable, or for any indirect or consequential loss arising from use of the service,
            to the extent permitted by applicable law.
          </p>

          <h2>10. Changes</h2>
          <p>
            These terms may change. The date at the top of this page reflects the most recent
            revision. Continued use after a change constitutes acceptance of the revised terms.
          </p>

          <h2>11. Contact</h2>
          <p>
            Questions about these terms can be sent through the{' '}
            <Link href="/contact">contact page</Link>. Abuse should be reported through the{' '}
            <Link href="/report-abuse">abuse report form</Link>, which reaches moderation directly.
          </p>
        </Prose>
      </Section>

      <RelatedTools path="/terms" />
    </>
  );
}
