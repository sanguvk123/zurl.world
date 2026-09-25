import Link from 'next/link';
import { Badge } from '@/components/ui';
import { CopyButton } from '@/components/shortener/copy-button';
import type { Link as LinkRecord } from '@/lib/db/schema';
import { linkState } from '@/lib/links/service';
import { truncateUrl } from '@/lib/links/url';
import { displayShortUrl, shortUrl } from '@/lib/seo/site';

/**
 * A single row in the dashboard link list.
 *
 * Server component: only the copy button is interactive.
 */
export function LinkRow({ link }: { link: LinkRecord }) {
  const state = linkState(link);
  const url = shortUrl(link.shortCode);

  return (
    <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="truncate font-mono text-sm font-medium text-accent hover:underline"
          >
            {displayShortUrl(link.shortCode)}
          </a>

          {link.isCustomAlias === 1 ? <Badge tone="accent">Custom</Badge> : null}
          {state === 'disabled' ? <Badge tone="danger">Disabled</Badge> : null}
          {state === 'expired' ? <Badge tone="warning">Expired</Badge> : null}
          {link.passwordHash ? <Badge tone="neutral">Password</Badge> : null}
        </div>

        {link.title ? (
          <p className="mt-1 truncate text-sm text-ink">{link.title}</p>
        ) : null}

        <p className="mt-0.5 truncate text-xs text-subtle" title={link.destinationUrl}>
          {truncateUrl(link.destinationUrl, 70)}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-3">
        <div className="text-right">
          <p className="font-mono text-sm text-ink tabular-nums">
            {link.clickCount.toLocaleString()}
          </p>
          <p className="text-2xs text-faint">{link.clickCount === 1 ? 'click' : 'clicks'}</p>
        </div>

        <CopyButton value={url} variant="ghost" />

        <Link
          href={`/links/${link.id}`}
          className="inline-flex h-9 items-center rounded-md px-3 text-sm font-medium text-muted transition-colors hover:bg-surface-raised hover:text-ink"
        >
          Details
          <span className="sr-only"> for {displayShortUrl(link.shortCode)}</span>
        </Link>
      </div>
    </div>
  );
}
