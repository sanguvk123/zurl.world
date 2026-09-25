/**
 * Database client.
 *
 * Two drivers, one schema:
 *  - production / any real server: `node-postgres` against `DATABASE_URL`
 *  - local dev and tests: PGlite (Postgres compiled to WebAssembly)
 *
 * PGlite is real PostgreSQL, so constraints, partial indexes and `ON CONFLICT`
 * behave identically to production. It exists here because this environment has
 * neither a Postgres server nor Docker; it is not a mock or an in-memory
 * shim. The selection is by connection string only — no application code branches
 * on the driver.
 */

import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from './schema';

/**
 * Canonical database type.
 *
 * Both drivers expose the same Drizzle query builder surface. Typing this as a
 * union would make every `.returning()` / `.where()` call resolve against an
 * intersection of two signatures and fail, so the node-postgres type is used as
 * the single interface and the PGlite client is adapted to it at construction.
 */
export type Database = NodePgDatabase<typeof schema>;

let instance: Database | null = null;

/** True when we should use the WASM driver. */
function shouldUsePglite(url: string | undefined): boolean {
  if (!url) return true;
  return url.startsWith('pglite:') || url === 'memory://';
}

/** Resolves the PGlite data directory. `memory://` keeps it entirely in RAM. */
function pgliteLocation(url: string | undefined): string {
  if (!url || url === 'memory://') return 'memory://';
  if (url.startsWith('pglite:')) {
    const location = url.slice('pglite:'.length).replace(/^\/\//, '');
    return location.length > 0 ? location : 'memory://';
  }
  return 'memory://';
}

export async function getDb(): Promise<Database> {
  if (instance) return instance;

  const url = process.env.DATABASE_URL;

  if (shouldUsePglite(url)) {
    const { PGlite } = await import('@electric-sql/pglite');
    const { drizzle: drizzlePglite } = await import('drizzle-orm/pglite');

    const location = pgliteLocation(url);
    if (location !== 'memory://') {
      // PGlite will not create intermediate directories, so a configured path
      // like `.data/zurl` fails on a fresh checkout unless we create it.
      const { mkdirSync } = await import('node:fs');
      const { dirname } = await import('node:path');
      mkdirSync(dirname(location), { recursive: true });
    }

    const client = new PGlite(location);
    // Same query-builder surface; see the `Database` type note above.
    instance = drizzlePglite(client, { schema }) as unknown as Database;
  } else {
    const { drizzle: drizzlePg } = await import('drizzle-orm/node-postgres');
    const { Pool } = await import('pg');
    const pool = new Pool({
      connectionString: url,
      // Serverless-friendly pool sizing: many short-lived instances, each
      // holding very few connections.
      max: Number.parseInt(process.env.DATABASE_POOL_MAX ?? '5', 10),
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 10_000,
      ssl: shouldUseSsl(url) ? { rejectUnauthorized: true } : undefined,
    });
    instance = drizzlePg(pool, { schema });
  }

  return instance;
}

function shouldUseSsl(url: string | undefined): boolean {
  if (!url) return false;
  if (url.includes('sslmode=disable')) return false;
  if (url.includes('localhost') || url.includes('127.0.0.1')) return false;
  return true;
}

/** Test helper: drops the cached client so a fresh database can be attached. */
export function resetDbForTesting(): void {
  instance = null;
}

/** Test helper: injects a preconstructed client. */
export function setDbForTesting(db: Database): void {
  instance = db;
}

export { schema };
