import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Logo } from '@/components/brand/logo';
import { Container } from '@/components/ui';
import { getCurrentUser } from '@/lib/auth/session';
import { buildPrivateMetadata } from '@/lib/seo/metadata';

export const metadata: Metadata = buildPrivateMetadata('Admin');

/**
 * Admin shell.
 *
 * Gated on `role === 'admin'` for the whole segment, so no admin page can ship
 * without protection.
 *
 * A non-admin gets a 404, not a 403: confirming that `/admin` exists tells an
 * attacker where to aim. To an ordinary user the route simply does not exist.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin') notFound();

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-warning/30 bg-warning/5">
        <Container>
          <div className="flex h-14 items-center justify-between gap-4">
            <div className="flex items-center gap-6">
              <Logo href="/admin" />
              <span className="rounded border border-warning/40 px-1.5 py-0.5 text-2xs font-semibold tracking-widest text-warning uppercase">
                Admin
              </span>
            </div>

            <div className="flex items-center gap-3">
              <Link
                href="/dashboard"
                className="rounded-md px-2.5 py-1.5 text-sm text-muted transition-colors hover:bg-surface-raised hover:text-ink"
              >
                Back to dashboard
              </Link>
            </div>
          </div>
        </Container>
      </header>

      <main id="main" className="flex-1 py-8">
        {children}
      </main>
    </div>
  );
}
