/**
 * Behaviour when the database is unreachable.
 *
 * A misconfigured deployment is the most likely cause of a database failure,
 * and it usually happens during the first deploy — exactly when good
 * diagnostics matter most. An unhandled throw inside a route handler produces
 * an empty response body with no usable status, which tells whoever is
 * debugging it nothing at all. These tests pin down that the API degrades into
 * a real, readable HTTP error instead.
 *
 * `createLink` is hoisted-mocked rather than spied on: the route imports it
 * statically, so a spy applied after import would never be seen by the handler
 * and these tests would pass whether or not the error handling exists.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type * as LinkService from '@/lib/links/service';

const createLinkMock = vi.hoisted(() => vi.fn());

vi.mock('@/lib/links/service', async (importOriginal) => {
  const actual = await importOriginal<typeof LinkService>();
  return { ...actual, createLink: createLinkMock };
});

import { POST as createLinkRoute } from '@/app/api/links/route';
import { resetDbForTesting } from '@/lib/db';
import { MemoryRateLimitStore, setRateLimitStore } from '@/lib/security/rate-limit';

beforeEach(() => {
  setRateLimitStore(new MemoryRateLimitStore());
  createLinkMock.mockReset();
});

afterEach(() => {
  resetDbForTesting();
});

/** Builds a create-link request the way the website form would. */
function createRequest(body: unknown): Request {
  return new Request('https://zurl.world/api/links', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('database unreachable', () => {
  it('returns 503 rather than an empty response', async () => {
    // Exactly what a missing DATABASE_URL produces in production: the
    // connection attempt throws before any query runs.
    createLinkMock.mockRejectedValue(
      new Error('DATABASE_URL must be set to a PostgreSQL connection string in production.'),
    );

    const response = await createLinkRoute(
      createRequest({ url: 'https://example.com/deploy-check' }) as never,
    );

    expect(createLinkMock).toHaveBeenCalled();
    expect(response.status).toBe(503);
  });

  it('returns a JSON body a client can actually parse', async () => {
    createLinkMock.mockRejectedValue(new Error('connection refused'));

    const response = await createLinkRoute(
      createRequest({ url: 'https://example.com/deploy-check' }) as never,
    );
    const body = await response.json();

    expect(body.ok).toBe(false);
    expect(body.error.code).toBe('service_unavailable');
    expect(body.error.message).toMatch(/try again/i);
  });

  it('does not leak the internal error to the caller', async () => {
    createLinkMock.mockRejectedValue(
      new Error('postgresql://admin:hunter2@db.internal:5432/zurl refused'),
    );

    const response = await createLinkRoute(
      createRequest({ url: 'https://example.com/deploy-check' }) as never,
    );
    const text = await response.text();

    // A connection string can carry credentials; it must never reach the client.
    expect(text).not.toContain('hunter2');
    expect(text).not.toContain('db.internal');
  });

  it('rejects a malformed request body before reaching the database', async () => {
    // Shape validation runs in the route, so an empty URL is a 400 and never
    // reaches the service. Protocol rules (rejecting `javascript:`) live in
    // the service layer and are covered by the URL validation suite.
    const response = await createLinkRoute(createRequest({ url: '' }) as never);

    expect(response.status).toBe(400);
    expect(createLinkMock).not.toHaveBeenCalled();
  });
});
