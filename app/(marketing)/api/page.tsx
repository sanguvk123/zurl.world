import type { Metadata } from 'next';
import Link from 'next/link';
import { Container, Prose } from '@/components/ui';
import { Breadcrumbs, Faq, JsonLd, RelatedTools, Section } from '@/components/marketing/sections';
import { buildMetadata } from '@/lib/seo/metadata';
import { breadcrumbSchema, buildJsonLd, faqSchema, type FaqItem } from '@/lib/seo/structured-data';
import { RATE_LIMITS } from '@/lib/security/rate-limit';

export const metadata: Metadata = buildMetadata({
  title: 'API Documentation – Create Short Links Programmatically',
  description:
    'Zurl REST API reference: authentication with API keys, creating and managing links, retrieving analytics, error codes and rate limits.',
  path: '/api',
});

const FAQS: readonly FaqItem[] = [
  {
    question: 'How do I get an API key?',
    answer:
      'Create a free account, then generate a key from your account page. The key is shown once at creation and only a hash is stored, so it cannot be retrieved afterwards — save it somewhere safe.',
  },
  {
    question: 'Is API access included on the free plan?',
    answer:
      'Yes. Free accounts can create API keys and make up to 1,000 link creations and 2,000 read requests per hour.',
  },
  {
    question: 'What happens if I exceed the rate limit?',
    answer:
      'You receive a 429 response with a Retry-After header giving the number of seconds to wait. Every response also carries RateLimit-Limit, RateLimit-Remaining and RateLimit-Reset headers, so you can back off before hitting the limit.',
  },
  {
    question: 'Are the API and the website subject to the same rules?',
    answer:
      'Yes. Both go through the same service layer, so URL validation, reserved names and alias rules behave identically. There is no API-only behaviour to discover.',
  },
  {
    question: 'Why do I get 404 instead of 403 for a link I do not own?',
    answer:
      'Deliberately. Returning 403 would confirm that the id exists, which turns the endpoint into a way of probing for valid identifiers. Links you do not own are indistinguishable from links that do not exist.',
  },
  {
    question: 'Is there a webhook for click events?',
    answer:
      'Not yet. Analytics is available by polling the analytics endpoint. Webhooks are on the roadmap but not implemented, so do not build against them.',
  },
];

const ENDPOINTS = [
  {
    method: 'POST',
    path: '/api/v1/links',
    summary: 'Create a short link.',
  },
  {
    method: 'GET',
    path: '/api/v1/links',
    summary: 'List your links. Supports limit and offset.',
  },
  {
    method: 'GET',
    path: '/api/v1/links/:id',
    summary: 'Retrieve a single link.',
  },
  {
    method: 'PATCH',
    path: '/api/v1/links/:id',
    summary: 'Update the destination, title, expiry or disabled state.',
  },
  {
    method: 'DELETE',
    path: '/api/v1/links/:id',
    summary: 'Delete a link permanently.',
  },
  {
    method: 'GET',
    path: '/api/v1/links/:id/analytics',
    summary: 'Aggregate analytics. Supports a days parameter, 1 to 365.',
  },
] as const;

const ERRORS = [
  { code: 'validation_error', status: '400', meaning: 'The request body failed validation.' },
  { code: 'invalid_url', status: '400', meaning: 'The destination URL was rejected.' },
  { code: 'unauthorized', status: '401', meaning: 'Missing, malformed or revoked API key.' },
  { code: 'not_found', status: '404', meaning: 'No such link, or it belongs to another account.' },
  { code: 'alias_taken', status: '409', meaning: 'That custom alias is already in use.' },
  { code: 'alias_reserved', status: '409', meaning: 'That alias is reserved and cannot be used.' },
  { code: 'payload_too_large', status: '413', meaning: 'The request body exceeded 16KB.' },
  { code: 'rate_limited', status: '429', meaning: 'Rate limit exceeded. See Retry-After.' },
  { code: 'internal_error', status: '500', meaning: 'Something went wrong on our side.' },
] as const;

function Code({ children }: { children: string }) {
  return (
    <pre className="mt-3 overflow-x-auto rounded-lg border border-border bg-canvas p-4 font-mono text-xs leading-6 text-muted">
      <code>{children}</code>
    </pre>
  );
}

