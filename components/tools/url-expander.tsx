'use client';

import { useState } from 'react';
import { Alert, Button, INPUT_CLASS } from '@/components/ui';
import { CopyButton } from '@/components/shortener/copy-button';
import { cn } from '@/lib/utils/cn';

/**
 * URL expander.
 *
 * Resolves a short link and shows the full redirect chain, so a user can see
 * where a link goes before opening it.
 */

type Hop = { url: string; status: number | null };
type Result = { input: string; resolved: string | null; hops: Hop[]; note: string | null };

export function UrlExpander() {
  const [input, setInput] = useState('');
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;

    setPending(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch(`/api/expand?url=${encodeURIComponent(input)}`);
      const payload: unknown = await response.json();

      if (!response.ok) {
        setError(readMessage(payload) ?? 'Could not expand that link.');
        return;
      }

      const data = readResult(payload);
      if (!data) {
        setError('Could not read the response.');
        return;
      }
      setResult(data);
    } catch {
      setError('Could not reach Zurl. Check your connection and try again.');
    } finally {
      setPending(false);
    }
  }

  return (
    <div>
      <form onSubmit={onSubmit} noValidate>
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="flex-1">
            <label htmlFor="expand-url" className="sr-only">
              Short link to expand
            </label>
            <input
              id="expand-url"
              type="url"
              inputMode="url"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Paste a short link..."
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              className={cn(INPUT_CLASS, 'h-12 text-base')}
            />
          </div>
          <Button type="submit" size="lg" disabled={pending} className="h-12 shrink-0">
            {pending ? 'Checking…' : 'Expand'}
          </Button>
        </div>
      </form>

      {error ? (
        <Alert tone="danger" className="mt-4">
          {error}
        </Alert>
      ) : null}

      {result ? (
        <div className="mt-4 rounded-lg border border-border bg-surface p-4">
          {result.resolved ? (
            <>
              <p className="text-2xs font-semibold tracking-widest text-faint uppercase">
                Destination
              </p>
              <div className="mt-1.5 flex items-start gap-3">
                <p className="min-w-0 flex-1 font-mono text-sm break-all text-ink">
                  {result.resolved}
                </p>
                <CopyButton value={result.resolved} variant="ghost" />
              </div>

              {result.hops.length > 1 ? (
                <div className="mt-4 border-t border-border pt-3">
                  <p className="text-2xs font-semibold tracking-widest text-faint uppercase">
                    Redirect chain
                  </p>
                  <ol className="mt-2 space-y-1.5">
                    {result.hops.map((hop, index) => (
                      <li key={`${hop.url}-${index}`} className="flex items-start gap-2 text-xs">
                        <span className="font-mono text-faint tabular-nums">
                          {hop.status ?? '—'}
                        </span>
                        <span className="min-w-0 flex-1 font-mono break-all text-subtle">
                          {hop.url}
                        </span>
                      </li>
                    ))}
                  </ol>
                </div>
              ) : null}

              <p className="mt-4 border-t border-border pt-3 text-xs text-subtle">
                Zurl resolved this link without opening it. Seeing the destination does not mean it
                is safe — Zurl does not scan pages for malware or phishing.
              </p>
            </>
          ) : (
            <Alert tone="warning">{result.note ?? 'Could not resolve that link.'}</Alert>
          )}
        </div>
      ) : null}
    </div>
  );
}

function readMessage(payload: unknown): string | null {
  if (
    payload &&
    typeof payload === 'object' &&
    'error' in payload &&
    payload.error &&
    typeof payload.error === 'object' &&
    'message' in payload.error &&
    typeof payload.error.message === 'string'
  ) {
    return payload.error.message;
  }
  return null;
}

function readResult(payload: unknown): Result | null {
  if (!payload || typeof payload !== 'object' || !('data' in payload)) return null;
  const data = payload.data;
  if (!data || typeof data !== 'object') return null;

  const record = data as Record<string, unknown>;
  return {
    input: typeof record.input === 'string' ? record.input : '',
    resolved: typeof record.resolved === 'string' ? record.resolved : null,
    hops: Array.isArray(record.hops)
      ? record.hops.flatMap((hop): Hop[] => {
          if (!hop || typeof hop !== 'object') return [];
          const entry = hop as Record<string, unknown>;
          if (typeof entry.url !== 'string') return [];
          return [{ url: entry.url, status: typeof entry.status === 'number' ? entry.status : null }];
        })
      : [],
    note: typeof record.note === 'string' ? record.note : null,
  };
}
