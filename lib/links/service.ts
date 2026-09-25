/**
 * Link service — all create/read/update logic for short links.
 *
 * Every mutation goes through here, so validation and authorization cannot be
 * bypassed by a new caller. Route handlers stay thin.
 */

import { and, desc, eq, isNull, or, sql } from 'drizzle-orm';
import { getDb } from '@/lib/db';
import { links, type Link } from '@/lib/db/schema';
import { hashPassword, verifyPassword } from '@/lib/auth/password';
import {
  DEFAULT_CODE_LENGTH,
  MAX_CODE_LENGTH,
  generateId,
  generateShortCode,
  validateAlias,
} from './short-code';
import { validateDestinationUrl, type UrlWarning } from './url';

export const MAX_TITLE_LENGTH = 120;

export type CreateLinkInput = {
  destinationUrl: string;
  alias?: string | undefined;
  title?: string | undefined;
  password?: string | undefined;
  expiresAt?: Date | undefined;
  userId?: string | undefined;
  creatorIpHash?: string | undefined;
};

export type CreateLinkError =
  | { field: 'destinationUrl'; code: string; message: string }
  | { field: 'alias'; code: string; message: string }
  | { field: 'title'; code: string; message: string }
  | { field: 'expiresAt'; code: string; message: string }
  | { field: 'password'; code: string; message: string }
  | { field: 'general'; code: string; message: string };

export type CreateLinkResult =
  | { ok: true; link: Link; warnings: UrlWarning[] }
  | { ok: false; error: CreateLinkError };

/** Maximum attempts to find a free random code before widening the alphabet. */
const MAX_COLLISION_RETRIES = 5;

export async function createLink(input: CreateLinkInput): Promise<CreateLinkResult> {
  // 1. Destination URL — the security-critical check.
  const urlResult = validateDestinationUrl(input.destinationUrl);
  if (!urlResult.ok) {
    return {
      ok: false,
      error: { field: 'destinationUrl', code: urlResult.reason, message: urlResult.message },
    };
  }

  // 2. Title.
  const title = input.title?.trim();
  if (title && title.length > MAX_TITLE_LENGTH) {
    return {
      ok: false,
      error: {
        field: 'title',
        code: 'too_long',
        message: `Titles must be ${MAX_TITLE_LENGTH} characters or fewer.`,
      },
    };
  }

  // 3. Expiry must be in the future and within a sane horizon.
  if (input.expiresAt) {
    if (Number.isNaN(input.expiresAt.getTime())) {
      return {
        ok: false,
        error: { field: 'expiresAt', code: 'invalid', message: 'That expiry date is not valid.' },
      };
    }
    if (input.expiresAt.getTime() <= Date.now()) {
      return {
        ok: false,
        error: {
          field: 'expiresAt',
          code: 'in_past',
          message: 'Choose an expiry date in the future.',
        },
      };
    }
    const tenYears = Date.now() + 10 * 365 * 24 * 60 * 60 * 1000;
    if (input.expiresAt.getTime() > tenYears) {
      return {
        ok: false,
        error: {
          field: 'expiresAt',
          code: 'too_far',
          message: 'Expiry must be within 10 years.',
        },
      };
    }
  }

  // 4. Password.
  let passwordHash: string | null = null;
  if (input.password && input.password.length > 0) {
    if (input.password.length < 4) {
      return {
        ok: false,
        error: {
          field: 'password',
          code: 'too_short',
          message: 'Link passwords must be at least 4 characters.',
        },
      };
    }
    passwordHash = await hashPassword(input.password);
  }

  const db = await getDb();

  // 5. Custom alias, if supplied.
  if (input.alias && input.alias.trim().length > 0) {
    const aliasResult = validateAlias(input.alias);
    if (!aliasResult.ok) {
      return {
        ok: false,
        error: { field: 'alias', code: aliasResult.reason, message: aliasResult.message },
      };
    }

    const inserted = await insertLink(db, {
      shortCode: aliasResult.alias,
      isCustomAlias: 1,
      destinationUrl: urlResult.url,
      title: title || null,
      userId: input.userId ?? null,
      expiresAt: input.expiresAt ?? null,
      passwordHash,
      creatorIpHash: input.creatorIpHash ?? null,
    });

    if (!inserted) {
      // The unique index rejected it — someone else holds this alias.
      return {
        ok: false,
        error: {
          field: 'alias',
          code: 'taken',
          message: 'That custom alias is already in use.',
        },
      };
    }

    return { ok: true, link: inserted, warnings: urlResult.warnings };
  }

  // 6. Generated code, with collision retry.
  //
  // A collision at 56^7 is vanishingly unlikely, but "unlikely" is not "never"
  // and the failure mode (500 on create) is user-visible. After several
  // attempts at the default length the code widens, which makes exhaustion
  // impossible in practice.
  for (let attempt = 0; attempt < MAX_COLLISION_RETRIES; attempt += 1) {
    const length = Math.min(DEFAULT_CODE_LENGTH + Math.floor(attempt / 2), MAX_CODE_LENGTH);
    const inserted = await insertLink(db, {
      shortCode: generateShortCode(length),
      isCustomAlias: 0,
      destinationUrl: urlResult.url,
      title: title || null,
      userId: input.userId ?? null,
      expiresAt: input.expiresAt ?? null,
      passwordHash,
      creatorIpHash: input.creatorIpHash ?? null,
    });

    if (inserted) {
      return { ok: true, link: inserted, warnings: urlResult.warnings };
    }
  }

  return {
    ok: false,
    error: {
      field: 'general',
      code: 'code_generation_failed',
      message: 'Could not create a short link right now. Please try again.',
    },
  };
}

