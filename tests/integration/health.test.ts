/**
 * Health endpoint.
 *
 * This endpoint is unauthenticated, so the tests care as much about what it
 * refuses to say as what it reports. It must describe the *shape* of a
 * misconfiguration without leaking hosts, credentials or driver internals.
 */

import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { GET as health } from '@/app/api/health/route';
import { createTestDb, destroyTestDb, type TestDb } from '../helpers/db';

let testDb: TestDb;

const ORIGINAL = {
  DATABASE_URL: process.env.DATABASE_URL,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  IP_HASH_SECRET: process.env.IP_HASH_SECRET,
};

beforeAll(async () => {
  testDb = await createTestDb();
});

afterAll(async () => {
  await destroyTestDb(testDb);
});

beforeEach(() => {
  // A configured deployment: the test DB is already registered by createTestDb,
  // so the URL only has to look like Postgres for the config check.
  process.env.DATABASE_URL = 'postgresql://user:pw@db.example.com/zurl';
  process.env.NEXT_PUBLIC_APP_URL = 'https://zurl.world';
  process.env.IP_HASH_SECRET = 'test-salt';
});

afterEach(() => {
  for (const [key, value] of Object.entries(ORIGINAL)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

describe('healthy deployment', () => {
  it('returns 200 with every check passing', async () => {
    const body = await (await health()).json();

    expect(body.status).toBe('ok');
    expect(body.checks.databaseReachable).toBe('ok');
    expect(body.checks.schemaPresent).toBe('ok');
    expect(body.problems).toEqual([]);
  });
});

describe('misconfiguration', () => {
  it('reports 503 when DATABASE_URL is missing', async () => {
    delete process.env.DATABASE_URL;

    const response = await health();
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.checks.databaseUrlConfigured).toBe('fail');
    expect(body.problems.join(' ')).toMatch(/DATABASE_URL/);
  });

  it('treats an in-process database as unconfigured', async () => {
    // `memory://` would appear to work and then lose every write, so it must
    // not be reported as a healthy configuration.
    process.env.DATABASE_URL = 'memory://';

    const body = await (await health()).json();

    expect(body.checks.databaseUrlConfigured).toBe('fail');
  });

  it('flags a missing IP_HASH_SECRET without failing the database checks', async () => {
    delete process.env.IP_HASH_SECRET;

    const body = await (await health()).json();

    expect(body.checks.ipHashSecretConfigured).toBe('fail');
    expect(body.checks.databaseReachable).toBe('ok');
    expect(body.problems.join(' ')).toMatch(/IP_HASH_SECRET/);
  });

  it('flags a missing NEXT_PUBLIC_APP_URL', async () => {
    delete process.env.NEXT_PUBLIC_APP_URL;

    const body = await (await health()).json();

    expect(body.checks.appUrlConfigured).toBe('fail');
  });
});

describe('information disclosure', () => {
  it('never returns the connection string or its host', async () => {
    process.env.DATABASE_URL = 'postgresql://admin:hunter2@secret-host.internal/zurl';

    const text = await (await health()).text();

    expect(text).not.toContain('hunter2');
    expect(text).not.toContain('secret-host.internal');
    expect(text).not.toContain('admin');
  });

  it('is never cached, so a stale healthy result cannot be served', async () => {
    const response = await health();
    expect(response.headers.get('cache-control')).toContain('no-store');
  });
});
