/**
 * Integration-test database helper.
 *
 * Spins up a fresh in-memory PGlite instance per suite and runs the real
 * migration SQL against it. These are genuine Postgres integration tests:
 * constraints, unique indexes and `ON CONFLICT` all behave as they will in
 * production.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { sql } from 'drizzle-orm';
import * as schema from '@/lib/db/schema';
import { setDbForTesting, resetDbForTesting, type Database } from '@/lib/db';
import { MemoryRateLimitStore, setRateLimitStore } from '@/lib/security/rate-limit';

export type TestDb = { db: Database; client: PGlite };

const MIGRATION = readFileSync(join(process.cwd(), 'drizzle', '0000_init.sql'), 'utf8');

/** Creates an isolated database and registers it as the app's client. */
export async function createTestDb(): Promise<TestDb> {
  const client = new PGlite('memory://');
  await client.exec(MIGRATION);

  const db = drizzle(client, { schema }) as unknown as Database;
  setDbForTesting(db);

  // Each suite gets a clean limiter so tests cannot leak counters into
  // each other.
  setRateLimitStore(new MemoryRateLimitStore());

  return { db, client };
}

export async function destroyTestDb(testDb: TestDb): Promise<void> {
  resetDbForTesting();
  await testDb.client.close();
}

/** Removes all rows while keeping the schema, for between-test isolation. */
export async function truncateAll(db: Database): Promise<void> {
  await db.execute(
    sql`TRUNCATE "click_events", "abuse_reports", "api_keys", "sessions", "links", "users" CASCADE`,
  );
}