type InsertPayload = {
  shortCode: string;
  isCustomAlias: number;
  destinationUrl: string;
  title: string | null;
  userId: string | null;
  expiresAt: Date | null;
  passwordHash: string | null;
  creatorIpHash: string | null;
};

/**
 * Inserts a link, returning null when the short code is already taken.
 *
 * Uses `ON CONFLICT DO NOTHING` so uniqueness is settled by the database. A
 * read-then-write check would race under concurrency; the unique index cannot.
 */
async function insertLink(
  db: Awaited<ReturnType<typeof getDb>>,
  payload: InsertPayload,
): Promise<Link | null> {
  const rows = await db
    .insert(links)
    .values({ id: generateId('lnk'), ...payload })
    .onConflictDoNothing({ target: links.shortCode })
    .returning();

  return rows[0] ?? null;
}

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

/** Minimal projection for the redirect hot path. */
export type RedirectTarget = Pick<
  Link,
  'id' | 'destinationUrl' | 'expiresAt' | 'disabledAt' | 'passwordHash'
>;

/**
 * Single indexed lookup used by the redirect route.
 * Selects only the columns the redirect decision needs.
 */
export async function findRedirectTarget(shortCode: string): Promise<RedirectTarget | null> {
  const db = await getDb();
  const rows = await db
    .select({
      id: links.id,
      destinationUrl: links.destinationUrl,
      expiresAt: links.expiresAt,
      disabledAt: links.disabledAt,
      passwordHash: links.passwordHash,
    })
    .from(links)
    .where(eq(links.shortCode, shortCode))
    .limit(1);

  return rows[0] ?? null;
}

export type LinkState = 'active' | 'expired' | 'disabled';

export function linkState(link: Pick<Link, 'expiresAt' | 'disabledAt'>): LinkState {
  if (link.disabledAt) return 'disabled';
  if (link.expiresAt && link.expiresAt.getTime() <= Date.now()) return 'expired';
  return 'active';
}

export async function findLinkByCode(shortCode: string): Promise<Link | null> {
  const db = await getDb();
  const rows = await db.select().from(links).where(eq(links.shortCode, shortCode)).limit(1);
  return rows[0] ?? null;
}

export async function findLinkById(id: string): Promise<Link | null> {
  const db = await getDb();
  const rows = await db.select().from(links).where(eq(links.id, id)).limit(1);
  return rows[0] ?? null;
}

/**
 * A link owned by `userId`.
 * Ownership is part of the WHERE clause, not a check after the fact, so a
 * caller cannot forget to enforce it.
 */
export async function findUserLink(id: string, userId: string): Promise<Link | null> {
  const db = await getDb();
  const rows = await db
    .select()
    .from(links)
    .where(and(eq(links.id, id), eq(links.userId, userId)))
    .limit(1);
  return rows[0] ?? null;
}

export async function listUserLinks(
  userId: string,
  options: { limit?: number; offset?: number } = {},
): Promise<Link[]> {
  const db = await getDb();
  return db
    .select()
    .from(links)
    .where(eq(links.userId, userId))
    .orderBy(desc(links.createdAt))
    .limit(Math.min(options.limit ?? 50, 100))
    .offset(options.offset ?? 0);
}

export async function countUserLinks(userId: string): Promise<number> {
  const db = await getDb();
  const rows = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(links)
    .where(eq(links.userId, userId));
  return rows[0]?.count ?? 0;
}

