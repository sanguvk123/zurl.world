'use client';

import { useState } from 'react';
import { Alert, Button, EmptyState, INPUT_CLASS } from '@/components/ui';
import { CopyButton } from '@/components/shortener/copy-button';
import { cn } from '@/lib/utils/cn';

/**
 * API key management.
 *
 * A newly created key is shown exactly once, prominently, with a clear warning
 * that it cannot be retrieved later — because only its hash is stored.
 */

type KeySummary = {
  id: string;
  name: string;
  prefix: string;
  createdAt: string;
  lastUsedAt: string | null;
};

export function ApiKeyManager({ initialKeys }: { initialKeys: KeySummary[] }) {
  const [keys, setKeys] = useState(initialKeys);
  const [name, setName] = useState('');
  const [created, setCreated] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function create(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;

    setPending(true);
    setError(null);
    setCreated(null);

    try {
      const response = await fetch('/api/keys', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: name || 'API key' }),
      });

      const payload: unknown = await response.json();

      if (!response.ok) {
        setError('Could not create an API key.');
        return;
      }

      if (
        payload &&
        typeof payload === 'object' &&
        'data' in payload &&
        payload.data &&
        typeof payload.data === 'object'
      ) {
        const data = payload.data as Record<string, unknown>;
        if (typeof data.key === 'string') setCreated(data.key);
        if (data.record && typeof data.record === 'object') {
          setKeys((previous) => [data.record as KeySummary, ...previous]);
        }
      }

      setName('');
    } catch {
      setError('Could not reach Zurl. Check your connection and try again.');
    } finally {
      setPending(false);
    }
  }

  async function revoke(id: string) {
    const response = await fetch(`/api/keys/${id}`, { method: 'DELETE' });
    if (response.ok) {
      setKeys((previous) => previous.filter((key) => key.id !== id));
    } else {
      setError('Could not revoke that key.');
    }
  }

  return (
    <div className="space-y-4">
      {created ? (
        <Alert tone="warning">
          <p className="font-medium">Copy this key now.</p>
          <p className="mt-1">
            It will not be shown again — Zurl stores only a hash of it, so it cannot be recovered.
          </p>
          <div className="mt-3 flex items-center gap-2">
            <code className="min-w-0 flex-1 overflow-x-auto rounded bg-canvas px-2 py-1.5 font-mono text-xs text-ink">
              {created}
            </code>
            <CopyButton value={created} />
          </div>
        </Alert>
      ) : null}

      {error ? <Alert tone="danger">{error}</Alert> : null}

      <form onSubmit={create} className="flex flex-col gap-2 sm:flex-row">
        <label htmlFor="key-name" className="sr-only">
          Key name
        </label>
        <input
          id="key-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Key name, e.g. production"
          maxLength={64}
          className={cn(INPUT_CLASS, 'h-11 flex-1')}
        />
        <Button type="submit" disabled={pending} className="shrink-0">
          {pending ? 'Creating…' : 'Create key'}
        </Button>
      </form>

      {keys.length === 0 ? (
        <EmptyState
          title="No API keys"
          description="Create a key to start using the Zurl API from your own applications."
        />
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-surface">
          {keys.map((key) => (
            <li key={key.id} className="flex items-center justify-between gap-4 px-4 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm text-ink">{key.name}</p>
                <p className="mt-0.5 font-mono text-xs text-subtle">{key.prefix}…</p>
                <p className="mt-0.5 text-2xs text-faint">
                  Created {formatDate(key.createdAt)}
                  {key.lastUsedAt ? ` · last used ${formatDate(key.lastUsedAt)}` : ' · never used'}
                </p>
              </div>
              <Button variant="danger" size="sm" onClick={() => revoke(key.id)}>
                Revoke
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}
