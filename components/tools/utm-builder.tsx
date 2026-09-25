'use client';

import { useMemo, useState } from 'react';
import { Alert, Field, INPUT_CLASS } from '@/components/ui';
import { CopyButton } from '@/components/shortener/copy-button';
import { cn } from '@/lib/utils/cn';

/**
 * UTM campaign URL builder.
 *
 * Builds the URL in the browser and preserves any parameters already present on
 * the base URL. Values are lowercased because analytics tools treat
 * `Newsletter` and `newsletter` as separate sources, which silently fragments
 * campaign reports.
 */

const FIELDS = [
  {
    key: 'utm_source',
    label: 'Campaign source',
    placeholder: 'newsletter',
    hint: 'Where the traffic comes from, such as newsletter, google or twitter.',
    required: true,
  },
  {
    key: 'utm_medium',
    label: 'Campaign medium',
    placeholder: 'email',
    hint: 'The channel type, such as email, cpc, social or referral.',
    required: true,
  },
  {
    key: 'utm_campaign',
    label: 'Campaign name',
    placeholder: 'spring-sale',
    hint: 'The specific campaign this link belongs to.',
    required: true,
  },
  {
    key: 'utm_term',
    label: 'Campaign term',
    placeholder: 'running-shoes',
    hint: 'Paid keyword, if this is a search ad.',
    required: false,
  },
  {
    key: 'utm_content',
    label: 'Campaign content',
    placeholder: 'header-button',
    hint: 'Distinguishes two links to the same place in the same campaign.',
    required: false,
  },
] as const;

type FieldKey = (typeof FIELDS)[number]['key'];

export function UtmBuilder() {
  const [baseUrl, setBaseUrl] = useState('');
  const [values, setValues] = useState<Record<FieldKey, string>>({
    utm_source: '',
    utm_medium: '',
    utm_campaign: '',
    utm_term: '',
    utm_content: '',
  });

  const result = useMemo(() => build(baseUrl, values), [baseUrl, values]);

  function update(key: FieldKey, value: string) {
    setValues((previous) => ({ ...previous, [key]: value }));
  }

  return (
    <div className="space-y-5">
      <Field
        id="utm-base"
        label="Destination URL"
        hint="The page people should land on. Existing parameters are kept."
        required
      >
        <input
          id="utm-base"
          type="url"
          inputMode="url"
          value={baseUrl}
          onChange={(event) => setBaseUrl(event.target.value)}
          placeholder="https://example.com/pricing"
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          className={cn(INPUT_CLASS, 'h-11')}
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        {FIELDS.map((field) => (
          <Field
            key={field.key}
            id={`utm-${field.key}`}
            label={field.label}
            hint={field.hint}
            required={field.required}
          >
            <input
              id={`utm-${field.key}`}
              type="text"
              value={values[field.key]}
              onChange={(event) => update(field.key, event.target.value)}
              placeholder={field.placeholder}
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              className={cn(INPUT_CLASS, 'h-11')}
            />
          </Field>
        ))}
      </div>

      {result.error ? (
        <Alert tone="danger">{result.error}</Alert>
      ) : result.url ? (
        <div className="rounded-lg border border-border bg-surface p-4">
          <p className="text-2xs font-semibold tracking-widest text-faint uppercase">
            Campaign URL
          </p>
          <div className="mt-2 flex items-start gap-3">
            <p className="min-w-0 flex-1 font-mono text-sm break-all text-ink">{result.url}</p>
            <CopyButton value={result.url} />
          </div>

          {result.missing.length > 0 ? (
            <p className="mt-3 border-t border-border pt-3 text-xs text-warning">
              Most analytics tools expect source, medium and campaign. Still missing:{' '}
              {result.missing.join(', ')}.
            </p>
          ) : null}

          {result.normalised ? (
            <p className="mt-3 border-t border-border pt-3 text-xs text-subtle">
              Values were lowercased. Analytics tools treat differing capitalisation as separate
              values, which splits one campaign into several rows in reports.
            </p>
          ) : null}
        </div>
      ) : (
        <p className="text-sm text-subtle">
          Enter a destination URL and at least one parameter to build your campaign link.
        </p>
      )}
    </div>
  );
}

type BuildResult = {
  url: string | null;
  error: string | null;
  missing: string[];
  normalised: boolean;
};

function build(baseUrl: string, values: Record<FieldKey, string>): BuildResult {
  const trimmedBase = baseUrl.trim();
  const provided = FIELDS.filter((field) => values[field.key].trim().length > 0);

  if (trimmedBase.length === 0 || provided.length === 0) {
    return { url: null, error: null, missing: [], normalised: false };
  }

  let url: URL;
  try {
    url = new URL(trimmedBase.includes('://') ? trimmedBase : `https://${trimmedBase}`);
  } catch {
    return {
      url: null,
      error: 'That destination URL is not valid.',
      missing: [],
      normalised: false,
    };
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return {
      url: null,
      error: 'Campaign URLs must use http or https.',
      missing: [],
      normalised: false,
    };
  }

  let normalised = false;
  for (const field of provided) {
    const raw = values[field.key].trim();
    const lower = raw.toLowerCase();
    if (lower !== raw) normalised = true;
    url.searchParams.set(field.key, lower);
  }

  const missing = FIELDS.filter(
    (field) => field.required && values[field.key].trim().length === 0,
  ).map((field) => field.key);

  return { url: url.toString(), error: null, missing, normalised };
}
