import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Logo } from '@/components/brand/logo';
import { PasswordPrompt } from '@/components/shortener/password-prompt';
import { findLinkByCode, linkState } from '@/lib/links/service';
import { buildPrivateMetadata } from '@/lib/seo/metadata';
import { displayShortUrl } from '@/lib/seo/site';

export const metadata: Metadata = buildPrivateMetadata('Password required');
export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ code: string }> };

/**
 * Interstitial for password-protected links.
 *
 * The destination is never rendered here — it is only returned by the API after
 * the password is verified, so it cannot be recovered from the page source.
 */
export default async function ProtectedLinkPage({ params }: Props) {
  const { code } = await params;
  const link = await findLinkByCode(code);

  // No password, or not active: nothing to unlock.
  if (!link || !link.passwordHash || linkState(link) !== 'active') notFound();

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-border">
        <div className="mx-auto flex h-14 max-w-6xl items-center px-5 sm:px-6 lg:px-8">
          <Logo />
        </div>
      </header>

      <main id="main" className="flex flex-1 items-start justify-center px-5 py-16">
        <div className="w-full max-w-sm">
          <h1 className="text-xl font-semibold tracking-tight text-ink">Password required</h1>
          <p className="mt-1.5 text-sm text-muted">
            <span className="font-mono text-ink">{displayShortUrl(link.shortCode)}</span> is
            protected. Enter the password to continue.
          </p>

          <div className="mt-6">
            <PasswordPrompt code={link.shortCode} />
          </div>

          <p className="mt-6 text-xs leading-5 text-faint">
            Zurl does not know who set this password. If you do not have it, ask the person who
            shared the link.
          </p>
        </div>
      </main>
    </div>
  );
}
