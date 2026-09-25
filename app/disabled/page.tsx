import type { Metadata } from 'next';
import Link from 'next/link';
import { Logo } from '@/components/brand/logo';
import { ButtonLink } from '@/components/ui';
import { buildPrivateMetadata } from '@/lib/seo/metadata';

export const metadata: Metadata = buildPrivateMetadata('Link unavailable');

/**
 * Shown when a link has been disabled, by its owner or by moderation.
 *
 * The reason is not shown: telling a visitor that a link was disabled for abuse
 * reveals moderation state, and telling them it was the owner reveals account
 * activity. "No longer available" is accurate for both.
 */
export default function DisabledPage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-border">
        <div className="mx-auto flex h-14 max-w-6xl items-center px-5 sm:px-6 lg:px-8">
          <Logo />
        </div>
      </header>

      <main id="main" className="flex flex-1 items-center justify-center px-5 py-16">
        <div className="w-full max-w-md text-center">
          <p className="text-2xs font-semibold tracking-widest text-danger uppercase">
            Unavailable
          </p>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight text-ink">
            This link is no longer available.
          </h1>
          <p className="mt-3 text-sm leading-6 text-muted">
            It has been disabled and no longer redirects anywhere. If you believe this is a mistake,
            contact whoever shared the link with you.
          </p>

          <div className="mt-7 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <ButtonLink href="/">Back to Zurl</ButtonLink>
            <Link
              href="/report-abuse"
              className="text-sm text-muted transition-colors hover:text-ink"
            >
              Report a problem
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
