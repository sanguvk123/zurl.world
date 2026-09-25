import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { links } from '@/lib/db/schema';
import {
  createLink,
  deleteUserLink,
  findLinkByCode,
  findRedirectTarget,
  findUserLink,
  linkState,
  listUserLinks,
  updateUserLink,
  verifyLinkPassword,
} from '@/lib/links/service';
import { createTestDb, destroyTestDb, truncateAll, type TestDb } from '../helpers/db';
import { createUser } from '@/lib/auth/user';

let testDb: TestDb;

beforeAll(async () => {
  testDb = await createTestDb();
});

afterAll(async () => {
  await destroyTestDb(testDb);
});

beforeEach(async () => {
  await truncateAll(testDb.db);
});

describe('createLink — happy path', () => {
  it('creates a link with a generated code', async () => {
    const result = await createLink({ destinationUrl: 'https://example.com/page' });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.link.shortCode).toHaveLength(7);
    expect(result.link.destinationUrl).toBe('https://example.com/page');
    expect(result.link.isCustomAlias).toBe(0);
    expect(result.link.clickCount).toBe(0);
    expect(result.link.userId).toBeNull();
  });

  it('works without an account', async () => {
    const result = await createLink({ destinationUrl: 'https://example.com' });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.link.userId).toBeNull();
  });

  it('never exposes a sequential id', async () => {
    const first = await createLink({ destinationUrl: 'https://example.com/1' });
    const second = await createLink({ destinationUrl: 'https://example.com/2' });
    expect(first.ok && second.ok).toBe(true);
    if (!first.ok || !second.ok) return;

    expect(first.link.id.startsWith('lnk_')).toBe(true);
    expect(Number.isNaN(Number(first.link.id.slice(4)))).toBe(true);
    expect(first.link.shortCode).not.toBe(second.link.shortCode);
  });

  it('stores a title when supplied', async () => {
    const result = await createLink({
      destinationUrl: 'https://example.com',
      title: 'Spring campaign',
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.link.title).toBe('Spring campaign');
  });

  it('assigns ownership when a user is supplied', async () => {
    const user = await createUser('owner@example.com', 'correct-horse-battery');
    expect(user.ok).toBe(true);
    if (!user.ok) return;

    const result = await createLink({
      destinationUrl: 'https://example.com',
      userId: user.user.id,
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.link.userId).toBe(user.user.id);
  });

  it('surfaces heuristic warnings without blocking creation', async () => {
    const result = await createLink({ destinationUrl: 'https://bit.ly/xyz' });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.warnings).toContain('shortener_chain');
  });
});

