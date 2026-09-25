import type { ReactNode } from 'react';
import { Container, Prose } from '@/components/ui';
import {
  Breadcrumbs,
  Faq,
  FeatureGrid,
  HowItWorks,
  JsonLd,
  RelatedTools,
  Section,
  type Feature,
  type Step,
} from './sections';
import {
  breadcrumbSchema,
  buildJsonLd,
  faqSchema,
  softwareApplicationSchema,
  type FaqItem,
} from '@/lib/seo/structured-data';

/**
 * Shared layout for tool landing pages.
 *
 * This component supplies *structure* only. Every page passes its own heading,
 * intro, body copy, features, steps and FAQs, so the pages are genuinely
 * distinct documents rather than a template with a swapped keyword. Pages that
 * host a working tool render it through `tool`.
 */

export type ToolPageProps = {
  path: string;
  /** Rendered as the H1. */
  heading: string;
  /** One or two sentences directly under the H1. */
  intro: string;
  /** The interactive tool, shown immediately below the intro. */
  tool: ReactNode;
  /** Optional caption under the tool. */
  toolNote?: ReactNode;
  features?: { title: string; description?: string; items: readonly Feature[] };
  steps?: { title?: string; items: readonly Step[] };
  /** Long-form explanatory content. Unique per page. */
  body?: ReactNode;
  faqs: readonly FaqItem[];
  /** Name used in the SoftwareApplication schema. */
  appName: string;
  appDescription: string;
  breadcrumbLabel: string;
};

export function ToolPage({
  path,
  heading,
  intro,
  tool,
  toolNote,
  features,
  steps,
  body,
  faqs,
  appName,
  appDescription,
  breadcrumbLabel,
}: ToolPageProps) {
  const breadcrumbs = [
    { name: 'Home', path: '/' },
    { name: 'Tools', path: '/tools' },
    { name: breadcrumbLabel, path },
  ];

  return (
    <>
      <JsonLd
        json={buildJsonLd(
          softwareApplicationSchema({ name: appName, description: appDescription, path }),
          faqSchema(faqs),
          breadcrumbSchema(breadcrumbs),
        )}
      />

      <Breadcrumbs items={breadcrumbs} />

      <Section className="pt-8 pb-10">
        <div className="max-w-3xl">
          <h1 className="text-3xl font-semibold tracking-tight text-ink text-balance sm:text-4xl">
            {heading}
          </h1>
          <p className="mt-4 text-base leading-7 text-muted text-pretty">{intro}</p>
        </div>

        <div className="mt-8 max-w-3xl">{tool}</div>

        {toolNote ? <div className="mt-4 max-w-3xl text-sm text-subtle">{toolNote}</div> : null}
      </Section>

      {features ? (
        <FeatureGrid
          title={features.title}
          {...(features.description ? { description: features.description } : {})}
          features={features.items}
        />
      ) : null}

      {steps ? <HowItWorks {...(steps.title ? { title: steps.title } : {})} steps={steps.items} /> : null}

      {body ? (
        <Section>
          <Container className="px-0">
            <Prose>{body}</Prose>
          </Container>
        </Section>
      ) : null}

      <Faq items={faqs} />

      <RelatedTools path={path} />
    </>
  );
}
