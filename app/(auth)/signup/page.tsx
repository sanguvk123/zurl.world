import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { AuthForm } from '@/components/auth/auth-form';
import { getCurrentUser } from '@/lib/auth/session';
import { buildPrivateMetadata } from '@/lib/seo/metadata';

export const metadata: Metadata = buildPrivateMetadata('Create an account');

const INCLUDED = [
  'Custom link endings',
  'Click analytics',
  'Expiry dates and password protection',
  'API access',
] as const;

export default async function SignUpPage() {
  if (await getCurrentUser()) redirect('/dashboard');

  return (
    <>
      <h1 className="text-xl font-semibold tracking-tight text-ink">Create your account</h1>
      <p className="mt-1.5 text-sm text-muted">
        Free, and it stays free. No card required.
      </p>

      <ul className="mt-5 space-y-1.5">
        {INCLUDED.map((item) => (
          <li key={item} className="flex items-start gap-2 text-sm text-muted">
            <svg
              viewBox="0 0 16 16"
              fill="none"
              aria-hidden="true"
              className="mt-1 h-3 w-3 shrink-0 text-accent"
            >
              <path
                d="M13 4.5L6.5 11 3 7.5"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span>{item}</span>
          </li>
        ))}
      </ul>

      <div className="mt-6">
        <AuthForm mode="signup" />
      </div>

      <p className="mt-4 text-xs leading-5 text-faint">
        By creating an account you agree to the{' '}
        <Link href="/terms" className="underline underline-offset-2 hover:text-muted">
          terms
        </Link>{' '}
        and{' '}
        <Link href="/privacy" className="underline underline-offset-2 hover:text-muted">
          privacy policy
        </Link>
        .
      </p>

      <p className="mt-6 text-sm text-subtle">
        Already have an account?{' '}
        <Link
          href="/signin"
          className="text-accent underline underline-offset-2 hover:text-accent-hover"
        >
          Sign in
        </Link>
      </p>
    </>
  );
}
