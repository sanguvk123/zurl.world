import Link from 'next/link';
import { Logo } from '@/components/brand/logo';
import { ShortenForm } from '@/components/shortener/shorten-form';

/**
 * 404.
 *
 * Also serves the "short code does not exist" case, which is the most common
 * way people reach it. Rather than a dead end, it offers the product: the
 * shortener input is right there.
 */
export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-border">
        <div className="mx-auto flex h-14 max-w-6xl items-center px-5 sm:px-6 lg:px-8">
          <Logo />
        </div>
      </header>

      <main id="main" className="flex flex-1 items-center justify-center px-5 py-16">
        <div className="w-full max-w-lg">
          <p className="text-2xs font-semibold tracking-widest text-faint uppercase">404</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-ink">
            This link went nowhere.
          </h1>
          <p className="mt-3 text-sm leading-6 text-muted">
            The page you are looking for does not exist. If you followed a short link, it may have
            been deleted, or the code may have been mistyped — short codes are case sensitive.
          </p>

          <div className="mt-8">
            <p className="text-sm font-medium text-ink">Need a short link instead?</p>
            <div className="mt-3">
              <ShortenForm compact />
            </div>
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-border pt-5 text-sm">
            <Link href="/" className="text-accent hover:text-accent-hover">
              Back to Zurl
            </Link>
            <Link href="/tools" className="text-muted transition-colors hover:text-ink">
              All tools
            </Link>
            <Link href="/url-expander" className="text-muted transition-colors hover:text-ink">
              Check where a link goes
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
