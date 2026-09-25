/**
 * Migration runner and schema constraints.
 *
 * Runs the real migration SQL through the real runner against PGlite, which is
 * genuine PostgreSQL — so CHECK constraints, partial indexes and foreign keys
 * are verified exactly as they will behave in production.
 */

import { afterEach, describe, expect, it } from 'vitest';
import { sql } from 'drizzle-orm';
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import * as schema from '@/lib/db/schema';
import type { Database } from '@/lib/db';
import { runMigrations } from '@/lib/db/migrate';

let client: PGlite | null = null;

afterEach(async () => {
  await client?.close();
  client = null;
});

async function freshDb(): Promise<{ db: Database; raw: PGlite }> {
  const raw = new PGlite('memory://');
  client = raw;
  return { db: drizzle(raw, { schema }) as unknown as Database, raw };
}

describe('migration runner', () => {
  it('applies every migration to an empty database', async () => {
    const { db, raw } = await freshDb();
    const result = await runMigrations(db);

    expect(result.applied.length).toBeGreaterThan(0);
    expect(result.applied).toContain('0000_init.sql');

    const tables = await raw.query<{ tablename: string }>(
      `SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename`,
    );
    const names = tables.rows.map((row) => row.tablename);

    for (const table of [
      'users',
      'sessions',
      'links',
      'click_events',
      'api_keys',
      'abuse_reports',
    ]) {
      expect(names, `${table} must exist`).toContain(table);
    }
  });

  it('is idempotent', async () => {
    const { db } = await freshDb();

    const first = await runMigrations(db);
    expect(first.applied.length).toBeGreaterThan(0);

    const second = await runMigrations(db);
    expect(second.applied).toHaveLength(0);
    expect(second.skipped.length).toBeGreaterThan(0);
  });

  it('records applied migrations', async () => {
    const { db, raw } = await freshDb();
    await runMigrations(db);

    const rows = await raw.query<{ name: string }>(`SELECT name FROM "_migrations"`);
    expect(rows.rows.map((row) => row.name)).toContain('0000_init.sql');
  });
});

describe('indexes', () => {
  it('creates the redirect lookup index', async () => {
    const { db, raw } = await freshDb();
    await runMigrations(db);

    const rows = await raw.query<{ indexname: string }>(
      `SELECT indexname FROM pg_indexes WHERE tablename = 'links'`,
    );
    const names = rows.rows.map((row) => row.indexname);

    expect(names).toContain('links_short_code_unique');
    expect(names).toContain('links_user_created_idx');
    expect(names).toContain('links_expires_at_idx');
  });

  it('uses an index scan for the redirect query', async () => {
    // The single most important performance property in the system.
    const { db, raw } = await freshDb();
    await runMigrations(db);

    await raw.query(
      `INSERT INTO links (id, short_code, destination_url) VALUES ('l1', 'abc1234', 'https://example.com/')`,
    );

    const plan = await raw.query<{ 'QUERY PLAN': string }>(
      `EXPLAIN SELECT id, destination_url FROM links WHERE short_code = 'abc1234'`,
    );
    const text = plan.rows.map((row) => row['QUERY PLAN']).join(' ');

    expect(text).toContain('Index Scan');
    expect(text).toContain('links_short_code_unique');
  });

  it('creates the analytics index', async () => {
    const { db, raw } = await freshDb();
    await runMigrations(db);

    const rows = await raw.query<{ indexname: string }>(
      `SELECT indexname FROM pg_indexes WHERE tablename = 'click_events'`,
    );
    expect(rows.rows.map((row) => row.indexname)).toContain('click_events_link_ts_idx');
  });
});