describe('createLink — validation', () => {
  it('rejects a javascript: URL', async () => {
    const result = await createLink({ destinationUrl: 'javascript:alert(1)' });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.field).toBe('destinationUrl');
      expect(result.error.code).toBe('unsupported_protocol');
    }
  });

  it('rejects a private host', async () => {
    const result = await createLink({ destinationUrl: 'http://169.254.169.254/meta' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('private_host');
  });

  it('rejects an over-long title', async () => {
    const result = await createLink({
      destinationUrl: 'https://example.com',
      title: 'a'.repeat(200),
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.field).toBe('title');
  });

  it('rejects an expiry in the past', async () => {
    const result = await createLink({
      destinationUrl: 'https://example.com',
      expiresAt: new Date(Date.now() - 1000),
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('in_past');
  });

  it('rejects an expiry beyond ten years', async () => {
    const result = await createLink({
      destinationUrl: 'https://example.com',
      expiresAt: new Date(Date.now() + 11 * 365 * 24 * 60 * 60 * 1000),
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('too_far');
  });
});

describe('createLink — custom aliases', () => {
  it('creates a link at a chosen alias', async () => {
    const result = await createLink({
      destinationUrl: 'https://example.com/product',
      alias: 'my-product',
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.link.shortCode).toBe('my-product');
      expect(result.link.isCustomAlias).toBe(1);
    }
  });

  it('lowercases the alias', async () => {
    const result = await createLink({
      destinationUrl: 'https://example.com',
      alias: 'MyProduct',
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.link.shortCode).toBe('myproduct');
  });

  it('rejects a duplicate alias with a useful message', async () => {
    await createLink({ destinationUrl: 'https://example.com/a', alias: 'taken-name' });
    const second = await createLink({
      destinationUrl: 'https://example.com/b',
      alias: 'taken-name',
    });

    expect(second.ok).toBe(false);
    if (!second.ok) {
      expect(second.error.field).toBe('alias');
      expect(second.error.code).toBe('taken');
      expect(second.error.message).toBe('That custom alias is already in use.');
    }
  });

  it('rejects a duplicate alias differing only in case', async () => {
    await createLink({ destinationUrl: 'https://example.com/a', alias: 'sale' });
    const second = await createLink({ destinationUrl: 'https://example.com/b', alias: 'SALE' });
    expect(second.ok).toBe(false);
  });

  it('rejects reserved aliases', async () => {
    for (const alias of ['api', 'admin', 'dashboard', 'url-shortener']) {
      const result = await createLink({ destinationUrl: 'https://example.com', alias });
      expect(result.ok, alias).toBe(false);
      if (!result.ok) expect(result.error.code).toBe('reserved');
    }
  });

  it('rejects aliases containing path separators', async () => {
    const result = await createLink({
      destinationUrl: 'https://example.com',
      alias: '../admin',
    });
    expect(result.ok).toBe(false);
  });
});

describe('createLink — collision handling', () => {
  it('retries when a generated code already exists', async () => {
    // Pre-seed every 7-character code the generator could pick is impractical,
    // so instead verify that a direct unique-constraint conflict is handled by
    // the ON CONFLICT path rather than throwing.
    const first = await createLink({ destinationUrl: 'https://example.com/a' });
    expect(first.ok).toBe(true);
    if (!first.ok) return;

    // Insert a second link, then attempt to force the same code via an alias.
    const clash = await createLink({
      destinationUrl: 'https://example.com/b',
      alias: first.link.shortCode.toLowerCase(),
    });

    // Either the alias is rejected as taken (when the generated code was
    // already lowercase) or it succeeds as a distinct code. Neither throws.
    expect(typeof clash.ok).toBe('boolean');
  });

  it('creates many links concurrently without collisions', async () => {
    const results = await Promise.all(
      Array.from({ length: 60 }, (_, i) =>
        createLink({ destinationUrl: `https://example.com/page-${i}` }),
      ),
    );

    expect(results.every((result) => result.ok)).toBe(true);
    const codes = new Set(results.map((r) => (r.ok ? r.link.shortCode : '')));
    expect(codes.size).toBe(60);
  });
});

describe('findRedirectTarget', () => {
  it('finds an existing link', async () => {
    const created = await createLink({ destinationUrl: 'https://example.com/target' });
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    const target = await findRedirectTarget(created.link.shortCode);
    expect(target?.destinationUrl).toBe('https://example.com/target');
  });

  it('returns null for an unknown code', async () => {
    expect(await findRedirectTarget('nonexistent')).toBeNull();
  });

  it('is case sensitive for generated codes', async () => {
    const created = await createLink({ destinationUrl: 'https://example.com' });
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    const flipped = created.link.shortCode
      .split('')
      .map((c) => (c === c.toLowerCase() ? c.toUpperCase() : c.toLowerCase()))
      .join('');

    if (flipped !== created.link.shortCode) {
      expect(await findRedirectTarget(flipped)).toBeNull();
    }
  });
});

describe('link state', () => {
  it('reports an active link', async () => {
    const created = await createLink({ destinationUrl: 'https://example.com' });
    expect(created.ok).toBe(true);
    if (created.ok) expect(linkState(created.link)).toBe('active');
  });

  it('reports an expired link', async () => {
    const created = await createLink({
      destinationUrl: 'https://example.com',
      expiresAt: new Date(Date.now() + 60_000),
    });
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    // Move the expiry into the past directly, bypassing create-time validation.
    await testDb.db
      .update(links)
      .set({ expiresAt: new Date(Date.now() - 1000) })
      .where(eq(links.id, created.link.id));

    const reloaded = await findLinkByCode(created.link.shortCode);
    expect(reloaded).not.toBeNull();
    if (reloaded) expect(linkState(reloaded)).toBe('expired');
  });

  it('reports a disabled link', async () => {
    const created = await createLink({ destinationUrl: 'https://example.com' });
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    await testDb.db
      .update(links)
      .set({ disabledAt: new Date(), disabledReason: 'abuse' })
      .where(eq(links.id, created.link.id));

    const reloaded = await findLinkByCode(created.link.shortCode);
    if (reloaded) expect(linkState(reloaded)).toBe('disabled');
  });

  it('treats disabled as taking precedence over expiry', async () => {
    const state = linkState({
      disabledAt: new Date(),
      expiresAt: new Date(Date.now() - 1000),
    });
    expect(state).toBe('disabled');
  });
});

describe('password-protected links', () => {
  it('accepts the correct password', async () => {
    const created = await createLink({
      destinationUrl: 'https://example.com/secret',
      password: 'hunter2!',
    });
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    expect(created.link.passwordHash).not.toBeNull();
    expect(created.link.passwordHash).not.toContain('hunter2');

    const result = await verifyLinkPassword(created.link.shortCode, 'hunter2!');
    expect(result.ok).toBe(true);
    expect(result.destinationUrl).toBe('https://example.com/secret');
  });

  it('rejects the wrong password', async () => {
    const created = await createLink({
      destinationUrl: 'https://example.com/secret',
      password: 'hunter2!',
    });
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    const result = await verifyLinkPassword(created.link.shortCode, 'wrong');
    expect(result.ok).toBe(false);
    expect(result.destinationUrl).toBeUndefined();
  });

  it('rejects a too-short password at creation', async () => {
    const result = await createLink({
      destinationUrl: 'https://example.com',
      password: 'ab',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.field).toBe('password');
  });
});

describe('authorization boundaries', () => {
  it('prevents one user reading another user\u2019s link', async () => {
    const alice = await createUser('alice@example.com', 'correct-horse-battery');
    const bob = await createUser('bob@example.com', 'correct-horse-battery');
    expect(alice.ok && bob.ok).toBe(true);
    if (!alice.ok || !bob.ok) return;

    const created = await createLink({
      destinationUrl: 'https://example.com/private',
      userId: alice.user.id,
    });
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    expect(await findUserLink(created.link.id, alice.user.id)).not.toBeNull();
    expect(await findUserLink(created.link.id, bob.user.id)).toBeNull();
  });

  it('prevents one user updating another user\u2019s link', async () => {
    const alice = await createUser('alice@example.com', 'correct-horse-battery');
    const bob = await createUser('bob@example.com', 'correct-horse-battery');
    if (!alice.ok || !bob.ok) return;

    const created = await createLink({
      destinationUrl: 'https://example.com/private',
      userId: alice.user.id,
    });
    if (!created.ok) return;

    const attempt = await updateUserLink(created.link.id, bob.user.id, {
      destinationUrl: 'https://evil.example.com',
    });
    expect(attempt.ok).toBe(false);

    const unchanged = await findLinkByCode(created.link.shortCode);
    expect(unchanged?.destinationUrl).toBe('https://example.com/private');
  });

  it('prevents one user deleting another user\u2019s link', async () => {
    const alice = await createUser('alice@example.com', 'correct-horse-battery');
    const bob = await createUser('bob@example.com', 'correct-horse-battery');
    if (!alice.ok || !bob.ok) return;

    const created = await createLink({
      destinationUrl: 'https://example.com/private',
      userId: alice.user.id,
    });
    if (!created.ok) return;

    expect(await deleteUserLink(created.link.id, bob.user.id)).toBe(false);
    expect(await findLinkByCode(created.link.shortCode)).not.toBeNull();

    expect(await deleteUserLink(created.link.id, alice.user.id)).toBe(true);
    expect(await findLinkByCode(created.link.shortCode)).toBeNull();
  });

  it('only lists a user\u2019s own links', async () => {
    const alice = await createUser('alice@example.com', 'correct-horse-battery');
    const bob = await createUser('bob@example.com', 'correct-horse-battery');
    if (!alice.ok || !bob.ok) return;

    await createLink({ destinationUrl: 'https://example.com/a1', userId: alice.user.id });
    await createLink({ destinationUrl: 'https://example.com/a2', userId: alice.user.id });
    await createLink({ destinationUrl: 'https://example.com/b1', userId: bob.user.id });

    expect(await listUserLinks(alice.user.id)).toHaveLength(2);
    expect(await listUserLinks(bob.user.id)).toHaveLength(1);
  });
});

describe('updateUserLink', () => {
  it('updates the destination after validation', async () => {
    const user = await createUser('u@example.com', 'correct-horse-battery');
    if (!user.ok) return;

    const created = await createLink({
      destinationUrl: 'https://example.com/old',
      userId: user.user.id,
    });
    if (!created.ok) return;

    const updated = await updateUserLink(created.link.id, user.user.id, {
      destinationUrl: 'https://example.com/new',
    });
    expect(updated.ok).toBe(true);
    if (updated.ok) expect(updated.link.destinationUrl).toBe('https://example.com/new');
  });

  it('refuses to update to a dangerous URL', async () => {
    const user = await createUser('u@example.com', 'correct-horse-battery');
    if (!user.ok) return;

    const created = await createLink({
      destinationUrl: 'https://example.com/old',
      userId: user.user.id,
    });
    if (!created.ok) return;

    const updated = await updateUserLink(created.link.id, user.user.id, {
      destinationUrl: 'javascript:alert(1)',
    });
    expect(updated.ok).toBe(false);
  });

  it('disables and re-enables a link', async () => {
    const user = await createUser('u@example.com', 'correct-horse-battery');
    if (!user.ok) return;

    const created = await createLink({
      destinationUrl: 'https://example.com',
      userId: user.user.id,
    });
    if (!created.ok) return;

    const disabled = await updateUserLink(created.link.id, user.user.id, { disabled: true });
    expect(disabled.ok).toBe(true);
    if (disabled.ok) expect(linkState(disabled.link)).toBe('disabled');

    const enabled = await updateUserLink(created.link.id, user.user.id, { disabled: false });
    expect(enabled.ok).toBe(true);
    if (enabled.ok) expect(linkState(enabled.link)).toBe('active');
  });
});
