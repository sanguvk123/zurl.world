import Link from 'next/link';
import { cn } from '@/lib/utils/cn';

/**
 * Zurl mark.
 *
 * A "Z" formed from two horizontal bars and a connecting diagonal — reading as
 * both the letter and a link hop. Deliberately simple geometry so it stays
 * legible at 16px favicon size, which is where most logos fail.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={cn('h-6 w-6', className)}
    >
      <rect width="24" height="24" rx="6" className="fill-accent" />
      <path
        d="M7 8.25h10L9.5 15.75h7.5"
        stroke="var(--color-accent-ink)"
        strokeWidth="2.1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn('text-[0.9375rem] font-semibold tracking-tight text-ink', className)}>
      Zurl
    </span>
  );
}

export function Logo({ className, href = '/' }: { className?: string; href?: string }) {
  return (
    <Link
      href={href}
      className={cn('inline-flex items-center gap-2 rounded-md', className)}
      aria-label="Zurl — home"
    >
      <LogoMark />
      <Wordmark />
    </Link>
  );
}