export default function ApiPage() {
  const breadcrumbs = [
    { name: 'Home', path: '/' },
    { name: 'API', path: '/api' },
  ];

  return (
    <>
      <JsonLd json={buildJsonLd(faqSchema(FAQS), breadcrumbSchema(breadcrumbs))} />
      <Breadcrumbs items={breadcrumbs} />

      <Section className="pt-8 pb-10">
        <h1 className="text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
          API documentation
        </h1>
        <p className="mt-3 max-w-2xl text-[0.9375rem] leading-7 text-muted">
          Create and manage short links from your own applications. A small REST API with API key
          authentication and predictable JSON responses.
        </p>
      </Section>

      <Container>
        <Prose className="max-w-3xl">
          <h2>Quick start</h2>
          <p>
            Create a <Link href="/signup">free account</Link>, generate an API key from your account
            page, then create your first link:
          </p>
          <Code>{`curl -X POST https://zurl.world/api/v1/links \\
  -H "Authorization: Bearer zurl_sk_YOUR_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"url": "https://example.com/a-long-page"}'`}</Code>

          <p>Response:</p>
          <Code>{`{
  "ok": true,
  "data": {
    "id": "lnk_2f9c1a...",
    "shortCode": "a8K3xPq",
    "shortUrl": "https://zurl.world/a8K3xPq",
    "destinationUrl": "https://example.com/a-long-page",
    "title": null,
    "custom": false,
    "state": "active",
    "hasPassword": false,
    "clicks": 0,
    "createdAt": "2026-03-14T10:00:00.000Z",
    "updatedAt": "2026-03-14T10:00:00.000Z",
    "expiresAt": null,
    "lastClickedAt": null
  }
}`}</Code>

          <h2>Authentication</h2>
          <p>
            Every request carries an API key as a Bearer token. Keys begin{' '}
            <code>zurl_sk_</code> and are shown once at creation — only a hash is stored, so a lost
            key must be revoked and replaced rather than recovered.
          </p>
          <Code>{`Authorization: Bearer zurl_sk_YOUR_KEY`}</Code>
          <p>
            Treat a key as a password. It carries the full permissions of the account that created
            it, so keep it server-side and out of version control.
          </p>

          <h2>Response envelope</h2>
          <p>
            Successful responses are <code>{`{ "ok": true, "data": ... }`}</code>. Errors are{' '}
            <code>{`{ "ok": false, "error": { "code", "message", "field?" } }`}</code>. Branch on{' '}
            <code>code</code>, which is stable; <code>message</code> is written for humans and may
            change.
          </p>

          <h2>Endpoints</h2>
        </Prose>

        <div className="mt-4 max-w-3xl overflow-hidden rounded-lg border border-border">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface-raised">
              <tr>
                <th scope="col" className="px-4 py-2.5 text-xs font-semibold text-subtle">
                  Method
                </th>
                <th scope="col" className="px-4 py-2.5 text-xs font-semibold text-subtle">
                  Path
                </th>
                <th scope="col" className="px-4 py-2.5 text-xs font-semibold text-subtle">
                  Description
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-surface">
              {ENDPOINTS.map((endpoint) => (
                <tr key={`${endpoint.method} ${endpoint.path}`}>
                  <td className="px-4 py-2.5 font-mono text-xs text-accent">{endpoint.method}</td>
                  <td className="px-4 py-2.5 font-mono text-xs break-all text-ink">
                    {endpoint.path}
                  </td>
                  <td className="px-4 py-2.5 text-xs text-muted">{endpoint.summary}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <Prose className="mt-10 max-w-3xl">
          <h2>Creating a link</h2>
          <p>
            <code>url</code> is required. Everything else is optional.
          </p>
          <Code>{`{
  "url": "https://example.com/page",   // required
  "alias": "spring-sale",              // optional custom ending
  "title": "Spring campaign",          // optional label
  "password": "hunter2",               // optional, min 4 characters
  "expiresAt": "2026-12-31T23:59:59Z"  // optional ISO 8601
}`}</Code>

          <h2>Updating a link</h2>
          <p>
            Send only the fields you want to change. The short code itself cannot be changed,
            because doing so would break every copy already shared.
          </p>
          <Code>{`curl -X PATCH https://zurl.world/api/v1/links/lnk_2f9c1a \\
  -H "Authorization: Bearer zurl_sk_YOUR_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"url": "https://example.com/new-destination", "disabled": false}'`}</Code>

          <h2>Analytics</h2>
          <Code>{`curl "https://zurl.world/api/v1/links/lnk_2f9c1a/analytics?days=30" \\
  -H "Authorization: Bearer zurl_sk_YOUR_KEY"`}</Code>
          <p>
            Returns total clicks, a daily series, and breakdowns by country, referrer, device,
            browser and operating system. Individual visitors are not exposed, because that data is
            never collected — see <Link href="/privacy">privacy</Link>.
          </p>

          <h2>Errors</h2>
        </Prose>

        <div className="mt-4 max-w-3xl overflow-hidden rounded-lg border border-border">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface-raised">
              <tr>
                <th scope="col" className="px-4 py-2.5 text-xs font-semibold text-subtle">
                  Code
                </th>
                <th scope="col" className="px-4 py-2.5 text-xs font-semibold text-subtle">
                  Status
                </th>
                <th scope="col" className="px-4 py-2.5 text-xs font-semibold text-subtle">
                  Meaning
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-surface">
              {ERRORS.map((error) => (
                <tr key={error.code}>
                  <td className="px-4 py-2.5 font-mono text-xs text-ink">{error.code}</td>
                  <td className="px-4 py-2.5 font-mono text-xs text-muted">{error.status}</td>
                  <td className="px-4 py-2.5 text-xs text-muted">{error.meaning}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <Prose className="mt-10 max-w-3xl">
          <h2>Rate limits</h2>
          <ul>
            <li>
              <strong>Link creation:</strong> {RATE_LIMITS.createLinkApi.limit.toLocaleString()} per
              hour, per key.
            </li>
            <li>
              <strong>Reads:</strong> {RATE_LIMITS.apiRead.limit.toLocaleString()} per hour, per
              key.
            </li>
          </ul>
          <p>Every response includes:</p>
          <Code>{`RateLimit-Limit: 1000
RateLimit-Remaining: 994
RateLimit-Reset: 2841`}</Code>
          <p>
            On a 429, <code>Retry-After</code> gives the seconds to wait. Back off rather than
            retrying immediately.
          </p>

          <h2>Versioning</h2>
          <p>
            The version is in the path. Breaking changes will ship as <code>/api/v2</code> rather
            than altering v1 responses. Additive fields may appear in v1, so parse defensively and
            ignore unknown keys.
          </p>
        </Prose>
      </Container>

      <Faq items={FAQS} />
      <RelatedTools path="/api" />
    </>
  );
}
