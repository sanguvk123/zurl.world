'use client';

import { useEffect, useId, useRef, useState } from 'react';
import Link from 'next/link';
import { Alert, Button, Field, INPUT_CLASS } from '@/components/ui';
import { cn } from '@/lib/utils/cn';
import { CopyButton } from './copy-button';
import { ResultCard, type ShortenedLink } from './result-card';

/**
 * The primary URL shortening form.
 *
 * Design intent: the input is the visual centre of the page and works with a
 * single paste plus one click. Advanced options are collapsed behind a
 * disclosure so they never compete with the primary action.
 */

type Props = {
  /**
   * Known auth state, when the caller already has it (the dashboard does).
   * Omitted on public pages so they can stay statically prerendered — the form
   * then resolves the session itself after hydration.
   */
  isAuthenticated?: boolean;
  autoFocus?: boolean;
  className?: string;
  /** Compact variant used inside SEO landing pages and the 404. */
  compact?: boolean;
};

type ApiError = { code: string; message: string; field?: string };

export function ShortenForm({
  isAuthenticated,
  autoFocus = false,
  className,
  compact = false,
}: Props) {
  const formId = useId();
  // When the caller did not supply auth state, resolve it client-side so the
  // host page does not have to become dynamic.
  const [detectedAuth, setDetectedAuth] = useState(isAuthenticated ?? false);
  const [url, setUrl] = useState('');
  const [alias, setAlias] = useState('');
  const [title, setTitle] = useState('');
  const [password, setPassword] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [showOptions, setShowOptions] = useState(false);

  const [pending, setPending] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [results, setResults] = useState<ShortenedLink[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isAuthenticated !== undefined) return;
    let cancelled = false;

    fetch('/api/auth/session', { headers: { accept: 'application/json' } })
      .then((response) => (response.ok ? response.json() : null))
      .then((payload: unknown) => {
        if (cancelled) return;
        const signedIn =
          payload !== null &&
          typeof payload === 'object' &&
          'data' in payload &&
          payload.data !== null &&
          typeof payload.data === 'object' &&
          'signedIn' in payload.data &&
          payload.data.signedIn === true;
        setDetectedAuth(signedIn);
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  const signedIn = isAuthenticated ?? detectedAuth;

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;

    setPending(true);
    setError(null);

    try {
      const response = await fetch('/api/links', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          url,
          alias: alias || undefined,
          title: title || undefined,
          password: password || undefined,
          expiresAt: expiresAt ? new Date(expiresAt).toISOString() : undefined,
        }),
      });

      const payload: unknown = await response.json();

      if (!response.ok) {
        setError(extractError(payload, response.status));
        return;
      }

      const link = extractLink(payload);
      if (!link) {
        setError({ code: 'internal_error', message: 'Something went wrong. Please try again.' });
        return;
      }

      // Newest first, so the most recent result is always at the top.
      setResults((previous) => [link, ...previous].slice(0, 5));
      setUrl('');
      setAlias('');
      setTitle('');
      setPassword('');
      setExpiresAt('');
      setShowOptions(false);
      inputRef.current?.focus();
    } catch {
      setError({
        code: 'network_error',
        message: 'Could not reach Zurl. Check your connection and try again.',
      });
    } finally {
      setPending(false);
    }
  }

  const urlError = error?.field === 'destinationUrl' || error?.field === 'url' ? error.message : undefined;
  const aliasError = error?.field === 'alias' ? error.message : undefined;
  const generalError = error && !error.field ? error.message : undefined;

  return (
    <div className={cn('w-full', className)}>
      <form onSubmit={onSubmit} noValidate>
        {/*
          The input and CTA stack on mobile so both stay full-width and
          thumb-reachable, and sit inline from `sm` upwards.
        */}
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="flex-1">
            <label htmlFor={`${formId}-url`} className="sr-only">
              Paste the URL you want to shorten
            </label>
            <input
              id={`${formId}-url`}
              ref={inputRef}
              type="url"
              inputMode="url"
              name="url"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="Paste your long URL..."
              autoComplete="off"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              // The input is the page's single purpose, so focusing it is the
              // expected behaviour rather than a trap.
              autoFocus={autoFocus}
              aria-invalid={urlError ? true : undefined}
              aria-describedby={urlError ? `${formId}-url-error` : undefined}
              className={cn(
                INPUT_CLASS,
                compact ? 'h-12 text-base' : 'h-14 text-base sm:text-[1.0625rem]',
                urlError && 'border-danger',
              )}
            />
          </div>

          <Button
            type="submit"
            size={compact ? 'md' : 'lg'}
            disabled={pending}
            className={cn('shrink-0', compact ? 'h-12' : 'h-14 px-7 text-base')}
          >
            {pending ? 'Shortening…' : 'Shorten URL'}
          </Button>
        </div>

        {urlError ? (
          <p id={`${formId}-url-error`} role="alert" className="mt-2 flex items-start gap-1.5 text-sm text-danger">
            <span aria-hidden="true">✕</span>
            <span>{urlError}</span>
          </p>
        ) : null}

        {generalError ? (
          <Alert tone="danger" className="mt-3">
            {generalError}
          </Alert>
        ) : null}

        {!compact ? (
          <div className="mt-3">
            {signedIn ? (
              <>
                <button
                  type="button"
                  onClick={() => setShowOptions((value) => !value)}
                  aria-expanded={showOptions}
                  aria-controls={`${formId}-options`}
                  className="inline-flex items-center gap-1.5 rounded-md text-sm text-muted transition-colors hover:text-ink"
                >
                  <svg
                    viewBox="0 0 16 16"
                    fill="none"
                    aria-hidden="true"
                    className={cn(
                      'h-3.5 w-3.5 transition-transform',
                      showOptions && 'rotate-90',
                    )}
                  >
                    <path
                      d="M6 4l4 4-4 4"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  Custom link, expiry and password
                </button>

                {showOptions ? (
                  <div
                    id={`${formId}-options`}
                    className="mt-4 grid gap-4 rounded-lg border border-border bg-surface p-4 sm:grid-cols-2"
                  >
                    <Field
                      id={`${formId}-alias`}
                      label="Custom link"
                      hint="Letters, numbers, hyphens and underscores."
                      error={aliasError}
                    >
                      <div className="flex items-center rounded-md border border-border-strong bg-surface-raised focus-within:border-accent">
                        <span className="pl-3 text-sm text-faint select-none">zurl.world/</span>
                        <input
                          id={`${formId}-alias`}
                          name="alias"
                          value={alias}
                          onChange={(event) => setAlias(event.target.value)}
                          placeholder="my-product"
                          autoComplete="off"
                          autoCapitalize="none"
                          spellCheck={false}
                          aria-invalid={aliasError ? true : undefined}
                          className="h-11 flex-1 bg-transparent pr-3 pl-0.5 text-ink placeholder:text-faint focus:outline-none"
                        />
                      </div>
                    </Field>

                    <Field id={`${formId}-title`} label="Title" hint="A label to find it later.">
                      <input
                        id={`${formId}-title`}
                        name="title"
                        value={title}
                        onChange={(event) => setTitle(event.target.value)}
                        placeholder="Spring campaign"
                        className={cn(INPUT_CLASS, 'h-11')}
                      />
                    </Field>

                    <Field
                      id={`${formId}-expires`}
                      label="Expires"
                      hint="The link stops working after this time."
                    >
                      <input
                        id={`${formId}-expires`}
                        name="expiresAt"
                        type="datetime-local"
                        value={expiresAt}
                        onChange={(event) => setExpiresAt(event.target.value)}
                        className={cn(INPUT_CLASS, 'h-11')}
                      />
                    </Field>

                    <Field
                      id={`${formId}-password`}
                      label="Password"
                      hint="Visitors must enter this before continuing."
                    >
                      <input
                        id={`${formId}-password`}
                        name="password"
                        type="password"
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        autoComplete="new-password"
                        className={cn(INPUT_CLASS, 'h-11')}
                      />
                    </Field>
                  </div>
                ) : null}
              </>
            ) : (
              <p className="text-sm text-subtle">
                No account needed.{' '}
                <Link
                  href="/signup"
                  className="text-accent underline underline-offset-2 hover:text-accent-hover"
                >
                  Sign up free
                </Link>{' '}
                for custom links, expiry dates and click analytics.
              </p>
            )}
          </div>
        ) : null}
      </form>

      {results.length > 0 ? (
        <div className="mt-5 space-y-3">
          {/*
            Announced politely so a screen reader user learns the link was
            created without the focus being yanked away from the input.
          */}
          <p className="sr-only" role="status">
            Short link created: {results[0]?.shortUrl}
          </p>
          {results.map((link) => (
            <ResultCard key={link.id} link={link} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

export { CopyButton };

// ---------------------------------------------------------------------------
// Response parsing — narrow `unknown` without casting.
// ---------------------------------------------------------------------------

function extractError(payload: unknown, status: number): ApiError {
  if (
    payload &&
    typeof payload === 'object' &&
    'error' in payload &&
    payload.error &&
    typeof payload.error === 'object'
  ) {
    const error = payload.error as Record<string, unknown>;
    return {
      code: typeof error.code === 'string' ? error.code : 'error',
      message:
        typeof error.message === 'string'
          ? error.message
          : 'Something went wrong. Please try again.',
      ...(typeof error.field === 'string' ? { field: error.field } : {}),
    };
  }

  if (status === 429) {
    return {
      code: 'rate_limited',
      message: "You're creating links too quickly. Try again shortly.",
    };
  }

  return { code: 'internal_error', message: 'Something went wrong. Please try again.' };
}

function extractLink(payload: unknown): ShortenedLink | null {
  if (!payload || typeof payload !== 'object' || !('data' in payload)) return null;
  const data = payload.data;
  if (!data || typeof data !== 'object') return null;

  const record = data as Record<string, unknown>;
  if (
    typeof record.id !== 'string' ||
    typeof record.shortUrl !== 'string' ||
    typeof record.shortCode !== 'string' ||
    typeof record.destinationUrl !== 'string'
  ) {
    return null;
  }

  return {
    id: record.id,
    shortCode: record.shortCode,
    shortUrl: record.shortUrl,
    destinationUrl: record.destinationUrl,
    title: typeof record.title === 'string' ? record.title : null,
    expiresAt: typeof record.expiresAt === 'string' ? record.expiresAt : null,
    warnings: Array.isArray(record.warnings)
      ? record.warnings.filter((w): w is string => typeof w === 'string')
      : [],
  };
}
