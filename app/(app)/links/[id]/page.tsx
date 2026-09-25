import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { BarList, LineChart, Stat } from '@/components/charts';
import { CopyButton } from '@/components/shortener/copy-button';
import { QrPanel } from '@/components/shortener/qr-panel';
import { LinkActions } from '@/components/app/link-actions';
import { Badge, Container, EmptyState } from '@/components/ui';
import { getLinkAnalytics, normaliseDevices } from '@/lib/analytics/service';
import { deviceLabel } from '@/lib/analytics/user-agent';
import { getCurrentUser } from '@/lib/auth/session';
import { findUserLink, linkState } from '@/lib/links/service';
import { buildPrivateMetadata } from '@/lib/seo/metadata';
import { displayShortUrl, shortUrl } from '@/lib/seo/site';

export const metadata: Metadata = buildPrivateMetadata('Link details');
export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ id: string }> };

export default async function LinkDetailPage({ params }: Props) {
  const user = await getCurrentUser();
  if (!user) return null;

  const { id } = await params;

  // Ownership is part of the query. Another user's link is indistinguishable
  // from one that does not exist.
  const link = await findUserLink(id, user.id);
  if (!link) notFound();

  const analytics = await getLinkAnalytics(link.id, 30);
  const state = linkState(link);
  const url = shortUrl(link.shortCode);

  return (
    <Container>
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-ink"
      >
        <span aria-hidden="true">←</span> Back to links
      </Link>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-mono text-xl font-semibold text-ink">
              {displayShortUrl(link.shortCode)}
            </h1>
            {link.isCustomAlias === 1 ? <Badge tone="accent">Custom</Badge> : null}
            {state === 'disabled' ? <Badge tone="danger">Disabled</Badge> : null}
            {state === 'expired' ? <Badge tone="warning">Expired</Badge> : null}
            {link.passwordHash ? <Badge tone="neutral">Password</Badge> : null}
          </div>

          {link.title ? <p className="mt-1 text-sm text-ink">{link.title}</p> : null}

          <a
            href={link.destinationUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 block max-w-2xl truncate text-sm text-subtle hover:text-muted"
            title={link.destinationUrl}
          >
            {link.destinationUrl}
          </a>
        </div>

        <CopyButton value={url} />
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <Stat label="Total clicks" value={analytics.totalClicks} />
        <Stat label="Last 30 days" value={analytics.clicksInWindow} />
        <Stat
          label="Created"
          value={link.createdAt.toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          })}
          {...(link.expiresAt
            ? {
                hint: `Expires ${link.expiresAt.toLocaleDateString('en-GB', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}`,
              }
            : {})}
        />
      </div>

      <section className="mt-8">
        <h2 className="text-sm font-semibold text-ink">Clicks over time</h2>
        <div className="mt-3 rounded-lg border border-border bg-surface p-5">
          {analytics.clicksInWindow > 0 ? (
            <LineChart
              values={analytics.series.map((point) => point.clicks)}
              label="Clicks per day over the last 30 days"
            />
          ) : (
            <p className="py-8 text-center text-sm text-faint">
              No clicks yet. Share your link and data will appear here.
            </p>
          )}
        </div>
      </section>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section>
          <h2 className="text-sm font-semibold text-ink">Top countries</h2>
          <div className="mt-3 rounded-lg border border-border bg-surface p-5">
            <BarList items={analytics.countries} emptyMessage="No clicks yet" />
          </div>
        </section>

        <section>
          <h2 className="text-sm font-semibold text-ink">Referrers</h2>
          <div className="mt-3 rounded-lg border border-border bg-surface p-5">
            <BarList items={analytics.referrers} emptyMessage="No clicks yet" />
          </div>
        </section>

        <section>
          <h2 className="text-sm font-semibold text-ink">Devices</h2>
          <div className="mt-3 rounded-lg border border-border bg-surface p-5">
            <BarList
              items={normaliseDevices(analytics.devices).map((entry) => ({
                label: deviceLabel(entry.label),
                count: entry.count,
              }))}
              emptyMessage="No clicks yet"
            />
          </div>
        </section>

        <section>
          <h2 className="text-sm font-semibold text-ink">Browsers</h2>
          <div className="mt-3 rounded-lg border border-border bg-surface p-5">
            <BarList items={analytics.browsers} emptyMessage="No clicks yet" />
          </div>
        </section>

        <section>
          <h2 className="text-sm font-semibold text-ink">Operating systems</h2>
          <div className="mt-3 rounded-lg border border-border bg-surface p-5">
            <BarList items={analytics.operatingSystems} emptyMessage="No clicks yet" />
          </div>
        </section>

        <section>
          <h2 className="text-sm font-semibold text-ink">QR code</h2>
          <div className="mt-3 rounded-lg border border-border bg-surface p-5">
            <QrPanel value={url} filename={link.shortCode} />
          </div>
        </section>
      </div>

      <section className="mt-8">
        <h2 className="text-sm font-semibold text-ink">Recent clicks</h2>
        {analytics.recent.length === 0 ? (
          <EmptyState
            className="mt-3"
            title="No clicks yet"
            description="Individual click events will appear here once people start opening your link."
          />
        ) : (
          <div className="mt-3 overflow-hidden rounded-lg border border-border">
            <table className="w-full text-left text-sm">
              <thead className="bg-surface-raised">
                <tr>
                  <th scope="col" className="px-4 py-2.5 text-xs font-semibold text-subtle">
                    When
                  </th>
                  <th scope="col" className="px-4 py-2.5 text-xs font-semibold text-subtle">
                    Country
                  </th>
                  <th scope="col" className="px-4 py-2.5 text-xs font-semibold text-subtle">
                    Referrer
                  </th>
                  <th scope="col" className="px-4 py-2.5 text-xs font-semibold text-subtle">
                    Device
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-surface">
                {analytics.recent.map((click, index) => (
                  <tr key={`${click.timestamp.toISOString()}-${index}`}>
                    <td className="px-4 py-2.5 text-xs text-muted">
                      {click.timestamp.toLocaleString('en-GB', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-muted">{click.country ?? '—'}</td>
                    <td className="px-4 py-2.5 text-xs text-muted">{click.referrerHost ?? '—'}</td>
                    <td className="px-4 py-2.5 text-xs text-muted">
                      {deviceLabel(click.deviceType)}
                      {click.browser ? ` · ${click.browser}` : ''}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="mt-2 text-xs text-faint">
          Zurl does not record IP addresses or raw user-agent strings.{' '}
          <Link href="/privacy" className="underline underline-offset-2 hover:text-subtle">
            How analytics works
          </Link>
        </p>
      </section>

      <section className="mt-10 border-t border-border pt-6">
        <h2 className="text-sm font-semibold text-ink">Manage</h2>
        <div className="mt-3">
          <LinkActions
            linkId={link.id}
            destinationUrl={link.destinationUrl}
            title={link.title}
            disabled={state === 'disabled'}
          />
        </div>
      </section>
    </Container>
  );
}
