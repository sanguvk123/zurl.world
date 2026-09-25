import Link from 'next/link';
import { Container, SectionHeading } from '@/components/ui';
import { relatedLinksFor } from '@/lib/seo/internal-links';
import type { FaqItem } from '@/lib/seo/structured-data';
import { cn } from '@/lib/utils/cn';

/**
 * Shared marketing sections.
 *
 * Reused across the homepage and the tool landing pages so layout stays
 * consistent. Each page supplies its own copy — the components are structure,
 * not content, which is what keeps the tool pages from being duplicates.
 */

export function Section({
  className,
  children,
  id,
  ...props
}: React.ComponentProps<'section'>) {
  return (
    <section id={id} className={cn('py-14 sm:py-20', className)} {...props}>
      <Container>{children}</Container>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Feature grid
// ---------------------------------------------------------------------------

export type Feature = { title: string; description: string };

export function FeatureGrid({
  eyebrow,
  title,
  description,
  features,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  features: readonly Feature[];
}) {
  return (
    <Section>
      <SectionHeading
        {...(eyebrow ? { eyebrow } : {})}
        title={title}
        {...(description ? { description } : {})}
      />
      <ul className="mt-10 grid gap-x-8 gap-y-9 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((feature) => (
          <li key={feature.title}>
            <h3 className="text-[0.9375rem] font-semibold text-ink">{feature.title}</h3>
            <p className="mt-1.5 text-sm leading-6 text-muted">{feature.description}</p>
          </li>
        ))}
      </ul>
    </Section>
  );
}

// ---------------------------------------------------------------------------
// Steps
// ---------------------------------------------------------------------------

export type Step = { title: string; description: string };

export function HowItWorks({
  title = 'How it works',
  steps,
}: {
  title?: string;
  steps: readonly Step[];
}) {
  return (
    <Section className="border-y border-border bg-surface/30">
      <SectionHeading title={title} />
      <ol className="mt-10 grid gap-8 sm:grid-cols-3">
        {steps.map((step, index) => (
          <li key={step.title} className="relative">
            <span
              className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-accent-muted font-mono text-sm font-medium text-accent"
              aria-hidden="true"
            >
              {index + 1}
            </span>
            <h3 className="mt-3 text-[0.9375rem] font-semibold text-ink">
              <span className="sr-only">Step {index + 1}: </span>
              {step.title}
            </h3>
            <p className="mt-1.5 text-sm leading-6 text-muted">{step.description}</p>
          </li>
        ))}
      </ol>
    </Section>
  );
}

// ---------------------------------------------------------------------------
// FAQ
// ---------------------------------------------------------------------------

/**
 * FAQ list.
 *
 * Uses native `<details>`: keyboard accessible and expandable with zero
 * JavaScript, and the answers are in the DOM for crawlers even when collapsed.
 */
export function Faq({
  title = 'Frequently asked questions',
  items,
}: {
  title?: string;
  items: readonly FaqItem[];
}) {
  return (
    <Section id="faq">
      <SectionHeading title={title} />
      <dl className="mt-8 max-w-3xl divide-y divide-border border-y border-border">
        {items.map((item) => (
          <div key={item.question} className="py-1">
            <details className="group">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded-md py-3.5 text-[0.9375rem] font-medium text-ink marker:content-none hover:text-accent">
                <dt>{item.question}</dt>
                <svg
                  viewBox="0 0 16 16"
                  fill="none"
                  aria-hidden="true"
                  className="h-4 w-4 shrink-0 text-faint transition-transform group-open:rotate-45"
                >
                  <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </summary>
              <dd className="pr-8 pb-4 text-sm leading-7 text-muted">{item.answer}</dd>
            </details>
          </div>
        ))}
      </dl>
    </Section>
  );
}

// ---------------------------------------------------------------------------
// Internal links
// ---------------------------------------------------------------------------

/**
 * Related tools, generated from the internal-link graph.
 * This is what keeps every tool page reachable and prevents orphans.
 */
export function RelatedTools({ path, title = 'Related tools' }: { path: string; title?: string }) {
  const links = relatedLinksFor(path);
  if (links.length === 0) return null;

  return (
    <Section className="border-t border-border">
      <h2 className="text-lg font-semibold tracking-tight text-ink">{title}</h2>
      <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {links.map((link) => (
          <li key={link.path}>
            <Link
              href={link.path}
              className="block h-full rounded-lg border border-border bg-surface p-4 transition-colors hover:border-border-strong hover:bg-surface-raised"
            >
              <span className="text-sm font-medium text-ink">{link.label}</span>
              <span className="mt-1 block text-sm leading-6 text-subtle">{link.blurb}</span>
            </Link>
          </li>
        ))}
      </ul>
    </Section>
  );
}

// ---------------------------------------------------------------------------
// Breadcrumbs
// ---------------------------------------------------------------------------

export function Breadcrumbs({ items }: { items: readonly { name: string; path: string }[] }) {
  return (
    <nav aria-label="Breadcrumb" className="pt-8">
      <Container>
        <ol className="flex flex-wrap items-center gap-1.5 text-xs text-subtle">
          {items.map((item, index) => {
            const isLast = index === items.length - 1;
            return (
              <li key={item.path} className="flex items-center gap-1.5">
                {isLast ? (
                  <span aria-current="page" className="text-muted">
                    {item.name}
                  </span>
                ) : (
                  <>
                    <Link href={item.path} className="transition-colors hover:text-ink">
                      {item.name}
                    </Link>
                    <span aria-hidden="true" className="text-faint">
                      /
                    </span>
                  </>
                )}
              </li>
            );
          })}
        </ol>
      </Container>
    </nav>
  );
}

// ---------------------------------------------------------------------------
// Final CTA
// ---------------------------------------------------------------------------

export function FinalCta({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children?: React.ReactNode;
}) {
  return (
    <Section className="border-t border-border">
      <div className="rounded-xl border border-border bg-surface px-6 py-10 sm:px-10 sm:py-12">
        <h2 className="text-2xl font-semibold tracking-tight text-ink text-balance">{title}</h2>
        {description ? (
          <p className="mt-2 max-w-xl text-[0.9375rem] leading-7 text-muted">{description}</p>
        ) : null}
        {children ? <div className="mt-6 max-w-2xl">{children}</div> : null}
      </div>
    </Section>
  );
}

// ---------------------------------------------------------------------------
// JSON-LD
// ---------------------------------------------------------------------------

/** Renders a JSON-LD graph. The payload is built server-side from our own data. */
export function JsonLd({ json }: { json: string }) {
  return (
    <script
      type="application/ld+json"
      // Not user input: generated by lib/seo/structured-data from static content.
      dangerouslySetInnerHTML={{ __html: json }}
    />
  );
}
