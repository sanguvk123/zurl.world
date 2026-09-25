'use client';

import { useState } from 'react';
import { Alert, Button, Field, INPUT_CLASS } from '@/components/ui';
import { cn } from '@/lib/utils/cn';

/**
 * Password prompt for a protected link.
 *
 * The destination is returned by the API only after the password verifies, and
 * navigation happens client-side. The destination is never present in the page
 * source beforehand.
 */
export function PasswordPrompt({ code }: { code: string }) {
  const [password, setPassword] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;

    setPending(true);
    setError(null);

    try {
      const response = await fetch(`/api/protected/${encodeURIComponent(code)}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      const payload: unknown = await response.json();

      if (!response.ok) {
        setError(
          response.status === 429
            ? 'Too many attempts. Try again in a few minutes.'
            : 'That password is not correct.',
        );
        return;
      }

      if (
        payload &&
        typeof payload === 'object' &&
        'data' in payload &&
        payload.data &&
        typeof payload.data === 'object' &&
        'destinationUrl' in payload.data &&
        typeof payload.data.destinationUrl === 'string'
      ) {
        window.location.href = payload.data.destinationUrl;
        return;
      }

      setError('Something went wrong. Please try again.');
    } catch {
      setError('Could not reach Zurl. Check your connection and try again.');
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <Field id="link-password" label="Password" error={error ?? undefined} required>
        <input
          id="link-password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="off"
          autoFocus
          required
          aria-invalid={error ? true : undefined}
          className={cn(INPUT_CLASS, 'h-11')}
        />
      </Field>

      {error ? (
        <Alert tone="danger" className="sr-only">
          {error}
        </Alert>
      ) : null}

      <Button type="submit" disabled={pending} className="w-full">
        {pending ? 'Checking…' : 'Continue'}
      </Button>
    </form>
  );
}
