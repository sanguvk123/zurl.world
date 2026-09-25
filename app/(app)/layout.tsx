import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Logo } from '@/components/brand/logo';
import { Container } from '@/components/ui';
import { getCurrentUser } from '@/lib/auth/session';

/**
 * Authenticated application shell.
 *
 * The session check here guards every route in the group, so an individual page
 * cannot accidentally ship unprotected. Nothing in this group is indexable.
 */

const NAV = [
  { href: '/dashboard', label: 'Links' },
  { href: '/account', label: 'Account' },
] as const;

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect('/signin');

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-border">
        <Container>
          <div className="flex h-14 items-center justify-between gap-4">
            <div className="flex items-center gap-6">
              <Logo href="/dashboard" />
              <nav aria-label="Dashboard">
                <ul className="flex items-center gap-1">
                  {NAV.map((item) => (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className="rounded-md px-2.5 py-1.5 text-sm text-muted transition-colors hover:bg-surface-raised hover:text-ink"
                      >
                        {item.label}
                      </Link>
                    </li>
                  ))}
                  {user.role === 'admin' ? (
                    <li>
                      <Link
                        href="/admin"
                        className="rounded-md px-2.5 py-1.5 text-sm text-warning transition-colors hover:bg-surface-raised"
                      >
                        Admin
                      </Link>
                    </li>
                  ) : null}
                </ul>
              </nav>
            </div>

            <div className="flex items-center gap-3">
              <span className="hidden max-w-[16ch] truncate text-xs text-faint sm:inline">
                {user.email}
              </span>
              <form action="/api/auth/signout" method="post">
                <button
                  type="submit"
                  className="rounded-md px-2.5 py-1.5 text-sm text-muted transition-colors hover:bg-surface-raised hover:text-ink"
                >
                  Sign out
                </button>
              </form>
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
