/**
 * Admin queries.
 *
 * Every function here assumes the caller has already been authorised by the
 * admin layout. They are not exported through any public API route.
 */

import { desc, eq, ilike, or, sql } from 'drizzle-orm';
import { getDb } from '@/lib/db';
import { abuseReports, clickEvents, links, users } from '@/lib/db/schema';

export type AdminStats = {
  totalLinks: number;
  totalUsers: number;
  totalClicks: number;
  openReports: number;
  disabledLinks: number;
  linksLast24h: number;
};

export async function getAdminStats(): Promise<AdminStats> {
  const db = await getDb();
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const [linkCount, userCount, clickCount, reportCount, disabledCount, recentCount] =
    await Promise.all([
      db.select({ value: sql<number>`count(*)::int` }).from(links),
      db.select({ value: sql<number>`count(*)::int` }).from(users),
      db.select({ value: sql<number>`count(*)::int` }).from(clickEvents),
      db
        .select({ value: sql<number>`count(*)::int` })
        .from(abuseReports)
        .where(eq(abuseReports.status, 'open')),
      db
        .select({ value: sql<number>`count(*)::int` })
        .from(links)
        .where(sql`${links.disabledAt} IS NOT NULL`),
      db
        .select({ value: sql<number>`count(*)::int` })
        .from(links)
        .where(sql`${links.createdAt} >= ${dayAgo}`),
    ]);

  return {
    totalLinks: linkCount[0]?.value ?? 0,
    totalUsers: userCount[0]?.value ?? 0,
    totalClicks: clickCount[0]?.value ?? 0,
    openReports: reportCount[0]?.value ?? 0,
    disabledLinks: disabledCount[0]?.value ?? 0,
    linksLast24h: recentCount[0]?.value ?? 0,
  };
}

export type ReportWithLink = {
  reportId: string;
  category: string;
  details: string | null;
  status: string;
  createdAt: Date;
  linkId: string;
  shortCode: string;
  destinationUrl: string;
  disabledAt: Date | null;
};

/** Moderation queue, newest first. */
export async function listReports(status = 'open', limit = 50): Promise<ReportWithLink[]> {
  const db = await getDb();
  return db
    .select({
      reportId: abuseReports.id,
      category: abuseReports.category,
      details: abuseReports.details,
      status: abuseReports.status,
      createdAt: abuseReports.createdAt,
      linkId: links.id,
      shortCode: links.shortCode,
      destinationUrl: links.destinationUrl,
      disabledAt: links.disabledAt,
    })
    .from(abuseReports)
    .innerJoin(links, eq(abuseReports.linkId, links.id))
    .where(eq(abuseReports.status, status))
    .orderBy(desc(abuseReports.createdAt))
    .limit(limit);
}

/** Link search across short code and destination. */
export async function searchLinks(query: string, limit = 50) {
  const db = await getDb();
  const term = `%${query.trim()}%`;

  const base = db
    .select({
      id: links.id,
      shortCode: links.shortCode,
      destinationUrl: links.destinationUrl,
      clickCount: links.clickCount,
      createdAt: links.createdAt,
      disabledAt: links.disabledAt,
      disabledReason: links.disabledReason,
      userId: links.userId,
    })
    .from(links);

  const scoped =
    query.trim().length > 0
      ? base.where(or(ilike(links.shortCode, term), ilike(links.destinationUrl, term)))
      : base;

  return scoped.orderBy(desc(links.createdAt)).limit(limit);
}

export async function searchUsers(query: string, limit = 50) {
  const db = await getDb();
  const term = `%${query.trim()}%`;

  const base = db
    .select({
      id: users.id,
      email: users.email,
      role: users.role,
      plan: users.plan,
      createdAt: users.createdAt,
      linkCount: sql<number>`(select count(*)::int from ${links} where ${links.userId} = ${users.id})`,
    })
    .from(users);

  const scoped = query.trim().length > 0 ? base.where(ilike(users.email, term)) : base;

  return scoped.orderBy(desc(users.createdAt)).limit(limit);
}

export async function resolveReport(
  reportId: string,
  status: 'actioned' | 'dismissed',
  adminId: string,
): Promise<boolean> {
  const db = await getDb();
  const rows = await db
    .update(abuseReports)
    .set({ status, resolvedAt: new Date(), resolvedBy: adminId })
    .where(eq(abuseReports.id, reportId))
    .returning({ id: abuseReports.id });
  return rows.length > 0;
}
