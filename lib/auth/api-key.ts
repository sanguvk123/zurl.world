/**
 * API key issuance and verification.
 *
 * Keys are shown exactly once, at creation. Only a SHA-256 hash is stored, so a
 * database leak does not yield working keys. Lookup is by that hash, which is
 * the unique-indexed column.
 */

import { createHash, randomBytes } from 'node:crypto';
import { and, desc, eq, isNull } from 'drizzle-orm';
import { getDb } from '@/lib/db';
import { apiKeys, users, type ApiKey } from '@/lib/db/schema';
import { generateId } from '@/lib/links/short-code';

/** Recognisable prefix so a leaked key can be identified in logs or a repo. */
const KEY_PREFIX = 'zurl_sk_';

export type IssuedApiKey = { key: string; record: ApiKey };

export function hashApiKey(key: string): string {
  return createHash('sha256').update(key).digest('hex');
}

export async function createApiKey(userId: string, name: string): Promise<IssuedApiKey> {
  const secret = randomBytes(32).toString('base64url');
  const key = `${KEY_PREFIX}${secret}`;

  const db = await getDb();
  const rows = await db
    .insert(apiKeys)
    .values({
      id: generateId('key'),
      userId,
      name: name.trim().slice(0, 64) || 'API key',
      keyHash: hashApiKey(key),
      // Enough to identify the key in a list, not enough to use it.
      prefix: `${KEY_PREFIX}${secret.slice(0, 6)}`,
    })
    .returning();

  const record = rows[0];
  if (!record) throw new Error('Failed to create API key');

  return { key, record };
}

export type ApiKeyPrincipal = {
  userId: string;
  keyId: string;
  plan: string;
  role: string;
};

/**
 * Resolves an `Authorization: Bearer` header to a principal.
 * Returns null for a missing, malformed, unknown or revoked key.
 */
export async function authenticateApiKey(
  authorization: string | null,
): Promise<ApiKeyPrincipal | null> {
  if (!authorization) return null;

  const match = /^Bearer\s+(.+)$/i.exec(authorization.trim());
  const key = match?.[1]?.trim();
  if (!key || !key.startsWith(KEY_PREFIX)) return null;

  const db = await getDb();
  const rows = await db
    .select({
      keyId: apiKeys.id,
      userId: apiKeys.userId,
      revokedAt: apiKeys.revokedAt,
      plan: users.plan,
      role: users.role,
    })
    .from(apiKeys)
    .innerJoin(users, eq(apiKeys.userId, users.id))
    .where(eq(apiKeys.keyHash, hashApiKey(key)))
    .limit(1);

  const row = rows[0];
  if (!row || row.revokedAt) return null;

  // Best-effort last-used timestamp; never block the request on it.
  void db
    .update(apiKeys)
    .set({ lastUsedAt: new Date() })
    .where(eq(apiKeys.id, row.keyId))
    .catch(() => undefined);

  return { userId: row.userId, keyId: row.keyId, plan: row.plan, role: row.role };
}

export async function listApiKeys(userId: string): Promise<ApiKey[]> {
  const db = await getDb();
  return db
    .select()
    .from(apiKeys)
    .where(and(eq(apiKeys.userId, userId), isNull(apiKeys.revokedAt)))
    .orderBy(desc(apiKeys.createdAt));
}

/** Revokes a key. Ownership is enforced in the WHERE clause. */
export async function revokeApiKey(keyId: string, userId: string): Promise<boolean> {
  const db = await getDb();
  const rows = await db
    .update(apiKeys)
    .set({ revokedAt: new Date() })
    .where(and(eq(apiKeys.id, keyId), eq(apiKeys.userId, userId)))
    .returning({ id: apiKeys.id });
  return rows.length > 0;
}
