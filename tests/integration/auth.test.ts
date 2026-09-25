/**
 * Authentication: password hashing, credential verification, sessions and
 * API keys — against the real database.
 */

import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { sessions, users } from '@/lib/db/schema';
import {
  authenticateApiKey,
  createApiKey,
  hashApiKey,
  listApiKeys,
  revokeApiKey,
} from '@/lib/auth/api-key';
import {
  checkPasswordPolicy,
  hashPassword,
  MIN_PASSWORD_LENGTH,
  verifyPassword,
} from '@/lib/auth/password';
import {
  createSession,
  invalidateAllSessions,
  invalidateSession,
  pruneExpiredSessions,
  validateSessionToken,
} from '@/lib/auth/session';
import { createUser, isAdmin, isValidEmail, normaliseEmail, verifyCredentials } from '@/lib/auth/user';
import { createTestDb, destroyTestDb, truncateAll, type TestDb } from '../helpers/db';

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

describe('password hashing', () => {
  it('produces a verifiable hash', async () => {
    const hash = await hashPassword('correct-horse-battery-staple');
    expect(await verifyPassword('correct-horse-battery-staple', hash)).toBe(true);
  });

  it('rejects the wrong password', async () => {
    const hash = await hashPassword('correct-horse-battery-staple');
    expect(await verifyPassword('wrong-password-entirely', hash)).toBe(false);
  });

  it('never stores the plaintext', async () => {
    const hash = await hashPassword('my-secret-password');
    expect(hash).not.toContain('my-secret-password');
  });

  it('salts, so identical passwords hash differently', async () => {
    const a = await hashPassword('same-password-here');
    const b = await hashPassword('same-password-here');
    expect(a).not.toBe(b);
    // Both still verify.
    expect(await verifyPassword('same-password-here', a)).toBe(true);
    expect(await verifyPassword('same-password-here', b)).toBe(true);
  });

  it('embeds its parameters so they can be raised later', async () => {
    const hash = await hashPassword('another-password-x');
    expect(hash.startsWith('scrypt$65536$8$1$')).toBe(true);
  });

  it('is case sensitive', async () => {
    const hash = await hashPassword('CaseSensitivePass');
    expect(await verifyPassword('casesensitivepass', hash)).toBe(false);
  });

  it('handles unicode passwords', async () => {
    const password = 'пароль-密码-🔐-test';
    const hash = await hashPassword(password);
    expect(await verifyPassword(password, hash)).toBe(true);
  });

  it('rejects a malformed stored hash without throwing', async () => {
    for (const bad of ['', 'notahash', 'scrypt$bad', 'md5$1$2$3$4$5', 'scrypt$a$b$c$d$e']) {
      expect(await verifyPassword('anything', bad), bad).toBe(false);
    }
  });
});

describe('password policy', () => {
  it('requires a minimum length', () => {
    const result = checkPasswordPolicy('short');
    expect(result.ok).toBe(false);
  });

  it('accepts a password at the minimum length', () => {
    expect(checkPasswordPolicy('a'.repeat(MIN_PASSWORD_LENGTH)).ok).toBe(false); // repeated char
    expect(checkPasswordPolicy('abcdefghij').ok).toBe(true);
  });

  it('rejects very common passwords', () => {
    for (const password of ['password123', 'qwertyuiop', 'letmein123']) {
      expect(checkPasswordPolicy(password).ok, password).toBe(false);
    }
  });

  it('rejects a single repeated character', () => {
    expect(checkPasswordPolicy('aaaaaaaaaaaa').ok).toBe(false);
  });

  it('rejects an absurdly long password', () => {
    expect(checkPasswordPolicy('a'.repeat(500)).ok).toBe(false);
  });
});

describe('email handling', () => {
  it('normalises case and whitespace', () => {
    expect(normaliseEmail('  USER@Example.COM ')).toBe('user@example.com');
  });

  it('accepts valid addresses', () => {
    for (const email of ['a@b.co', 'user.name+tag@example.com', 'user@sub.example.co.uk']) {
      expect(isValidEmail(email), email).toBe(true);
    }
  });

  it('rejects invalid addresses', () => {
    for (const email of ['notanemail', '@example.com', 'user@', 'user @example.com', 'user@x']) {
      expect(isValidEmail(email), email).toBe(false);
    }
  });
});

