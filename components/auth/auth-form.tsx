'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Alert, Button, Field, INPUT_CLASS } from '@/components/ui';
import { MIN_PASSWORD_LENGTH } from '@/lib/auth/password';
import { cn } from '@/lib/utils/cn';

/**
 * Sign-in and sign-up form.
 *
 * One component for both because the fields and error handling are identical;
 * only the endpoint, copy and password autocomplete hint differ.
 */

export function AuthForm({ mode }: { mode: 'signin' | 'signup' }) {
  const router = useRouter();
  const isSignUp = mode === 'signup';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pending, setPending] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [general, setGeneral] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;

    setPending(true);
    setErrors({});
    setGeneral(null);

    try {
      const response = await fetch(`/api/auth/${mode}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const payload: unknown = await response.json();

      if (!response.ok) {
        const parsed = readError(payload);
        if (parsed.fields) setErrors(parsed.fields);
        else if (parsed.field) setErrors({ [parsed.field]: parsed.message });
        else setGeneral(parsed.message);
        return;
      }

      // Full navigation so server components pick up the new session cookie.
      router.push('/dashboard');
      router.refresh();
    } catch {
      setGeneral('Could not reach Zurl. Check your connection and try again.');
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <Field id="auth-email" label="Email" error={errors.email} required>
        <input
          id="auth-email"
          type="email"
          name="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          autoComplete="email"
          autoCapitalize="none"
          spellCheck={false}
          required
          aria-invalid={errors.email ? true : undefined}
          className={cn(INPUT_CLASS, 'h-11')}
        />
      </Field>

      <Field
        id="auth-password"
        label="Password"
        {...(isSignUp ? { hint: `At least ${MIN_PASSWORD_LENGTH} characters.` } : {})}
        error={errors.password}
        required
      >
        <input
          id="auth-password"
          type="password"
          name="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete={isSignUp ? 'new-password' : 'current-password'}
          required
          minLength={isSignUp ? MIN_PASSWORD_LENGTH : undefined}
          aria-invalid={errors.password ? true : undefined}
          className={cn(INPUT_CLASS, 'h-11')}
        />
      </Field>

      {general ? <Alert tone="danger">{general}</Alert> : null}

      <Button type="submit" disabled={pending} className="w-full">
        {pending ? 'Please wait…' : isSignUp ? 'Create account' : 'Sign in'}
      </Button>
    </form>
  );
}

function readError(payload: unknown): {
  message: string;
  field?: string;
  fields?: Record<string, string>;
} {
  if (
    payload &&
    typeof payload === 'object' &&
    'error' in payload &&
    payload.error &&
    typeof payload.error === 'object'
  ) {
    const error = payload.error as Record<string, unknown>;
    const fields =
      error.fields && typeof error.fields === 'object'
        ? (error.fields as Record<string, string>)
        : undefined;

    return {
      message: typeof error.message === 'string' ? error.message : 'Something went wrong.',
      ...(typeof error.field === 'string' ? { field: error.field } : {}),
      ...(fields ? { fields } : {}),
    };
  }
  return { message: 'Something went wrong. Please try again.' };
}
