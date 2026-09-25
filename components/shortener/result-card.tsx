'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui';
import { truncateUrl } from '@/lib/links/url';
import { CopyButton } from './copy-button';
import { QrPanel } from './qr-panel';

export type ShortenedLink = {
  id: string;
  shortCode: string;
  shortUrl: string;
  destinationUrl: string;
  title: string | null;
  expiresAt: string | null;
  warnings: string[];
};

/**
 * Result of a successful shorten.
 *
 * Copy is the primary action and is visually dominant; QR and open are
 * secondary. The destination is always shown so the user can confirm what the
 * link points at.
 */
export function ResultCard({ link }: { link: ShortenedLink }) {
  const [showQr, setShowQr] = useState(false);
  const display = link.shortUrl.replace(/^https?:\/\//, '');

  return (
    <div className="rounded-lg border border-border bg-surface">
      <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <a
              href={link.shortUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="truncate font-mono text-base font-medium text-accent hover:underline"
            >
              {display}
            </a>
            {link.expiresAt ? <Badge tone="warning">Expires</Badge> : null}
          </div>
          <p className="mt-1 truncate text-sm text-subtle" title={link.destinationUrl}>
            {truncateUrl(link.destinationUrl, 70)}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          <CopyButton value={link.shortUrl} />

          <button
            type="button"
            onClick={() => setShowQr((value) => !value)}
            aria-expanded={showQr}
            className="inline-flex h-9 items-center gap-1.5 rounded-md px-3 text-sm font-medium text-muted transition-colors hover:bg-surface-raised hover:text-ink"
          >
            <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" className="h-3.5 w-3.5">
              <rect x="2" y="2" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.4" />
              <rect x="9" y="2" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.4" />
              <rect x="2" y="9" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.4" />
              <path d="M9 9h2v2H9zM12 12h2v2h-2z" fill="currentColor" />
            </svg>
            QR
          </button>

          <a
            href={link.shortUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-9 items-center gap-1.5 rounded-md px-3 text-sm font-medium text-muted transition-colors hover:bg-surface-raised hover:text-ink"
          >
            Open
            <span className="sr-only">{display} in a new tab</span>
            <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" className="h-3 w-3">
              <path
                d="M6 3h7v7M13 3L6.5 9.5M11 9v4H3V5h4"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </a>
        </div>
      </div>

      {link.warnings.includes('shortener_chain') ? (
        <p className="border-t border-border px-4 py-2 text-xs text-warning">
          Heads up: this points at another link shortener, so the final destination is hidden.
        </p>
      ) : null}

      {showQr ? (
        <div className="border-t border-border p-4">
          <QrPanel value={link.shortUrl} filename={link.shortCode} />
        </div>
      ) : null}
    </div>
  );
}
