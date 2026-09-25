/**
 * Database driver selection.
 *
 * The consequences of getting this wrong are asymmetric. Choosing PGlite
 * locally is convenient; choosing it in production means every serverless
 * instance gets its own empty in-memory database and all data disappears
 * between requests, with nothing in the logs to explain it. These tests pin
 * that behaviour down.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { getDb, resetDbForTesting } from '@/lib/db';

const ORIGINAL_DATABASE_URL = process.env.DATABASE_URL;
const ORIGINAL_NODE_ENV = process.env.NODE_ENV;

/** `NODE_ENV` is read-only in some type setups, so assign through a cast. */
function setNodeEnv(value: string | undefined): void {
  const env = process.env as Record<string, string | undefined>;
  if (value === undefined) delete env.NODE_ENV;
  else env.NODE_ENV = value;
}

beforeEach(() => {
  resetDbForTesting();
});

afterEach(() => {
  resetDbForTesting();
  setNodeEnv(ORIGINAL_NODE_ENV);
  if (ORIGINAL_DATABASE_URL === undefined) delete process.env.DATABASE_URL;
  else process.env.DATABASE_URL = ORIGINAL_DATABASE_URL;
});

describe('production safety', () => {
  it('refuses to start in production with no DATABASE_URL', async () => {
    setNodeEnv('production');
    delete process.env.DATABASE_URL;

    await expect(getDb()).rejects.toThrow(/DATABASE_URL must be set/);
  });

  it('refuses to start in production with an in-memory database', async () => {
    setNodeEnv('production');
    process.env.DATABASE_URL = 'memory://';

    await expect(getDb()).rejects.toThrow(/DATABASE_URL must be set/);
  });

  it('refuses to start in production with a file-backed PGlite database', async () => {
    // Persistent on one machine, but still wrong on a serverless platform where
    // instances do not share a filesystem.
    setNodeEnv('production');
    process.env.DATABASE_URL = 'pglite://.data/zurl';

    await expect(getDb()).rejects.toThrow(/DATABASE_URL must be set/);
  });

  it('explains the consequence, not just the rule', async () => {
    setNodeEnv('production');
    delete process.env.DATABASE_URL;

    // Whoever hits this is mid-deploy and needs to know why it matters.
    await expect(getDb()).rejects.toThrow(/lose all data/);
  });
});

describe('development and test', () => {
  it('allows an in-memory database outside production', async () => {
    setNodeEnv('test');
    process.env.DATABASE_URL = 'memory://';

    await expect(getDb()).resolves.toBeDefined();
  });

  it('allows an unset DATABASE_URL outside production', async () => {
    setNodeEnv('development');
    delete process.env.DATABASE_URL;

    await expect(getDb()).resolves.toBeDefined();
  });
});