describe('schema constraints', () => {
  it('enforces the destination protocol allowlist', async () => {
    const { db } = await freshDb();
    await runMigrations(db);

    for (const url of ['javascript:alert(1)', 'data:text/html,x', 'ftp://example.com', 'nonsense']) {
      await expect(
        db.execute(
          sql`INSERT INTO links (id, short_code, destination_url) VALUES (${`l-${Math.random()}`}, ${`c${Math.random().toString(36).slice(2, 8)}`}, ${url})`,
        ),
        url,
      ).rejects.toThrow();
    }
  });

  it('accepts http and https destinations', async () => {
    const { db } = await freshDb();
    await runMigrations(db);

    await expect(
      db.execute(
        sql`INSERT INTO links (id, short_code, destination_url) VALUES ('ok1', 'okcode1', 'https://example.com/')`,
      ),
    ).resolves.toBeDefined();
  });

  it('enforces the short code format', async () => {
    const { db } = await freshDb();
    await runMigrations(db);

    for (const code of ['<script>', 'a b', 'x', 'a/b', 'a'.repeat(60)]) {
      await expect(
        db.execute(
          sql`INSERT INTO links (id, short_code, destination_url) VALUES (${`l-${Math.random()}`}, ${code}, 'https://example.com/')`,
        ),
        code,
      ).rejects.toThrow();
    }
  });

  it('enforces short code uniqueness', async () => {
    const { db } = await freshDb();
    await runMigrations(db);

    await db.execute(
      sql`INSERT INTO links (id, short_code, destination_url) VALUES ('u1', 'unique1', 'https://example.com/')`,
    );
    await expect(
      db.execute(
        sql`INSERT INTO links (id, short_code, destination_url) VALUES ('u2', 'unique1', 'https://other.com/')`,
      ),
    ).rejects.toThrow();
  });

  it('rejects a negative click count', async () => {
    const { db } = await freshDb();
    await runMigrations(db);

    await expect(
      db.execute(
        sql`INSERT INTO links (id, short_code, destination_url, click_count) VALUES ('n1', 'negativ', 'https://example.com/', -5)`,
      ),
    ).rejects.toThrow();
  });

  it('enforces the country code format', async () => {
    const { db } = await freshDb();
    await runMigrations(db);

    await db.execute(
      sql`INSERT INTO links (id, short_code, destination_url) VALUES ('c1', 'ccode11', 'https://example.com/')`,
    );

    await expect(
      db.execute(
        sql`INSERT INTO click_events (id, link_id, country) VALUES ('e1', 'c1', 'INDIA')`,
      ),
    ).rejects.toThrow();

    await expect(
      db.execute(sql`INSERT INTO click_events (id, link_id, country) VALUES ('e2', 'c1', 'IN')`),
    ).resolves.toBeDefined();
  });

  it('enforces the abuse report category', async () => {
    const { db } = await freshDb();
    await runMigrations(db);

    await db.execute(
      sql`INSERT INTO links (id, short_code, destination_url) VALUES ('r1', 'rcode11', 'https://example.com/')`,
    );

    await expect(
      db.execute(
        sql`INSERT INTO abuse_reports (id, link_id, category) VALUES ('rep1', 'r1', 'invalid')`,
      ),
    ).rejects.toThrow();

    await expect(
      db.execute(
        sql`INSERT INTO abuse_reports (id, link_id, category) VALUES ('rep2', 'r1', 'phishing')`,
      ),
    ).resolves.toBeDefined();
  });

  it('cascades click deletion when a link is removed', async () => {
    const { db, raw } = await freshDb();
    await runMigrations(db);

    await db.execute(
      sql`INSERT INTO links (id, short_code, destination_url) VALUES ('d1', 'dcode11', 'https://example.com/')`,
    );
    await db.execute(sql`INSERT INTO click_events (id, link_id) VALUES ('de1', 'd1')`);

    await db.execute(sql`DELETE FROM links WHERE id = 'd1'`);

    const remaining = await raw.query(`SELECT * FROM click_events`);
    expect(remaining.rows).toHaveLength(0);
  });

  it('keeps anonymous links when no user is set', async () => {
    const { db, raw } = await freshDb();
    await runMigrations(db);

    await db.execute(
      sql`INSERT INTO links (id, short_code, destination_url, user_id) VALUES ('a1', 'anon111', 'https://example.com/', NULL)`,
    );

    const rows = await raw.query(`SELECT * FROM links WHERE id = 'a1'`);
    expect(rows.rows).toHaveLength(1);
  });
});