describe('user creation', () => {
  it('creates a user with a hashed password', async () => {
    const result = await createUser('new@example.com', 'correct-horse-battery');
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.user.email).toBe('new@example.com');
    expect(result.user.passwordHash).not.toContain('correct-horse-battery');
    expect(result.user.role).toBe('user');
    expect(result.user.plan).toBe('free');
  });

  it('lowercases the stored email', async () => {
    const result = await createUser('MixedCase@Example.COM', 'correct-horse-battery');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.user.email).toBe('mixedcase@example.com');
  });

  it('rejects a duplicate email', async () => {
    await createUser('dupe@example.com', 'correct-horse-battery');
    const second = await createUser('dupe@example.com', 'a-different-password');
    expect(second.ok).toBe(false);
    if (!second.ok) expect(second.field).toBe('email');
  });

  it('rejects a duplicate differing only in case', async () => {
    await createUser('dupe@example.com', 'correct-horse-battery');
    const second = await createUser('DUPE@EXAMPLE.COM', 'correct-horse-battery');
    expect(second.ok).toBe(false);
  });

  it('rejects an invalid email', async () => {
    const result = await createUser('not-an-email', 'correct-horse-battery');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.field).toBe('email');
  });

  it('rejects a weak password', async () => {
    const result = await createUser('weak@example.com', 'short');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.field).toBe('password');
  });

  it('enforces email lowercase at the database level', async () => {
    await expect(
      testDb.db.insert(users).values({
        id: 'usr_bad',
        email: 'UPPER@EXAMPLE.COM',
        passwordHash: 'x',
      }),
    ).rejects.toThrow();
  });
});

describe('credential verification', () => {
  it('accepts correct credentials', async () => {
    await createUser('login@example.com', 'correct-horse-battery');
    const user = await verifyCredentials('login@example.com', 'correct-horse-battery');
    expect(user).not.toBeNull();
  });

  it('accepts a differently-cased email', async () => {
    await createUser('login@example.com', 'correct-horse-battery');
    const user = await verifyCredentials('LOGIN@EXAMPLE.COM', 'correct-horse-battery');
    expect(user).not.toBeNull();
  });

  it('rejects a wrong password', async () => {
    await createUser('login@example.com', 'correct-horse-battery');
    expect(await verifyCredentials('login@example.com', 'wrong-password')).toBeNull();
  });

  it('returns null for an unknown account', async () => {
    expect(await verifyCredentials('nobody@example.com', 'any-password')).toBeNull();
  });

  it('takes comparable time for known and unknown accounts', async () => {
    // A fast "no such user" path would let an attacker enumerate accounts.
    await createUser('timing@example.com', 'correct-horse-battery');

    const startKnown = performance.now();
    await verifyCredentials('timing@example.com', 'wrong-password');
    const knownMs = performance.now() - startKnown;

    const startUnknown = performance.now();
    await verifyCredentials('nobody@example.com', 'wrong-password');
    const unknownMs = performance.now() - startUnknown;

    // Both run a full scrypt. Allow a wide band; the point is that the unknown
    // path is not near-instant.
    expect(unknownMs).toBeGreaterThan(knownMs * 0.2);
  });
});

