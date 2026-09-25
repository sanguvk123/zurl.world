/**
 * Session management.
 *
 * The standard opaque-token pattern:
 *  - 32 random bytes, base32-encoded, handed to the browser in a cookie
 *  - only SHA-256(token) is stored, so a database leak does not yield usable
 *    sessions
 *  - lookup is by the hash, which is the primary key
 *  - sliding expiry: a session past its halfway point is extended on use
 */

import { createHash, randomBytes } from 'node:crypto';
import { eq, lt } from 'drizzle-orm';
import { cookies } from 'next/headers';
import { getDb } from '@/lib/db';
import { sessions, users, type User } from '@/lib/db/schema';
import { generateId } from '@/lib/links/short-code';

export const SESSION_COOKIE = 'zurl_session';
const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const RENEW_THRESHOLD_MS = SESSION_DURATION_MS / 2;

/** Crockford-ish base32 of 32 random bytes — URL and cookie safe. */
function generateSessionToken(): string {
  return randomBytes(32).toString('base64url');
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export async function createSession(userId: string): Promise<{ token: string; expiresAt: Date }> {
  const db = await getDb();
  const token = generateSessionToken();
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);

  await db.insert(sessions).values({
    id: hashToken(token),
    userId,
    expiresAt,
  });

  return { token, expiresAt };
}

export type SessionUser = Pick<User, 'id' | 'email' | 'role' | 'plan'>;

/**
 * Validates a raw token and returns the owning user.
 * Expired sessions are deleted as they are encountered.
 */
export async function validateSessionToken(token: string): Promise<SessionUser | null> {
  if (!token) return null;

  const db = await getDb();
  const sessionId = hashToken(token);

  const rows = await db
    .select({
      sessionId: sessions.id,
      expiresAt: sessions.expiresAt,
      id: users.id,
      email: users.email,
      role: users.role,
      plan: users.plan,
    })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(eq(sessions.id, sessionId))
    .limit(1);

  const row = rows[0];
  if (!row) return null;

  if (row.expiresAt.getTime() <= Date.now()) {
    await db.delete(sessions).where(eq(sessions.id, sessionId));
    return null;
  }

  // Sliding expiry: extend a session that is more than halfway through its life.
  if (row.expiresAt.getTime() - Date.now() < RENEW_THRESHOLD_MS) {
    await db
      .update(sessions)
      .set({ expiresAt: new Date(Date.now() + SESSION_DURATION_MS) })
      .where(eq(sessions.id, sessionId));
  }

  return { id: row.id, email: row.email, role: row.role, plan: row.plan };
}

export async function invalidateSession(token: string): Promise<void> {
  const db = await getDb();
  await db.delete(sessions).where(eq(sessions.id, hashToken(token)));
}

/** Revokes every session for a user (password change, "sign out everywhere"). */
export async function invalidateAllSessions(userId: string): Promise<void> {
  const db = await getDb();
  await db.delete(sessions).where(eq(sessions.userId, userId));
}

/** Housekeeping: removes expired rows. */
export async function pruneExpiredSessions(): Promise<void> {
  const db = await getDb();
  await db.delete(sessions).where(lt(sessions.expiresAt, new Date()));
}

// ---------------------------------------------------------------------------
// Cookie helpers
// ---------------------------------------------------------------------------

export async function setSessionCookie(token: string, expiresAt: Date): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    // Lax, not Strict: the session must survive following a link back into the
    // app from an email or another site. Lax still blocks cross-site POSTs.
    sameSite: 'lax',
    path: '/',
    expires: expiresAt,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

/**
 * Current user, or null. Safe to call from any server component or route.
 *
 * Reads the session token from the request cookie when a request scope exists,
 * and falls back to the `Cookie` header otherwise. Outside any request scope
 * there is no session by definition, so this returns null rather than throwing
 * — an unauthenticated result is always a valid answer, and a crash here would
 * turn a missing cookie into a 500.
 */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const token = await readSessionToken();
  if (!token) return null;
  return validateSessionToken(token);
}

async function readSessionToken(): Promise<string | null> {
  try {
    const store = await cookies();
    return store.get(SESSION_COOKIE)?.value ?? null;
  } catch {
    return null;
  }
}

/**
 * Resolves the user from an explicit `Request`.
 *
 * Used by route handlers that may be invoked outside a Next request scope
 * (notably in tests), and anywhere the cookie should be read from a request we
 * already hold rather than from ambient context.
 */
export async function getUserFromRequest(request: Request): Promise<SessionUser | null> {
  const ambient = await getCurrentUser();
  if (ambient) return ambient;

  const header = request.headers.get('cookie');
  if (!header) return null;

  const token = parseCookie(header, SESSION_COOKIE);
  if (!token) return null;

  return validateSessionToken(token);
}

function parseCookie(header: string, name: string): string | null {
  for (const part of header.split(';')) {
    const index = part.indexOf('=');
    if (index === -1) continue;
    if (part.slice(0, index).trim() !== name) continue;
    return decodeURIComponent(part.slice(index + 1).trim());
  }
  return null;
}

/** Creates a session, sets the cookie. Used by sign-in and sign-up. */
export async function startSession(userId: string): Promise<void> {
  const { token, expiresAt } = await createSession(userId);
  await setSessionCookie(token, expiresAt);
}

export { generateId };
