import type { Metadata } from 'next';
import Link from 'next/link';
import { ToolPage } from '@/components/marketing/tool-page';
import { ShortenForm } from '@/components/shortener/shorten-form';
import { buildMetadata } from '@/lib/seo/metadata';
import type { FaqItem } from '@/lib/seo/structured-data';

export const metadata: Metadata = buildMetadata({
  title: 'Custom URL Shortener – Choose Your Own Short Link',
  description:
    'Create short links with your own wording instead of a random code, like zurl.world/spring-sale. Free with an account, including the naming rules and what is reserved.',
  path: '/custom-url-shortener',
});

const FAQS: readonly FaqItem[] = [
  {
    question: 'What is a custom URL shortener?',
    answer:
      'It lets you choose the part after the slash instead of accepting a generated code, turning zurl.world/a8K3xPq into something like zurl.world/spring-sale. The redirect works identically; the difference is how the link reads to a person.',
  },
  {
    question: 'Does a custom link cost anything?',
    answer:
      'No. Custom endings are included on the free account tier. An account is required so that names stay associated with you and cannot be claimed anonymously in bulk.',
  },
  {
    question: 'What characters can I use?',
    answer:
      'Lowercase letters, numbers, hyphens and underscores, between 3 and 48 characters. The name must start and end with a letter or number, and cannot contain repeated separators such as -- or __.',
  },
  {
    question: 'Why is everything converted to lowercase?',
    answer:
      'Mixed-case links generate a steady stream of failures from people who type them with different capitalisation. It would also mean /Sale and /sale could belong to two different people, which is an obvious impersonation risk. Lowercasing removes both problems.',
  },
  {
    question: 'Which names are unavailable?',
    answer:
      'Application routes such as api, dashboard and pricing, which would shadow real pages. Also reserved are words that could be used to impersonate an account-related flow — verify, reset-password, billing and similar — because a link at zurl.world/verify-account would be ideal for phishing.',
  },
  {
    question: 'Can I reuse a custom name after deleting the link?',
    answer:
      'Yes. Deleting a link releases its name, and you can claim it again. Bear in mind that anyone else can also claim it at that point.',
  },
  {
    question: 'Can I change a custom ending later?',
    answer:
      'No, because changing it would break every copy of the link already shared. The destination can be changed at any time, which is the more useful capability: you can repoint a printed link without reprinting anything.',
  },
  {
    question: 'Is this the same as a branded domain?',
    answer:
      'No. A custom ending changes the part after the slash while keeping zurl.world as the domain. A branded domain — go.yourcompany.com — requires your own domain and DNS configuration, and is planned rather than currently available.',
  },
];

const FEATURES = [
  {
    title: 'Readable links',
    description:
      'zurl.world/spring-sale tells people something. zurl.world/a8K3xPq does not.',
  },
  {
    title: 'Easy to say aloud',
    description: 'Practical for podcasts, presentations and anywhere a link has to be spoken.',
  },
  {
    title: 'Reserved-name protection',
    description:
      'Words that could impersonate account or billing flows are permanently unavailable to anyone.',
  },
  {
    title: 'Editable destination',
    description: 'Keep the same custom link and change where it points whenever you need to.',
  },
  {
    title: 'Distinct per channel',
    description:
      'Name links by channel and compare their click counts at a glance in your dashboard.',
  },
  {
    title: 'Included free',
    description: 'Part of the free account tier, not a paid add-on.',
  },
] as const;

export default function CustomUrlShortenerPage() {
  return (
    <ToolPage
      path="/custom-url-shortener"
      breadcrumbLabel="Custom URL Shortener"
      heading="Custom URL Shortener"
      intro="Choose your own link ending instead of a random code. Create a free account, then set a custom name when you shorten."
      appName="Zurl Custom URL Shortener"
      appDescription="Creates short links with user-chosen endings instead of randomly generated codes."
      tool={<ShortenForm autoFocus />}
      toolNote={
        <>
          <Link
            href="/signup"
            className="text-accent underline underline-offset-2 hover:text-accent-hover"
          >
            Create a free account
          </Link>{' '}
          to choose custom endings, then expand &quot;Custom link, expiry and password&quot; above.
          You can still shorten links without one.
        </>
      }
      features={{ title: 'Why choose your own ending', items: FEATURES }}
      faqs={FAQS}
      body={
        <>
          <h2>Choosing a name that works</h2>
          <p>
            <strong>Keep it short.</strong> The point of the exercise is brevity.{' '}
            <code>zurl.world/q3-report</code> beats{' '}
            <code>zurl.world/quarterly-financial-report-q3-2026</code>.
          </p>
          <p>
            <strong>Make it guessable.</strong> Someone who half-remembers the link should be able
            to reconstruct it. Single clear words work best.
          </p>
          <p>
            <strong>Add a date only when the link is genuinely time-bound.</strong>{' '}
            <code>spring-sale-2026</code> is right if there will be another next year;{' '}
            <code>spring-sale</code> is better if you would rather keep the same link and repoint
            it.
          </p>
          <p>
            <strong>Prefix with your organisation for credibility.</strong>{' '}
            <code>acme-demo</code> both reads as legitimate and avoids competing for a generic name.
          </p>

          <h2>When a name is already taken</h2>
          <p>
            Custom endings are unique across the whole service, so short common words go early.
            Adding a qualifier, a year, or your organisation name usually resolves it — and often
            produces a better link than the generic name would have.
          </p>

          <h2>Custom endings and trust</h2>
          <p>
            A readable ending makes a link easier to trust, because it gives the reader some signal
            about the destination. That works for legitimate links and equally for malicious ones,
            which is why words associated with account security, payment and verification are
            permanently reserved and cannot be claimed by anyone.
          </p>
          <p>
            If you encounter a Zurl link being used deceptively, please{' '}
            <Link href="/report-abuse">report it</Link>.
          </p>

          <h2>Custom endings versus branded domains</h2>
          <p>
            A custom ending changes what comes after the slash. A branded domain changes the domain
            itself, so links read <code>go.yourcompany.com/sale</code>. Branded domains are more
            work — you need the domain and DNS configuration — and are on the roadmap rather than
            available today. For most purposes a custom ending gets most of the benefit for none of
            the setup.
          </p>
        </>
      }
    />
  );
}
