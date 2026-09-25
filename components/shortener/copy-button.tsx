'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils/cn';

/**
 * Copy-to-clipboard button.
 *
 * Falls back to a hidden textarea plus `execCommand` when the async Clipboard
 * API is unavailable (non-secure contexts, older Safari), so copy — the single
 * most important interaction after shortening — never silently fails.
 */

export function CopyButton({
  value,
  label = 'Copy',
  className,
  variant = 'solid',
}: {
  value: string;
  label?: string;
  className?: string;
  variant?: 'solid' | 'ghost';
}) {
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const copy = useCallback(async () => {
    const ok = await writeToClipboard(value);
    if (!ok) return;

    setCopied(true);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setCopied(false), 2000);
  }, [value]);

  return (
    <button
      type="button"
      onClick={copy}
      className={cn(
        'inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-md px-3',
        'text-sm font-medium transition-colors',
        variant === 'solid'
          ? 'bg-accent text-accent-ink hover:bg-accent-hover'
          : 'text-muted hover:bg-surface-raised hover:text-ink',
        className,
      )}
    >
      <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" className="h-3.5 w-3.5">
        {copied ? (
          <path
            d="M13 4.5L6.5 11 3 7.5"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ) : (
          <>
            <rect
              x="5.5"
              y="5.5"
              width="8"
              height="8"
              rx="1.5"
              stroke="currentColor"
              strokeWidth="1.4"
            />
            <path
              d="M10.5 3.5A1.5 1.5 0 009 2H4a1.5 1.5 0 00-1.5 1.5v5A1.5 1.5 0 004 10"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
            />
          </>
        )}
      </svg>
      {/* Text changes too — success is not signalled by the icon alone. */}
      <span>{copied ? 'Copied' : label}</span>
      <span aria-live="polite" className="sr-only">
        {copied ? `${value} copied to clipboard` : ''}
      </span>
    </button>
  );
}

async function writeToClipboard(value: string): Promise<boolean> {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(value);
      return true;
    } catch {
      // Permission denied or insecure context — fall through.
    }
  }

  try {
    const textarea = document.createElement('textarea');
    textarea.value = value;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(textarea);
    return ok;
  } catch {
    return false;
  }
}
