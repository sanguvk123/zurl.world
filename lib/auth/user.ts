/**
 * User account creation and credential verification.
 */

import { eq } from 'drizzle-orm';
import { getDb } from '@/lib/db';
import { users, type User } from '@/lib/db/schema';
import { generateId } from '@/lib/links/short-code';
import { checkPasswordPolicy, hashPassword, verifyPassword } from './password';

export type CreateUserResult =
  | { ok: true; user: User }
  | { ok: false; field: 'email' | 'password'; message: string };

/** RFC-pragmatic email check: structure only, no deliverability claim. */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@.]+\.[^\s@]{2,}$/;

export function normaliseEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isValidEmail(email: string): boolean {
  const normalised = normaliseEmail(email);
  return normalised.length <= 254 && EMAIL_PATTERN.test(normalised);
}

export async function createUser(
  rawEmail: string,
  password: string,
  role: 'user' | 'admin' = 'user',
): Promise<CreateUserResult> {
  const email = normaliseEmail(rawEmail);

  if (!isValidEmail(email)) {
    return { ok: false, field: 'email', message: 'Enter a valid email address.' };
  }

  const policy = checkPasswordPolicy(password);
  if (!policy.ok) {
    return { ok: false, field: 'password', message: policy.message };
  }

  const db = await getDb();
  const passwordHash = await hashPassword(password);

  // Uniqueness is settled by the database, not a prior SELECT, so two
  // simultaneous sign-ups cannot both succeed.
  const rows = await db
    .insert(users)
    .values({ id: generateId('usr'), email, passwordHash, role })
    .onConflictDoNothing({ target: users.email })
    .returning();

  const user = rows[0];
  if (!user) {
    return { ok: false, field: 'email', message: 'An account with that email already exists.' };
  }

  return { ok: true, user };
}

export async function findUserByEmail(rawEmail: string): Promise<User | null> {
  const db = await getDb();
  const rows = await db
    .select()
    .from(users)
    .where(eq(users.email, normaliseEmail(rawEmail)))
    .limit(1);
  return rows[0] ?? null;
}

export async function findUserById(id: string): Promise<User | null> {
  const db = await getDb();
  const rows = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return rows[0] ?? null;
}

/**
 * Verifies credentials.
 *
 * On an unknown email a dummy hash is still verified so the response time does
 * not reveal whether the account exists.
 */
const DUMMY_HASH =
  'scrypt$65536$8$1$00000000000000000000000000000000$' + '0'.repeat(128);

export async function verifyCredentials(
  rawEmail: string,
  password: string,
): Promise<User | null> {
  const user = await findUserByEmail(rawEmail);

  if (!user) {
    await verifyPassword(password, DUMMY_HASH);
    return null;
  }

  const valid = await verifyPassword(password, user.passwordHash);
  return valid ? user : null;
}

export function isAdmin(user: Pick<User, 'role'> | null): boolean {
  return user?.role === 'admin';
}
