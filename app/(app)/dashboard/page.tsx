import type { Metadata } from 'next';
import Link from 'next/link';
import { Stat } from '@/components/charts';
import { ShortenForm } from '@/components/shortener/shorten-form';
import { LinkRow } from '@/components/app/link-row';
import { Container, EmptyState } from '@/components/ui';
import { getCurrentUser } from '@/lib/auth/session';
import { countUserLinks, listUserLinks, sumUserClicks } from '@/lib/links/service';
import { buildPrivateMetadata } from '@/lib/seo/metadata';

export const metadata: Metadata = buildPrivateMetadata('Dashboard');
export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  // The layout guarantees a user, but the type must still be narrowed.
  const user = await getCurrentUser();
  if (!user) return null;

  const [links, totalLinks, totalClicks] = await Promise.all([
    listUserLinks(user.id, { limit: 50 }),
    countUserLinks(user.id),
    sumUserClicks(user.id),
  ]);

  return (
    <Container>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink">Your links</h1>
          <p className="mt-1 text-sm text-muted">
            Create, manage and track every link on your account.
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <Stat label="Links" value={totalLinks} />
        <Stat label="Total clicks" value={totalClicks} />
        <Stat
          label="Average per link"
          value={totalLinks > 0 ? Math.round(totalClicks / totalLinks) : 0}
        />
      </div>

      <div className="mt-8 rounded-xl border border-border bg-surface p-5">
        <h2 className="text-sm font-semibold text-ink">Create a link</h2>
        <div className="mt-3">
          <ShortenForm isAuthenticated compact />
        </div>
        <p className="mt-3 text-xs text-subtle">
          Refresh the page to see a new link in the list below.
        </p>
      </div>

      <div className="mt-8">
        <h2 className="text-sm font-semibold text-ink">
          Recent links
          {totalLinks > links.length ? (
            <span className="ml-2 font-normal text-faint">
              showing {links.length} of {totalLinks}
            </span>
          ) : null}
        </h2>

        {links.length === 0 ? (
          <EmptyState
            className="mt-3"
            title="No links yet"
            description="Create your first short link using the form above. It will appear here with its click count."
            action={
              <Link
                href="/url-shortener"
                className="text-sm text-accent underline underline-offset-2 hover:text-accent-hover"
              >
                Learn what you can do with links
              </Link>
            }
          />
        ) : (
          <ul className="mt-3 divide-y divide-border overflow-hidden rounded-lg border border-border bg-surface">
            {links.map((link) => (
              <li key={link.id}>
                <LinkRow link={link} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </Container>
  );
}
