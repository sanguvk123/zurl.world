import type { Metadata } from 'next';
import Link from 'next/link';
import { ToolPage } from '@/components/marketing/tool-page';
import { ShortenForm } from '@/components/shortener/shorten-form';
import { buildMetadata } from '@/lib/seo/metadata';
import type { FaqItem } from '@/lib/seo/structured-data';

export const metadata: Metadata = buildMetadata({
  title: 'Free URL Shortener – No Account, No Expiry',
  description:
    'A genuinely free URL shortener. No sign-up, no link expiry, no click limits and no ads on your links. Here is exactly what is free and what is not.',
  path: '/free-url-shortener',
});

/**
 * Intent note: people searching "free url shortener" are usually checking for
 * hidden catches — expiring links, click caps, forced ads, paywalled basics.
 * This page answers those specifically and states the limits plainly.
 */

const FAQS: readonly FaqItem[] = [
  {
    question: 'What exactly is free?',
    answer:
      'Creating short links, generating QR codes, the URL expander, the URL checker and the UTM builder are all free without an account. With a free account you additionally get custom link endings, expiry dates, password protection, click analytics and API access.',
  },
  {
    question: 'Do free links expire or get deleted?',
    answer:
      'No. Links do not expire unless you set an expiry date yourself, and inactive links are not deleted. A link created today keeps redirecting until you delete it.',
  },
  {
    question: 'Is there a limit on clicks?',
    answer:
      'No. There is no cap on how many times a link can be opened, and analytics are not throttled after a certain number of clicks.',
  },
  {
    question: 'Will you put ads or interstitials on my links?',
    answer:
      'No. Zurl links redirect straight to your destination. There is no advertising page, no countdown timer and no interstitial, except the password prompt if you deliberately add a password to a link.',
  },
  {
    question: 'Are there any limits at all?',
    answer:
      'Yes, and they exist to prevent automated abuse rather than to push you to pay. Anonymous users can create 10 links per hour per network address; a free account raises this to 120 per hour. Custom endings require a free account so that names cannot be claimed anonymously and then squatted.',
  },
  {
    question: 'What happens to my links if I never pay?',
    answer:
      'Nothing. The free tier is not a trial. Your links keep working and your analytics stay available. Paid tiers, when they exist, will add capabilities such as custom domains and team accounts rather than restricting what is currently free.',
  },
  {
    question: 'How is this sustainable if it is free?',
    answer:
      'Running a URL shortener is inexpensive at the scale of individual users: a redirect is one indexed database query. The intent is to charge organisations that need custom domains, team access and higher API limits, not individuals shortening links.',
  },
];

const FEATURES = [
  {
    title: 'No sign-up to start',
    description: 'The shortener and QR generator work immediately, with no email address required.',
  },
  {
    title: 'No expiry on links',
    description: 'Links are not deleted for inactivity and do not stop working after a trial.',
  },
  {
    title: 'No click limits',
    description: 'A link can be opened any number of times without throttling or upgrade prompts.',
  },
  {
    title: 'No ads or interstitials',
    description: 'Visitors go straight to your destination. No advertising page in between.',
  },
  {
    title: 'Analytics included free',
    description: 'Click counts, countries, referrers and device breakdown on the free account tier.',
  },
  {
    title: 'API access included',
    description: 'Free accounts can create API keys and use the REST API within the standard limits.',
  },
] as const;

export default function FreeUrlShortenerPage() {
  return (
    <ToolPage
      path="/free-url-shortener"
      breadcrumbLabel="Free URL Shortener"
      heading="Free URL Shortener"
      intro="Shorten as many links as you need, at no cost. No sign-up to get started, no expiry on your links, no click limits, and no advertising between your visitor and your destination."
      appName="Zurl Free URL Shortener"
      appDescription="A free URL shortening service with no account requirement, no link expiry and no click limits."
      tool={<ShortenForm autoFocus />}
      features={{
        title: 'What free actually means here',
        description:
          'Free URL shorteners often come with conditions. These are the ones Zurl does not have.',
        items: FEATURES,
      }}
      faqs={FAQS}
      body={
        <>
          <h2>The catches worth checking on any free shortener</h2>
          <p>
            &quot;Free&quot; covers a lot of different arrangements. Before committing links to a
            service — particularly links you will print — it is worth checking four things.
          </p>
          <p>
            <strong>Do links expire?</strong> Some free tiers delete links after a period of
            inactivity. This is the most damaging condition, because it breaks links that are
            already published. Zurl links do not expire unless you set an expiry yourself.
          </p>
          <p>
            <strong>Is there a click cap?</strong> Some services stop redirecting, or stop
            recording, after a threshold. Zurl has no click cap.
          </p>
          <p>
            <strong>Are there interstitials?</strong> Some free shorteners show an advertising page
            before forwarding. Zurl redirects directly.
          </p>
          <p>
            <strong>What happens to existing links if pricing changes?</strong> Worth asking of any
            service. Zurl&rsquo;s intent is that paid tiers add capabilities rather than restrict
            what is currently free.
          </p>

          <h2>The limits that do exist</h2>
          <p>
            Rate limits apply to link creation: 10 per hour for anonymous users, 120 per hour with a
            free account. These exist because an unthrottled shortener is immediately used for spam,
            and a service overrun with spam becomes useless for everyone. They are not upgrade
            prompts — the authenticated limit is high enough for any ordinary use.
          </p>
          <p>
            Custom endings require a free account. This is deliberate: anonymous custom aliases
            would let anyone claim desirable names in bulk with no accountability.
          </p>

          <h2>What a free account adds</h2>
          <p>
            Signing up costs nothing and takes an email address and a password. It adds{' '}
            <Link href="/custom-url-shortener">custom link endings</Link>, expiry dates, password
            protection, <Link href="/link-analytics">click analytics</Link> and{' '}
            <Link href="/api">API access</Link>. It also means your links are saved somewhere you
            can manage them — anonymous links cannot be edited or deleted afterwards, because there
            is nothing tying them to you.
          </p>

          <h2>See also</h2>
          <p>
            Full details of what each tier includes are on the{' '}
            <Link href="/pricing">pricing page</Link>. If you just want a link right now, the form
            above works without any of this.
          </p>
        </>
      }
    />
  );
}
