import type { Metadata } from 'next';
import Link from 'next/link';
import { ToolPage } from '@/components/marketing/tool-page';
import { ShortenForm } from '@/components/shortener/shorten-form';
import { buildMetadata } from '@/lib/seo/metadata';
import type { FaqItem } from '@/lib/seo/structured-data';

export const metadata: Metadata = buildMetadata({
  title: 'Short URL Generator – Create Short Links',
  description:
    'Generate a short URL for any web address. See how a short link is structured, why codes avoid confusable characters, and create one instantly for free.',
  path: '/short-url',
});

/**
 * Intent note: this page serves people searching for the *artefact* ("short
 * URL") rather than the *tool* ("URL shortener"). The copy therefore leads with
 * what a short URL is and how it is put together, where /url-shortener leads
 * with the action.
 */

const FAQS: readonly FaqItem[] = [
  {
    question: 'What does a Zurl short URL look like?',
    answer:
      'https://zurl.world/a8K3xPq — the domain followed by a seven-character code. With a free account you can replace the code with your own wording, giving something like https://zurl.world/spring-sale.',
  },
  {
    question: 'Why do the codes skip certain letters and numbers?',
    answer:
      'The alphabet excludes 0, O, o, 1, l and I because these are the characters people reliably misread. Short URLs are often read from a screen and typed by hand, printed, or dictated, so removing ambiguous characters prevents a whole class of mistyped links.',
  },
  {
    question: 'How many short URLs can exist?',
    answer:
      'Seven characters from a 56-character alphabet gives roughly 1.7 trillion combinations. Codes are generated randomly rather than sequentially, so they cannot be guessed by counting and do not reveal how many links exist.',
  },
  {
    question: 'Is a short URL secure?',
    answer:
      'Short URLs are served over HTTPS, so the connection is encrypted. The code itself is not a secret in the cryptographic sense — anyone with the link can open it. For links that need restricting, add a password when you create the link.',
  },
  {
    question: 'Does a short URL slow down the page?',
    answer:
      'It adds one redirect before the destination loads, typically a few milliseconds. Zurl records analytics after the redirect is sent rather than before, so the visitor is never waiting on a database write.',
  },
  {
    question: 'Can a short URL point to another short URL?',
    answer:
      'Technically yes, but Zurl flags it. Chaining shorteners hides the destination twice over and makes abuse review much harder, so a warning is shown when the destination is another known shortener.',
  },
];

const FEATURES = [
  {
    title: 'Seven-character codes',
    description:
      'Short enough to type from a printed page, long enough that codes cannot be guessed by trial and error.',
  },
  {
    title: 'No confusable characters',
    description:
      'The code alphabet omits 0, O, 1, l and I, so a link read aloud or copied by hand still resolves.',
  },
  {
    title: 'Randomly generated',
    description:
      'Codes come from a cryptographically secure source, so nobody can enumerate links by counting upwards.',
  },
  {
    title: 'HTTPS by default',
    description: 'Every short URL is served over an encrypted connection.',
  },
  {
    title: 'Query strings preserved',
    description:
      'Campaign parameters and other query values pass through to the destination exactly as supplied.',
  },
  {
    title: 'Optional custom ending',
    description: 'Replace the generated code with your own wording using a free account.',
  },
] as const;

export default function ShortUrlPage() {
  return (
    <ToolPage
      path="/short-url"
      breadcrumbLabel="Short URL Generator"
      heading="Short URL Generator"
      intro="Create a short URL for any web address. Paste your link below and you will have a compact, shareable address immediately — free and without an account."
      appName="Zurl Short URL Generator"
      appDescription="Generates a short URL that redirects to any http or https web address."
      tool={<ShortenForm autoFocus />}
      features={{
        title: 'How Zurl short URLs are built',
        description:
          'The design choices behind the code are about making links survive contact with the real world.',
        items: FEATURES,
      }}
      faqs={FAQS}
      body={
        <>
          <h2>The anatomy of a short URL</h2>
          <p>
            A short URL has three parts. Take <code>https://zurl.world/a8K3xPq</code>:
          </p>
          <ul>
            <li>
              <strong>The protocol</strong>, <code>https://</code>, which encrypts the connection.
            </li>
            <li>
              <strong>The domain</strong>, <code>zurl.world</code>, which is the service holding the
              mapping.
            </li>
            <li>
              <strong>The code</strong>, <code>a8K3xPq</code>, which identifies which destination to
              redirect to.
            </li>
          </ul>
          <p>
            Only the code changes between links. Everything about the design of a short URL is a
            trade-off around that code: shorter is easier to share, longer is harder to guess.
          </p>

          <h2>Why seven characters</h2>
          <p>
            Zurl uses seven characters from a 56-character alphabet, giving about 1.7 trillion
            possible codes. That is far more than will ever be used, and the point is not capacity —
            it is that the space is too large to enumerate. A shortener using sequential codes
            (link 1, link 2, link 3) is compact but lets anyone walk the entire database by
            counting.
          </p>
          <p>
            The alphabet itself is base62 with the ambiguous characters removed. Dropping{' '}
            <code>0</code>, <code>O</code>, <code>o</code>, <code>1</code>, <code>l</code> and{' '}
            <code>I</code> costs a small amount of code space and eliminates the most common cause
            of a short link failing when someone types it manually.
          </p>

          <h2>Short URL versus custom URL</h2>
          <p>
            A generated short URL is the fastest option and needs no account. A{' '}
            <Link href="/custom-url-shortener">custom short URL</Link> replaces the random code with
            wording you choose, which is worth doing whenever a person will read, speak or judge the
            link before clicking it.
          </p>
          <p>
            Both redirect identically. The difference is entirely in how the link reads to a human.
          </p>

          <h2>Checking a short URL before you open it</h2>
          <p>
            Because a short URL hides its destination, treat unfamiliar ones with care. The{' '}
            <Link href="/url-expander">URL expander</Link> resolves a short link and shows you where
            it leads without opening it, and the{' '}
            <Link href="/url-checker">URL checker</Link> breaks any address down into its protocol,
            host, path and parameters.
          </p>
        </>
      }
    />
  );
}
