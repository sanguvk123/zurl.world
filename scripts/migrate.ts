/**
 * Applies pending migrations.
 *
 *   npm run db:migrate
 *
 * Safe to run repeatedly: applied migrations are recorded in `_migrations`.
 */

import './load-env';
import { getDb } from '../lib/db';
import { runMigrations } from '../lib/db/migrate';

async function main(): Promise<void> {
  assertUsableDatabaseUrl(process.env.DATABASE_URL);

  const target = process.env.DATABASE_URL ?? 'memory:// (no DATABASE_URL set)';
  console.log(`Running migrations against: ${redact(target)}`);

  const db = await getDb();
  const { applied, skipped } = await runMigrations(db);

  if (applied.length === 0) {
    console.log(`Already up to date (${skipped.length} migration(s) previously applied).`);
  } else {
    for (const name of applied) console.log(`  applied  ${name}`);
    console.log(`Done. ${applied.length} migration(s) applied.`);
  }
}

/**
 * Rejects a `DATABASE_URL` that cannot possibly work, before any connection is
 * attempted.
 *
 * Without this, an unsubstituted placeholder is passed straight to the driver,
 * which interprets it as a local socket path and fails deep inside Postgres
 * with something like `couldn't read file "applied"` — an error that says
 * nothing about the real problem.
 */
function assertUsableDatabaseUrl(url: string | undefined): void {
  if (!url) return; // Falls back to PGlite, which is valid for local work.

  const looksLikePlaceholder = /^<.*>$/.test(url.trim()) || url.includes('<') || url.includes('>');
  if (looksLikePlaceholder) {
    throw new Error(
      `DATABASE_URL is still a placeholder (${url}). Replace it with the real ` +
        'connection string, including the quotes:\n' +
        '  DATABASE_URL="postgresql://user:password@host/db?sslmode=require" npm run db:migrate',
    );
  }

  const valid = /^(postgres(ql)?:\/\/|pglite:|memory:\/\/)/.test(url);
  if (!valid) {
    throw new Error(
      `DATABASE_URL is not a recognised connection string (${redact(url)}). ` +
        'Expected it to start with postgresql://, pglite: or memory://',
    );
  }
}

/** Never print credentials, even to a local terminal. */
function redact(url: string): string {
  return url.replace(/\/\/[^@]*@/, '//***:***@');
}

main()
  .then(() => process.exit(0))
  .catch((error: unknown) => {
    console.error('Migration failed:', error instanceof Error ? error.message : error);
    process.exit(1);
  });
