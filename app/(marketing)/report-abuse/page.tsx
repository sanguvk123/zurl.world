import type { Metadata } from 'next';
import Link from 'next/link';
import { Container, Prose } from '@/components/ui';
import { Breadcrumbs, JsonLd, RelatedTools, Section } from '@/components/marketing/sections';
import { AbuseReportForm } from '@/components/tools/abuse-report-form';
import { buildMetadata } from '@/lib/seo/metadata';
import { breadcrumbSchema, buildJsonLd } from '@/lib/seo/structured-data';

export const metadata: Metadata = buildMetadata({
  title: 'Report Abuse – Report a Malicious Zurl Link',
  description:
    'Report a Zurl short link being used for phishing, malware, spam or illegal content. No account needed. Reports go straight to moderation.',
  path: '/report-abuse',
});

type Props = { searchParams: Promise<{ code?: string }> };

export default async function ReportAbusePage({ searchParams }: Props) {
  const params = await searchParams;
  const breadcrumbs = [
    { name: 'Home', path: '/' },
    { name: 'Report Abuse', path: '/report-abuse' },
  ];

  return (
    <>
      <JsonLd json={buildJsonLd(breadcrumbSchema(breadcrumbs))} />
      <Breadcrumbs items={breadcrumbs} />

      <Section className="pt-8 pb-8">
        <h1 className="text-3xl font-semibold tracking-tight text-ink sm:text-4xl">Report abuse</h1>
        <p className="mt-3 max-w-2xl text-[0.9375rem] leading-7 text-muted">
          If a Zurl link is being used for phishing, malware, spam or illegal content, report it
          here. No account is needed and you do not have to give your email address.
        </p>
      </Section>

      <Container>
        <div className="max-w-xl">
          <AbuseReportForm initialCode={params.code ?? ''} />
        </div>
      </Container>

      <Section>
        <Prose>
          <h2>What happens to a report</h2>
          <p>
            Reports go into a moderation queue and are reviewed. A link found to breach the{' '}
            <Link href="/terms">terms of service</Link> is disabled: visitors then see a notice
            instead of being redirected, and the short code is not reissued.
          </p>
          <p>
            Links attracting several independent reports are disabled automatically pending review.
            This errs deliberately toward caution — a wrongly disabled link is an inconvenience that
            can be reversed, while a live phishing link causes real harm for as long as it is up.
          </p>
          <p>
            We do not send updates on individual reports. Supplying an email address is optional and
            only used if we need to ask you something.
          </p>

          <h2>What Zurl can and cannot do</h2>
          <p>
            Zurl controls the redirect, so we can stop a short link from working. We do not host the
            destination content and cannot remove it — for that, contact the host of the destination
            site directly.
          </p>
          <p>
            Zurl does not scan destinations for malware or phishing. Moderation is reactive and
            depends on reports like this one, which is why the form is open to everyone.
          </p>

          <h2>Before reporting</h2>
          <p>
            If you are unsure where a link leads, the{' '}
            <Link href="/url-expander">URL expander</Link> resolves it without opening the page. A
            link being shortened is not itself a problem — most short links are entirely ordinary.
          </p>

          <h2>Urgent cases</h2>
          <p>
            For content involving imminent risk to someone&rsquo;s safety, contact your local
            emergency services or the relevant national authority. Reports here are reviewed by
            people and are not a substitute for law enforcement.
          </p>
        </Prose>
      </Section>

      <RelatedTools path="/report-abuse" />
    </>
  );
}
