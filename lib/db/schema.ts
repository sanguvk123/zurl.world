/**
 * Drizzle schema for Zurl.
 *
 * Conventions:
 *  - Primary keys are prefixed random text ids (`lnk_…`), never sequential
 *    integers, so an internal id is safe to expose in an API response.
 *  - Every timestamp is `timestamptz`.
 *  - Indexes below are derived from the queries the app actually runs; see
 *    ARCHITECTURE.md section 4.
 */

import { relations, sql } from 'drizzle-orm';
import {
  bigint,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

// ---------------------------------------------------------------------------
// users
// ---------------------------------------------------------------------------

export const users = pgTable(
  'users',
  {
    id: text('id').primaryKey(),
    /** Always stored lowercased; uniqueness is therefore case-insensitive. */
    email: text('email').notNull(),
    passwordHash: text('password_hash').notNull(),
    /** 'user' | 'admin' */
    role: text('role').notNull().default('user'),
    /** 'free' | 'pro' | 'business' — plan gating is read from here. */
    plan: text('plan').notNull().default('free'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex('users_email_unique').on(table.email)],
);

// ---------------------------------------------------------------------------
// sessions
// ---------------------------------------------------------------------------

export const sessions = pgTable(
  'sessions',
  {
    /** SHA-256 of the opaque token. The raw token only ever lives in a cookie. */
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('sessions_user_id_idx').on(table.userId)],
);

// ---------------------------------------------------------------------------
// links
// ---------------------------------------------------------------------------

export const links = pgTable(
  'links',
  {
    id: text('id').primaryKey(),

    /**
     * The path segment. Single source of truth for the URL — a custom alias is
     * stored here too (see ARCHITECTURE.md §4 for why there is no separate
     * `customAlias` column). Unique across all links.
     */
    shortCode: text('short_code').notNull(),

    /** Records whether `shortCode` was user-chosen or generated. */
    isCustomAlias: integer('is_custom_alias').notNull().default(0),

    destinationUrl: text('destination_url').notNull(),
    title: text('title'),

    /** Null for anonymous links — the product works without an account. */
    userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp('expires_at', { withTimezone: true }),

    disabledAt: timestamp('disabled_at', { withTimezone: true }),
    /** 'abuse' | 'owner' | 'admin' — shown only to admins. */
    disabledReason: text('disabled_reason'),

    /** scrypt hash; null when the link is not password protected. */
    passwordHash: text('password_hash'),

    /**
     * Denormalised counter kept in sync on each redirect. Avoids a COUNT(*)
     * over clickEvents for the dashboard list, which is the common read.
     */
    clickCount: bigint('click_count', { mode: 'number' }).notNull().default(0),
    lastClickedAt: timestamp('last_clicked_at', { withTimezone: true }),

    /**
     * SHA-256(ip + secret). Used only for anonymous abuse attribution and rate
     * limiting. The raw IP is never stored.
     */
    creatorIpHash: text('creator_ip_hash'),
  },
  (table) => [
    // The redirect. Hottest query in the system — one equality probe.
    uniqueIndex('links_short_code_unique').on(table.shortCode),
    // Dashboard: a user's links, newest first.
    index('links_user_created_idx').on(table.userId, table.createdAt.desc()),
    // Expiry sweeps, without indexing the majority of rows that never expire.
    index('links_expires_at_idx')
      .on(table.expiresAt)
      .where(sql`expires_at IS NOT NULL`),
    // Admin moderation: recently created links across all users.
    index('links_created_at_idx').on(table.createdAt.desc()),
    // Anonymous abuse attribution.
    index('links_creator_ip_idx').on(table.creatorIpHash),
  ],
);

// ---------------------------------------------------------------------------
// click_events
// ---------------------------------------------------------------------------

export const clickEvents = pgTable(
  'click_events',
  {
    id: text('id').primaryKey(),
    linkId: text('link_id')
      .notNull()
      .references(() => links.id, { onDelete: 'cascade' }),
    timestamp: timestamp('timestamp', { withTimezone: true }).notNull().defaultNow(),

    /** ISO 3166-1 alpha-2, from CDN geo headers. Null when unavailable. */
    country: text('country'),
    region: text('region'),
    city: text('city'),

    /** Referring **host only** — never the full referring URL. */
    referrerHost: text('referrer_host'),

    /** Parsed enums, not raw user-agent strings. */
    deviceType: text('device_type'),
    browser: text('browser'),
    os: text('os'),
  },
  (table) => [
    // Per-link analytics and "recent clicks".
    index('click_events_link_ts_idx').on(table.linkId, table.timestamp.desc()),
    // Global time-series for admin stats.
    index('click_events_ts_idx').on(table.timestamp.desc()),
  ],
);

// ---------------------------------------------------------------------------
// api_keys
// ---------------------------------------------------------------------------

export const apiKeys = pgTable(
  'api_keys',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    /** SHA-256 of the key. The plaintext is shown exactly once, at creation. */
    keyHash: text('key_hash').notNull(),
    /** First few characters, for identifying a key in the UI. */
    prefix: text('prefix').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
  },
  (table) => [
    uniqueIndex('api_keys_hash_unique').on(table.keyHash),
    index('api_keys_user_idx').on(table.userId),
  ],
);

// ---------------------------------------------------------------------------
// abuse_reports
// ---------------------------------------------------------------------------

export const abuseReports = pgTable(
  'abuse_reports',
  {
    id: text('id').primaryKey(),
    linkId: text('link_id')
      .notNull()
      .references(() => links.id, { onDelete: 'cascade' }),
    /** 'phishing' | 'malware' | 'spam' | 'illegal' | 'other' */
    category: text('category').notNull(),
    details: text('details'),
    /** Optional — reporters are not required to identify themselves. */
    reporterEmail: text('reporter_email'),
    /** 'open' | 'actioned' | 'dismissed' */
    status: text('status').notNull().default('open'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    resolvedAt: timestamp('resolved_at', { withTimezone: true }),
    resolvedBy: text('resolved_by').references(() => users.id, { onDelete: 'set null' }),
  },
  (table) => [
    // The moderation queue: open reports, newest first.
    index('abuse_reports_status_idx').on(table.status, table.createdAt.desc()),
    index('abuse_reports_link_idx').on(table.linkId),
  ],
);

// ---------------------------------------------------------------------------
// Relations
// ---------------------------------------------------------------------------

export const usersRelations = relations(users, ({ many }) => ({
  links: many(links),
  sessions: many(sessions),
  apiKeys: many(apiKeys),
}));

export const linksRelations = relations(links, ({ one, many }) => ({
  user: one(users, { fields: [links.userId], references: [users.id] }),
  clickEvents: many(clickEvents),
  abuseReports: many(abuseReports),
}));

export const clickEventsRelations = relations(clickEvents, ({ one }) => ({
  link: one(links, { fields: [clickEvents.linkId], references: [links.id] }),
}));

export const apiKeysRelations = relations(apiKeys, ({ one }) => ({
  user: one(users, { fields: [apiKeys.userId], references: [users.id] }),
}));

export const abuseReportsRelations = relations(abuseReports, ({ one }) => ({
  link: one(links, { fields: [abuseReports.linkId], references: [links.id] }),
}));

// ---------------------------------------------------------------------------
// Inferred types
// ---------------------------------------------------------------------------

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Session = typeof sessions.$inferSelect;
export type Link = typeof links.$inferSelect;
export type NewLink = typeof links.$inferInsert;
export type ClickEvent = typeof clickEvents.$inferSelect;
export type NewClickEvent = typeof clickEvents.$inferInsert;
export type ApiKey = typeof apiKeys.$inferSelect;
export type AbuseReport = typeof abuseReports.$inferSelect;

export type UserRole = 'user' | 'admin';
export type UserPlan = 'free' | 'pro' | 'business';
export type AbuseCategory = 'phishing' | 'malware' | 'spam' | 'illegal' | 'other';
export type AbuseStatus = 'open' | 'actioned' | 'dismissed';
export type DeviceType = 'desktop' | 'mobile' | 'tablet' | 'bot' | 'unknown';