export async function sumUserClicks(userId: string): Promise<number> {
  const db = await getDb();
  const rows = await db
    .select({ total: sql<number>`coalesce(sum(${links.clickCount}), 0)::int` })
    .from(links)
    .where(eq(links.userId, userId));
  return rows[0]?.total ?? 0;
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

export type UpdateLinkInput = {
  destinationUrl?: string;
  title?: string | null;
  expiresAt?: Date | null;
  disabled?: boolean;
};

export type UpdateLinkResult = { ok: true; link: Link } | { ok: false; error: CreateLinkError };

/** Updates a link the user owns. Ownership is enforced in the WHERE clause. */
export async function updateUserLink(
  id: string,
  userId: string,
  input: UpdateLinkInput,
): Promise<UpdateLinkResult> {
  const patch: Partial<typeof links.$inferInsert> = { updatedAt: new Date() };

  if (input.destinationUrl !== undefined) {
    const urlResult = validateDestinationUrl(input.destinationUrl);
    if (!urlResult.ok) {
      return {
        ok: false,
        error: { field: 'destinationUrl', code: urlResult.reason, message: urlResult.message },
      };
    }
    patch.destinationUrl = urlResult.url;
  }

  if (input.title !== undefined) {
    const title = input.title?.trim() ?? '';
    if (title.length > MAX_TITLE_LENGTH) {
      return {
        ok: false,
        error: {
          field: 'title',
          code: 'too_long',
          message: `Titles must be ${MAX_TITLE_LENGTH} characters or fewer.`,
        },
      };
    }
    patch.title = title.length > 0 ? title : null;
  }

  if (input.expiresAt !== undefined) {
    if (input.expiresAt && input.expiresAt.getTime() <= Date.now()) {
      return {
        ok: false,
        error: {
          field: 'expiresAt',
          code: 'in_past',
          message: 'Choose an expiry date in the future.',
        },
      };
    }
    patch.expiresAt = input.expiresAt;
  }

  if (input.disabled !== undefined) {
    patch.disabledAt = input.disabled ? new Date() : null;
    patch.disabledReason = input.disabled ? 'owner' : null;
  }

  const db = await getDb();
  const rows = await db
    .update(links)
    .set(patch)
    .where(and(eq(links.id, id), eq(links.userId, userId)))
    .returning();

  const link = rows[0];
  if (!link) {
    return {
      ok: false,
      error: { field: 'general', code: 'not_found', message: 'That link could not be found.' },
    };
  }

  return { ok: true, link };
}

/** Deletes a link the user owns. Returns false when it does not exist. */
export async function deleteUserLink(id: string, userId: string): Promise<boolean> {
  const db = await getDb();
  const rows = await db
    .delete(links)
    .where(and(eq(links.id, id), eq(links.userId, userId)))
    .returning({ id: links.id });
  return rows.length > 0;
}

/** Admin/moderation disable. Not restricted to an owner. */
export async function setLinkDisabled(
  id: string,
  disabled: boolean,
  reason: string,
): Promise<Link | null> {
  const db = await getDb();
  const rows = await db
    .update(links)
    .set({
      disabledAt: disabled ? new Date() : null,
      disabledReason: disabled ? reason : null,
      updatedAt: new Date(),
    })
    .where(eq(links.id, id))
    .returning();
  return rows[0] ?? null;
}

/** Verifies a password-protected link's password. */
export async function verifyLinkPassword(
  shortCode: string,
  password: string,
): Promise<{ ok: boolean; destinationUrl?: string }> {
  const link = await findLinkByCode(shortCode);
  if (!link?.passwordHash) return { ok: false };
  if (linkState(link) !== 'active') return { ok: false };

  const valid = await verifyPassword(password, link.passwordHash);
  if (!valid) return { ok: false };

  return { ok: true, destinationUrl: link.destinationUrl };
}

/** Claims anonymous links created from the same browser after sign-up. */
export async function claimAnonymousLinks(
  creatorIpHash: string,
  userId: string,
  limit = 20,
): Promise<number> {
  const db = await getDb();
  const candidates = await db
    .select({ id: links.id })
    .from(links)
    .where(and(eq(links.creatorIpHash, creatorIpHash), isNull(links.userId)))
    .orderBy(desc(links.createdAt))
    .limit(limit);

  if (candidates.length === 0) return 0;

  const rows = await db
    .update(links)
    .set({ userId, updatedAt: new Date() })
    .where(
      and(
        isNull(links.userId),
        or(...candidates.map((candidate) => eq(links.id, candidate.id))),
      ),
    )
    .returning({ id: links.id });

  return rows.length;
}
