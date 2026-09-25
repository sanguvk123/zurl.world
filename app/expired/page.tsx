import type { Metadata } from 'next';
import Link from 'next/link';
import { Logo } from '@/components/brand/logo';
import { ButtonLink } from '@/components/ui';
import { buildPrivateMetadata } from '@/lib/seo/metadata';

export const metadata: Metadata = buildPrivateMetadata('Link expired');

/**
 * Shown when a link exists but has passed its expiry date.
 *
 * Deliberately does not reveal the destination — the owner chose to make it
 * unavailable, and leaking it here would defeat that.
 */
export default function ExpiredPage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-border">
        <div className="mx-auto flex h-14 max-w-6xl items-center px-5 sm:px-6 lg:px-8">
          <Logo />
        </div>
      </header>

      <main id="main" className="flex flex-1 items-center justify-center px-5 py-16">
        <div className="w-full max-w-md text-center">
          <p className="text-2xs font-semibold tracking-widest text-warning uppercase">Expired</p>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight text-ink">
            This link has expired.
          </h1>
          <p className="mt-3 text-sm leading-6 text-muted">
            The person who created it set an expiry date, and that date has passed. If you need the
            destination, ask whoever shared the link with you.
          </p>

          <div className="mt-7 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <ButtonLink href="/">Back to Zurl</ButtonLink>
            <Link
              href="/url-shortener"
              className="text-sm text-muted transition-colors hover:text-ink"
            >
              Create your own short link
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
