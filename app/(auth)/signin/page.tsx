import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { AuthForm } from '@/components/auth/auth-form';
import { getCurrentUser } from '@/lib/auth/session';
import { buildPrivateMetadata } from '@/lib/seo/metadata';

export const metadata: Metadata = buildPrivateMetadata('Sign in');

export default async function SignInPage() {
  // Already signed in — no reason to show the form.
  if (await getCurrentUser()) redirect('/dashboard');

  return (
    <>
      <h1 className="text-xl font-semibold tracking-tight text-ink">Sign in</h1>
      <p className="mt-1.5 text-sm text-muted">
        Manage your links, custom endings and analytics.
      </p>

      <div className="mt-6">
        <AuthForm mode="signin" />
      </div>

      <p className="mt-6 text-sm text-subtle">
        No account?{' '}
        <Link
          href="/signup"
          className="text-accent underline underline-offset-2 hover:text-accent-hover"
        >
          Create one free
        </Link>
      </p>
    </>
  );
}
