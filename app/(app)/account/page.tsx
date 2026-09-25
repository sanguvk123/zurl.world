import type { Metadata } from 'next';
import Link from 'next/link';
import { ApiKeyManager } from '@/components/app/api-key-manager';
import { Container } from '@/components/ui';
import { listApiKeys } from '@/lib/auth/api-key';
import { getCurrentUser } from '@/lib/auth/session';
import { buildPrivateMetadata } from '@/lib/seo/metadata';

export const metadata: Metadata = buildPrivateMetadata('Account');
export const dynamic = 'force-dynamic';

export default async function AccountPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const keys = await listApiKeys(user.id);

  return (
    <Container>
      <h1 className="text-2xl font-semibold tracking-tight text-ink">Account</h1>

      <section className="mt-6 rounded-lg border border-border bg-surface p-5">
        <h2 className="text-sm font-semibold text-ink">Details</h2>
        <dl className="mt-3 space-y-2 text-sm">
          <div className="flex gap-3">
            <dt className="w-20 shrink-0 text-subtle">Email</dt>
            <dd className="text-ink">{user.email}</dd>
          </div>
          <div className="flex gap-3">
            <dt className="w-20 shrink-0 text-subtle">Plan</dt>
            <dd className="text-ink capitalize">{user.plan}</dd>
          </div>
        </dl>
      </section>

      <section className="mt-6">
        <h2 className="text-sm font-semibold text-ink">API keys</h2>
        <p className="mt-1 text-xs text-subtle">
          Use these to create links programmatically. See the{' '}
          <Link
            href="/api"
            className="text-accent underline underline-offset-2 hover:text-accent-hover"
          >
            API documentation
          </Link>
          .
        </p>
        <div className="mt-3">
          <ApiKeyManager
            initialKeys={keys.map((key) => ({
              id: key.id,
              name: key.name,
              prefix: key.prefix,
              createdAt: key.createdAt.toISOString(),
              lastUsedAt: key.lastUsedAt?.toISOString() ?? null,
            }))}
          />
        </div>
      </section>

      <section className="mt-8 rounded-lg border border-border bg-surface p-5">
        <h2 className="text-sm font-semibold text-ink">Your data</h2>
        <p className="mt-1.5 text-sm leading-6 text-muted">
          Deleting a link removes its click history with it. To delete your account entirely, or to
          ask what is stored about you, use the{' '}
          <Link
            href="/contact"
            className="text-accent underline underline-offset-2 hover:text-accent-hover"
          >
            contact page
          </Link>
          . What Zurl records is set out on the{' '}
          <Link
            href="/privacy"
            className="text-accent underline underline-offset-2 hover:text-accent-hover"
          >
            privacy page
          </Link>
          .
        </p>
      </section>
    </Container>
  );
}
