'use client';

import { useMemo, useState } from 'react';
import { Alert, INPUT_CLASS } from '@/components/ui';
import { cn } from '@/lib/utils/cn';

/**
 * URL checker.
 *
 * Parses a URL entirely in the browser and breaks it into its components. No
 * request is made and nothing is sent anywhere, which is deliberate — people
 * paste links here precisely because they are unsure about them.
 */

type Part = { label: string; value: string; note?: string };

export function UrlChecker() {
  const [input, setInput] = useState('');

  const analysis = useMemo(() => analyse(input), [input]);

  return (
    <div>
      <label htmlFor="check-url" className="sr-only">
        URL to inspect
      </label>
      <input
        id="check-url"
        type="text"
        inputMode="url"
        value={input}
        onChange={(event) => setInput(event.target.value)}
        placeholder="Paste any URL to inspect it..."
        autoComplete="off"
        autoCapitalize="none"
        spellCheck={false}
        className={cn(INPUT_CLASS, 'h-12 text-base')}
      />

      {input.trim().length === 0 ? (
        <p className="mt-3 text-sm text-subtle">
          Everything is parsed in your browser. Nothing is sent to Zurl.
        </p>
      ) : analysis.error ? (
        <Alert tone="danger" className="mt-4">
          {analysis.error}
        </Alert>
      ) : (
        <div className="mt-4 space-y-4">
          {analysis.warnings.length > 0 ? (
            <div className="space-y-2">
              {analysis.warnings.map((warning) => (
                <Alert key={warning} tone="warning">
                  {warning}
                </Alert>
              ))}
            </div>
          ) : null}

          <div className="overflow-hidden rounded-lg border border-border bg-surface">
            <dl className="divide-y divide-border">
              {analysis.parts.map((part) => (
                <div key={part.label} className="grid gap-1 px-4 py-3 sm:grid-cols-[9rem_1fr]">
                  <dt className="text-xs font-medium text-subtle">{part.label}</dt>
                  <dd className="min-w-0">
                    <span className="font-mono text-sm break-all text-ink">{part.value}</span>
                    {part.note ? (
                      <span className="mt-0.5 block text-xs text-faint">{part.note}</span>
                    ) : null}
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          {analysis.params.length > 0 ? (
            <div className="overflow-hidden rounded-lg border border-border bg-surface">
              <p className="border-b border-border px-4 py-2.5 text-2xs font-semibold tracking-widest text-faint uppercase">
                Query parameters ({analysis.params.length})
              </p>
              <dl className="divide-y divide-border">
                {analysis.params.map((param, index) => (
                  <div
                    key={`${param.label}-${index}`}
                    className="grid gap-1 px-4 py-2.5 sm:grid-cols-[9rem_1fr]"
                  >
                    <dt className="font-mono text-xs text-accent">{param.label}</dt>
                    <dd className="min-w-0 font-mono text-sm break-all text-muted">
                      {param.value || <span className="text-faint">(empty)</span>}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

type Analysis = {
  error: string | null;
  parts: Part[];
  params: Part[];
  warnings: string[];
};

function analyse(raw: string): Analysis {
  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    return { error: null, parts: [], params: [], warnings: [] };
  }

  let url: URL;
  try {
    url = new URL(trimmed.includes('://') ? trimmed : `https://${trimmed}`);
  } catch {
    return {
      error: 'That is not a valid URL. Check for typos or missing characters.',
      parts: [],
      params: [],
      warnings: [],
    };
  }

  const warnings: string[] = [];

  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    warnings.push(
      `This uses the ${url.protocol} scheme, not http or https. Links like this cannot be shortened and should be treated with caution.`,
    );
  } else if (url.protocol === 'http:') {
    warnings.push('This uses http, not https. The connection would not be encrypted.');
  }

  if (url.username || url.password) {
    warnings.push(
      'This URL contains embedded credentials before the @ sign. This is a common technique for making a link appear to point at a trusted site.',
    );
  }

  if (url.hostname.startsWith('xn--') || url.hostname.includes('.xn--')) {
    warnings.push(
      'The domain uses punycode, meaning it contains non-ASCII characters. These can be used to imitate a familiar domain name.',
    );
  }

  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(url.hostname)) {
    warnings.push('This points at a raw IP address rather than a domain name.');
  }

  if (url.hostname.split('.').length > 5) {
    warnings.push(
      'This domain has an unusual number of subdomains, which is sometimes used to make a hostname resemble a trusted one.',
    );
  }

  const parts: Part[] = [
    {
      label: 'Protocol',
      value: url.protocol.replace(':', ''),
      note: url.protocol === 'https:' ? 'Encrypted connection' : undefined,
    },
    { label: 'Host', value: url.hostname },
  ];

  if (url.port) parts.push({ label: 'Port', value: url.port });
  parts.push({ label: 'Path', value: url.pathname || '/' });
  if (url.hash) parts.push({ label: 'Fragment', value: url.hash.slice(1) });

  parts.push({ label: 'Full length', value: `${trimmed.length} characters` });

  const params: Part[] = [];
  url.searchParams.forEach((value, key) => {
    params.push({ label: key, value });
  });

  return { error: null, parts, params, warnings };
}
