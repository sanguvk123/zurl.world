import Link from 'next/link';
import { Logo } from '@/components/brand/logo';
import { Container } from '@/components/ui';
import { AuthNav } from './auth-nav';
import { MobileNav } from './mobile-nav';

/**
 * Primary navigation.
 *
 * A server component with no session read, so the pages that use it can be
 * statically prerendered. The session-dependent controls live in `AuthNav`,
 * which is a small client component.
 */

export const PRIMARY_NAV = [
  { href: '/url-shortener', label: 'URL Shortener' },
  { href: '/qr-code-generator', label: 'QR Code' },
  { href: '/tools', label: 'Tools' },
  { href: '/api', label: 'API' },
  { href: '/pricing', label: 'Pricing' },
] as const;

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-canvas/85 backdrop-blur-sm">
      <Container>
        <div className="flex h-14 items-center justify-between gap-4">
          <div className="flex items-center gap-7">
            <Logo />

            <nav aria-label="Primary" className="hidden lg:block">
              <ul className="flex items-center gap-1">
                {PRIMARY_NAV.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className="rounded-md px-2.5 py-1.5 text-sm text-muted transition-colors hover:bg-surface-raised hover:text-ink"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </div>

          <AuthNav />
          <MobileNav items={PRIMARY_NAV} />
        </div>
      </Container>
    </header>
  );
}
