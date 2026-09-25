import { Stat } from '@/components/charts';
import { AdminModeration } from '@/components/app/admin-moderation';
import { Badge, Container, EmptyState } from '@/components/ui';
import { getAdminStats, listReports, searchLinks, searchUsers } from '@/lib/admin/service';
import { truncateUrl } from '@/lib/links/url';
import { displayShortUrl } from '@/lib/seo/site';

export const dynamic = 'force-dynamic';

type Props = { searchParams: Promise<{ q?: string; tab?: string }> };

export default async function AdminPage({ searchParams }: Props) {
  const params = await searchParams;
  const query = params.q ?? '';
  const tab = params.tab === 'users' ? 'users' : params.tab === 'links' ? 'links' : 'reports';

  const [stats, reports, linkResults, userResults] = await Promise.all([
    getAdminStats(),
    tab === 'reports' ? listReports('open') : Promise.resolve([]),
    tab === 'links' ? searchLinks(query) : Promise.resolve([]),
    tab === 'users' ? searchUsers(query) : Promise.resolve([]),
  ]);

  return (
    <Container>
      <h1 className="text-2xl font-semibold tracking-tight text-ink">Admin</h1>

      <div className="mt-6 grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Stat label="Links" value={stats.totalLinks} />
        <Stat label="Users" value={stats.totalUsers} />
        <Stat label="Clicks" value={stats.totalClicks} />
        <Stat label="Open reports" value={stats.openReports} />
        <Stat label="Disabled" value={stats.disabledLinks} />
        <Stat label="New (24h)" value={stats.linksLast24h} />
      </div>

      <nav aria-label="Admin sections" className="mt-8 border-b border-border">
        <ul className="flex gap-1">
          {(
            [
              { key: 'reports', label: `Reports${stats.openReports > 0 ? ` (${stats.openReports})` : ''}` },
              { key: 'links', label: 'Links' },
              { key: 'users', label: 'Users' },
            ] as const
          ).map((item) => (
            <li key={item.key}>
              <a
                href={`/admin?tab=${item.key}`}
                aria-current={tab === item.key ? 'page' : undefined}
                className={
                  tab === item.key
                    ? 'inline-block border-b-2 border-accent px-3 py-2 text-sm font-medium text-ink'
                    : 'inline-block border-b-2 border-transparent px-3 py-2 text-sm text-muted transition-colors hover:text-ink'
                }
              >
                {item.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      {tab === 'reports' ? (
        <section className="mt-6">
          <h2 className="sr-only">Open abuse reports</h2>
          {reports.length === 0 ? (
            <EmptyState
              title="No open reports"
              description="Reports submitted through the abuse form appear here for review."
            />
          ) : (
            <AdminModeration
              reports={reports.map((report) => ({
                reportId: report.reportId,
                category: report.category,
                details: report.details,
                createdAt: report.createdAt.toISOString(),
                linkId: report.linkId,
                shortCode: report.shortCode,
                destinationUrl: report.destinationUrl,
                disabled: report.disabledAt !== null,
              }))}
            />
          )}
        </section>
      ) : null}

      {tab === 'links' ? (
        <section className="mt-6">
          <h2 className="sr-only">Link search</h2>
          <form method="get" className="flex gap-2">
            <input type="hidden" name="tab" value="links" />
            <label htmlFor="admin-link-q" className="sr-only">
              Search links
            </label>
            <input
              id="admin-link-q"
              name="q"
              defaultValue={query}
              placeholder="Search by short code or destination…"
              className="h-10 flex-1 rounded-md border border-border-strong bg-surface-raised px-3 text-sm text-ink placeholder:text-faint focus:border-accent focus:outline-none"
            />
            <button
              type="submit"
              className="h-10 rounded-md bg-surface-raised px-4 text-sm font-medium text-ink hover:bg-surface-hover"
            >
              Search
            </button>
          </form>

          {linkResults.length === 0 ? (
            <EmptyState className="mt-4" title="No links found" />
          ) : (
            <ul className="mt-4 divide-y divide-border overflow-hidden rounded-lg border border-border bg-surface">
              {linkResults.map((link) => (
                <li key={link.id} className="flex items-center justify-between gap-4 px-4 py-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm text-ink">
                        {displayShortUrl(link.shortCode)}
                      </span>
                      {link.disabledAt ? (
                        <Badge tone="danger">{link.disabledReason ?? 'Disabled'}</Badge>
                      ) : null}
                      {link.userId === null ? <Badge tone="neutral">Anonymous</Badge> : null}
                    </div>
                    <p className="mt-0.5 truncate text-xs text-subtle">
                      {truncateUrl(link.destinationUrl, 80)}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="font-mono text-sm text-muted tabular-nums">{link.clickCount}</p>
                    <p className="text-2xs text-faint">
                      {link.createdAt.toLocaleDateString('en-GB')}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}

      {tab === 'users' ? (
        <section className="mt-6">
          <h2 className="sr-only">User search</h2>
          <form method="get" className="flex gap-2">
            <input type="hidden" name="tab" value="users" />
            <label htmlFor="admin-user-q" className="sr-only">
              Search users
            </label>
            <input
              id="admin-user-q"
              name="q"
              defaultValue={query}
              placeholder="Search by email…"
              className="h-10 flex-1 rounded-md border border-border-strong bg-surface-raised px-3 text-sm text-ink placeholder:text-faint focus:border-accent focus:outline-none"
            />
            <button
              type="submit"
              className="h-10 rounded-md bg-surface-raised px-4 text-sm font-medium text-ink hover:bg-surface-hover"
            >
              Search
            </button>
          </form>

          {userResults.length === 0 ? (
            <EmptyState className="mt-4" title="No users found" />
          ) : (
            <ul className="mt-4 divide-y divide-border overflow-hidden rounded-lg border border-border bg-surface">
              {userResults.map((entry) => (
                <li key={entry.id} className="flex items-center justify-between gap-4 px-4 py-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm text-ink">{entry.email}</span>
                      {entry.role === 'admin' ? <Badge tone="warning">Admin</Badge> : null}
                    </div>
                    <p className="mt-0.5 text-xs text-subtle">
                      Joined {entry.createdAt.toLocaleDateString('en-GB')}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="font-mono text-sm text-muted tabular-nums">{entry.linkCount}</p>
                    <p className="text-2xs text-faint">links</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}
    </Container>
  );
}
