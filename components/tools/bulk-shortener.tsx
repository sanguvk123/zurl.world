'use client';

import { useState } from 'react';
import { Alert, Button, Textarea } from '@/components/ui';
import { CopyButton } from '@/components/shortener/copy-button';

/**
 * Bulk URL shortener.
 *
 * Submits one URL at a time, sequentially, with a small delay between requests.
 * Sequential submission keeps every link subject to the same validation and
 * rate limiting as a single create, and avoids a burst that would trip the
 * limiter on the user's own behalf.
 */

const MAX_URLS = 20;

type Row =
  | { input: string; status: 'pending' }
  | { input: string; status: 'done'; shortUrl: string }
  | { input: string; status: 'failed'; message: string };

export function BulkShortener() {
  const [text, setText] = useState('');
  const [rows, setRows] = useState<Row[]>([]);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (running) return;

    const urls = text
      .split(/[\n,]/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    if (urls.length === 0) {
      setError('Enter at least one URL, one per line.');
      return;
    }

    if (urls.length > MAX_URLS) {
      setError(`Up to ${MAX_URLS} URLs at a time. You entered ${urls.length}.`);
      return;
    }

    setError(null);
    setRunning(true);
    setRows(urls.map((input) => ({ input, status: 'pending' })));

    for (let index = 0; index < urls.length; index += 1) {
      const input = urls[index] as string;
      const row = await shorten(input);
      setRows((previous) => previous.map((item, i) => (i === index ? row : item)));

      // Small gap between requests so a batch does not look like an attack.
      if (index < urls.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 120));
      }
    }

    setRunning(false);
  }

  const succeeded = rows.filter((row): row is Extract<Row, { status: 'done' }> => row.status === 'done');
  const allShortUrls = succeeded.map((row) => row.shortUrl).join('\n');

  return (
    <div>
      <Alert tone="info" className="mb-4">
        You can shorten up to {MAX_URLS} links at a time. Anonymous use is limited to 10 links per
        hour, so sign in for larger or repeated batches.
      </Alert>

      <form onSubmit={onSubmit} noValidate>
        <label htmlFor="bulk-urls" className="block text-sm font-medium text-ink">
          URLs, one per line
        </label>
        <Textarea
          id="bulk-urls"
          value={text}
          onChange={(event) => setText(event.target.value)}
          rows={7}
          placeholder={'https://example.com/page-one\nhttps://example.com/page-two'}
          spellCheck={false}
          autoCapitalize="none"
          className="mt-1.5 font-mono text-sm"
        />

        <div className="mt-3 flex items-center gap-3">
          <Button type="submit" disabled={running}>
            {running ? 'Shortening…' : 'Shorten all'}
          </Button>
          <p className="text-xs text-subtle">Up to {MAX_URLS} at a time.</p>
        </div>
      </form>

      {error ? (
        <Alert tone="danger" className="mt-4">
          {error}
        </Alert>
      ) : null}

      {rows.length > 0 ? (
        <div className="mt-5">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted">
              {succeeded.length} of {rows.length} shortened
            </p>
            {succeeded.length > 0 ? (
              <CopyButton value={allShortUrls} label="Copy all" variant="ghost" />
            ) : null}
          </div>

          <ul className="mt-3 divide-y divide-border overflow-hidden rounded-lg border border-border bg-surface">
            {rows.map((row, index) => (
              <li key={`${row.input}-${index}`} className="px-4 py-3">
                <p className="truncate font-mono text-xs text-subtle" title={row.input}>
                  {row.input}
                </p>
                {row.status === 'pending' ? (
                  <p className="mt-1 text-sm text-faint">Waiting…</p>
                ) : row.status === 'done' ? (
                  <div className="mt-1 flex items-center gap-2">
                    <a
                      href={row.shortUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="truncate font-mono text-sm text-accent hover:underline"
                    >
                      {row.shortUrl.replace(/^https?:\/\//, '')}
                    </a>
                    <CopyButton value={row.shortUrl} variant="ghost" />
                  </div>
                ) : (
                  <p className="mt-1 flex items-start gap-1.5 text-sm text-danger">
                    <span aria-hidden="true">✕</span>
                    <span>{row.message}</span>
                  </p>
                )}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

async function shorten(input: string): Promise<Row> {
  try {
    const response = await fetch('/api/links', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ url: input }),
    });

    const payload: unknown = await response.json();

    if (!response.ok) {
      const message =
        payload &&
        typeof payload === 'object' &&
        'error' in payload &&
        payload.error &&
        typeof payload.error === 'object' &&
        'message' in payload.error &&
        typeof payload.error.message === 'string'
          ? payload.error.message
          : 'Could not shorten this URL.';
      return { input, status: 'failed', message };
    }

    if (
      payload &&
      typeof payload === 'object' &&
      'data' in payload &&
      payload.data &&
      typeof payload.data === 'object' &&
      'shortUrl' in payload.data &&
      typeof payload.data.shortUrl === 'string'
    ) {
      return { input, status: 'done', shortUrl: payload.data.shortUrl };
    }

    return { input, status: 'failed', message: 'Unexpected response.' };
  } catch {
    return { input, status: 'failed', message: 'Network error.' };
  }
}
