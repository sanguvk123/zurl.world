'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

/**
 * Session-dependent header controls.
 *
 * This exists so the marketing pages can stay **statically prerendered**.
 * Reading the session cookie in a server layout would opt every page into
 * per-request rendering, which is the wrong trade for content whose HTML is
 * identical for everyone. The session state is fetched client-side after
 * hydration instead.
 *
 * The signed-out links are rendered immediately rather than showing a spinner,
 * because that is the correct state for the overwhelming majority of visitors
 * to a public page, and it keeps the header from shifting for them.
 */

type State = 'unknown' | 'signed-out' | 'signed-in';

export function AuthNav({ variant = 'desktop' }: { variant?: 'desktop' | 'mobile' }) {
  const [state, setState] = useState<State>('unknown');

  useEffect(() => {
    let cancelled = false;

    fetch('/api/auth/session', { headers: { accept: 'application/json' } })
      .then((response) => (response.ok ? response.json() : null))
      .then((payload: unknown) => {
        if (cancelled) return;
        setState(isSignedIn(payload) ? 'signed-in' : 'signed-out');
      })
      .catch(() => {
        if (!cancelled) setState('signed-out');
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const signedIn = state === 'signed-in';

  if (variant === 'mobile') {
    return (
      <div className="space-y-2">
        {signedIn ? (
          <>
            <Link
              href="/dashboard"
              className="block rounded-md px-3 py-3 text-base text-ink transition-colors hover:bg-surface-raised"
            >
              Dashboard
            </Link>
            <form action="/api/auth/signout" method="post">
              <button
                type="submit"
                className="block w-full rounded-md px-3 py-3 text-left text-base text-ink transition-colors hover:bg-surface-raised"
              >
                Sign out
              </button>
            </form>
          </>
        ) : (
          <>
            <Link
              href="/signin"
              className="block rounded-md px-3 py-3 text-base text-ink transition-colors hover:bg-surface-raised"
            >
              Sign in
            </Link>
            <Link
              href="/signup"
              className="block rounded-md bg-accent px-3 py-3 text-center text-base font-medium text-accent-ink transition-colors hover:bg-accent-hover"
            >
              Sign up
            </Link>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="hidden items-center gap-2 lg:flex">
      {signedIn ? (
        <>
          <Link
            href="/dashboard"
            className="rounded-md px-2.5 py-1.5 text-sm text-muted transition-colors hover:bg-surface-raised hover:text-ink"
          >
            Dashboard
          </Link>
          <form action="/api/auth/signout" method="post">
            <button
              type="submit"
              className="rounded-md px-2.5 py-1.5 text-sm text-muted transition-colors hover:bg-surface-raised hover:text-ink"
            >
              Sign out
            </button>
          </form>
        </>
      ) : (
        <>
          <Link
            href="/signin"
            className="rounded-md px-2.5 py-1.5 text-sm text-muted transition-colors hover:bg-surface-raised hover:text-ink"
          >
            Sign in
          </Link>
          <Link
            href="/signup"
            className="inline-flex h-8 items-center justify-center rounded-md bg-accent px-3 text-sm font-medium text-accent-ink transition-colors hover:bg-accent-hover"
          >
            Sign up
          </Link>
        </>
      )}
    </div>
  );
}

function isSignedIn(payload: unknown): boolean {
  return (
    payload !== null &&
    typeof payload === 'object' &&
    'data' in payload &&
    payload.data !== null &&
    typeof payload.data === 'object' &&
    'signedIn' in payload.data &&
    payload.data.signedIn === true
  );
}