describe('sessions', () => {
  it('creates a session that validates', async () => {
    const user = await createUser('sess@example.com', 'correct-horse-battery');
    expect(user.ok).toBe(true);
    if (!user.ok) return;

    const { token } = await createSession(user.user.id);
    const resolved = await validateSessionToken(token);

    expect(resolved?.id).toBe(user.user.id);
    expect(resolved?.email).toBe('sess@example.com');
  });

  it('stores only a hash of the token', async () => {
    const user = await createUser('sess@example.com', 'correct-horse-battery');
    if (!user.ok) return;

    const { token } = await createSession(user.user.id);
    const rows = await testDb.db.select().from(sessions);

    expect(rows).toHaveLength(1);
    expect(rows[0]?.id).not.toBe(token);
    expect(rows[0]?.id).toHaveLength(64); // sha256 hex
  });

  it('rejects an unknown token', async () => {
    expect(await validateSessionToken('not-a-real-token')).toBeNull();
  });

  it('rejects an empty token', async () => {
    expect(await validateSessionToken('')).toBeNull();
  });

  it('rejects and removes an expired session', async () => {
    const user = await createUser('sess@example.com', 'correct-horse-battery');
    if (!user.ok) return;

    const { token } = await createSession(user.user.id);
    const rows = await testDb.db.select().from(sessions);
    const sessionId = rows[0]?.id;
    if (!sessionId) return;

    await testDb.db
      .update(sessions)
      .set({ expiresAt: new Date(Date.now() - 1000) })
      .where(eq(sessions.id, sessionId));

    expect(await validateSessionToken(token)).toBeNull();
    expect(await testDb.db.select().from(sessions)).toHaveLength(0);
  });

  it('invalidates a single session', async () => {
    const user = await createUser('sess@example.com', 'correct-horse-battery');
    if (!user.ok) return;

    const { token } = await createSession(user.user.id);
    await invalidateSession(token);

    expect(await validateSessionToken(token)).toBeNull();
  });

  it('invalidates every session for a user', async () => {
    const user = await createUser('sess@example.com', 'correct-horse-battery');
    if (!user.ok) return;

    const first = await createSession(user.user.id);
    const second = await createSession(user.user.id);

    await invalidateAllSessions(user.user.id);

    expect(await validateSessionToken(first.token)).toBeNull();
    expect(await validateSessionToken(second.token)).toBeNull();
  });

  it('does not affect another user\u2019s sessions', async () => {
    const alice = await createUser('alice@example.com', 'correct-horse-battery');
    const bob = await createUser('bob@example.com', 'correct-horse-battery');
    if (!alice.ok || !bob.ok) return;

    const aliceSession = await createSession(alice.user.id);
    const bobSession = await createSession(bob.user.id);

    await invalidateAllSessions(alice.user.id);

    expect(await validateSessionToken(aliceSession.token)).toBeNull();
    expect(await validateSessionToken(bobSession.token)).not.toBeNull();
  });

  it('prunes expired sessions', async () => {
    const user = await createUser('sess@example.com', 'correct-horse-battery');
    if (!user.ok) return;

    await createSession(user.user.id);
    await testDb.db.update(sessions).set({ expiresAt: new Date(Date.now() - 1000) });

    await pruneExpiredSessions();
    expect(await testDb.db.select().from(sessions)).toHaveLength(0);
  });

  it('cascades session deletion when a user is removed', async () => {
    const user = await createUser('sess@example.com', 'correct-horse-battery');
    if (!user.ok) return;

    await createSession(user.user.id);
    await testDb.db.delete(users).where(eq(users.id, user.user.id));

    expect(await testDb.db.select().from(sessions)).toHaveLength(0);
  });

  it('produces unique tokens', async () => {
    const user = await createUser('sess@example.com', 'correct-horse-battery');
    if (!user.ok) return;

    const tokens = new Set<string>();
    for (let i = 0; i < 25; i += 1) {
      const { token } = await createSession(user.user.id);
      tokens.add(token);
    }
    expect(tokens.size).toBe(25);
  });
});

