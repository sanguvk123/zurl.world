import Link from 'next/link';
import { Logo } from '@/components/brand/logo';

/**
 * Authentication shell.
 *
 * Intentionally minimal: no navigation to distract from the single task. Not
 * indexable — see `buildPrivateMetadata` on each page.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-border">
        <div className="mx-auto flex h-14 max-w-6xl items-center px-5 sm:px-6 lg:px-8">
          <Logo />
        </div>
      </header>

      <main id="main" className="flex flex-1 items-start justify-center px-5 py-12 sm:py-20">
        <div className="w-full max-w-sm">{children}</div>
      </main>

      <footer className="border-t border-border py-5">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-4 gap-y-1 px-5 text-xs text-faint">
          <Link href="/privacy" className="transition-colors hover:text-muted">
            Privacy
          </Link>
          <Link href="/terms" className="transition-colors hover:text-muted">
            Terms
          </Link>
          <Link href="/" className="transition-colors hover:text-muted">
            Back to Zurl
          </Link>
        </div>
      </footer>
    </div>
  );
}
