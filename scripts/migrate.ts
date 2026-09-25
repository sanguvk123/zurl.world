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