describe('API keys', () => {
  it('issues a key with the expected prefix', async () => {
    const user = await createUser('key@example.com', 'correct-horse-battery');
    expect(user.ok).toBe(true);
    if (!user.ok) return;

    const { key, record } = await createApiKey(user.user.id, 'production');

    expect(key.startsWith('zurl_sk_')).toBe(true);
    expect(record.name).toBe('production');
    expect(record.prefix.startsWith('zurl_sk_')).toBe(true);
  });

  it('stores only a hash of the key', async () => {
    const user = await createUser('key@example.com', 'correct-horse-battery');
    if (!user.ok) return;

    const { key, record } = await createApiKey(user.user.id, 'test');

    expect(record.keyHash).not.toBe(key);
    expect(record.keyHash).toBe(hashApiKey(key));
    expect(record.keyHash).toHaveLength(64);
  });

  it('authenticates a valid key', async () => {
    const user = await createUser('key@example.com', 'correct-horse-battery');
    if (!user.ok) return;

    const { key } = await createApiKey(user.user.id, 'test');
    const principal = await authenticateApiKey(`Bearer ${key}`);

    expect(principal?.userId).toBe(user.user.id);
  });

  it('rejects an unknown or malformed key', async () => {
    for (const header of [
      null,
      '',
      'Bearer',
      'Bearer zurl_sk_totallyfake',
      'Basic zurl_sk_x',
      'zurl_sk_missing_bearer',
    ]) {
      expect(await authenticateApiKey(header), String(header)).toBeNull();
    }
  });

  it('rejects a revoked key', async () => {
    const user = await createUser('key@example.com', 'correct-horse-battery');
    if (!user.ok) return;

    const { key, record } = await createApiKey(user.user.id, 'test');
    expect(await revokeApiKey(record.id, user.user.id)).toBe(true);
    expect(await authenticateApiKey(`Bearer ${key}`)).toBeNull();
  });

  it("prevents revoking another user's key", async () => {
    const alice = await createUser('alice@example.com', 'correct-horse-battery');
    const bob = await createUser('bob@example.com', 'correct-horse-battery');
    if (!alice.ok || !bob.ok) return;

    const { key, record } = await createApiKey(alice.user.id, 'alice-key');

    expect(await revokeApiKey(record.id, bob.user.id)).toBe(false);
    // Still works for Alice.
    expect(await authenticateApiKey(`Bearer ${key}`)).not.toBeNull();
  });

  it('lists only active keys for the owner', async () => {
    const alice = await createUser('alice@example.com', 'correct-horse-battery');
    const bob = await createUser('bob@example.com', 'correct-horse-battery');
    if (!alice.ok || !bob.ok) return;

    await createApiKey(alice.user.id, 'one');
    const second = await createApiKey(alice.user.id, 'two');
    await createApiKey(bob.user.id, 'bob-key');

    expect(await listApiKeys(alice.user.id)).toHaveLength(2);

    await revokeApiKey(second.record.id, alice.user.id);
    expect(await listApiKeys(alice.user.id)).toHaveLength(1);
    expect(await listApiKeys(bob.user.id)).toHaveLength(1);
  });

  it('produces unique keys', async () => {
    const user = await createUser('key@example.com', 'correct-horse-battery');
    if (!user.ok) return;

    const keys = new Set<string>();
    for (let i = 0; i < 20; i += 1) {
      const { key } = await createApiKey(user.user.id, `key-${i}`);
      keys.add(key);
    }
    expect(keys.size).toBe(20);
  });
});

describe('roles', () => {
  it('identifies an admin', async () => {
    const admin = await createUser('admin@example.com', 'correct-horse-battery', 'admin');
    expect(admin.ok).toBe(true);
    if (admin.ok) expect(isAdmin(admin.user)).toBe(true);
  });

  it('does not treat an ordinary user as an admin', async () => {
    const user = await createUser('user@example.com', 'correct-horse-battery');
    if (user.ok) expect(isAdmin(user.user)).toBe(false);
  });

  it('treats an absent user as not an admin', () => {
    expect(isAdmin(null)).toBe(false);
  });

  it('defaults new accounts to the user role', async () => {
    const user = await createUser('default@example.com', 'correct-horse-battery');
    if (user.ok) expect(user.user.role).toBe('user');
  });

  it('rejects an invalid role at the database level', async () => {
    await expect(
      testDb.db.insert(users).values({
        id: 'usr_bad_role',
        email: 'bad@example.com',
        passwordHash: 'x',
        role: 'superadmin',
      }),
    ).rejects.toThrow();
  });
});
