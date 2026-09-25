-- Zurl initial schema.
-- Forward-only. Safe to run repeatedly (IF NOT EXISTS throughout).

CREATE TABLE IF NOT EXISTS "users" (
  "id" text PRIMARY KEY NOT NULL,
  "email" text NOT NULL,
  "password_hash" text NOT NULL,
  "role" text DEFAULT 'user' NOT NULL,
  "plan" text DEFAULT 'free' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "users_role_check" CHECK ("role" IN ('user', 'admin')),
  CONSTRAINT "users_plan_check" CHECK ("plan" IN ('free', 'pro', 'business')),
  CONSTRAINT "users_email_lowercase_check" CHECK ("email" = lower("email"))
);

CREATE UNIQUE INDEX IF NOT EXISTS "users_email_unique" ON "users" ("email");

CREATE TABLE IF NOT EXISTS "sessions" (
  "id" text PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "expires_at" timestamp with time zone NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "sessions_user_id_idx" ON "sessions" ("user_id");

CREATE TABLE IF NOT EXISTS "links" (
  "id" text PRIMARY KEY NOT NULL,
  "short_code" text NOT NULL,
  "is_custom_alias" integer DEFAULT 0 NOT NULL,
  "destination_url" text NOT NULL,
  "title" text,
  "user_id" text REFERENCES "users"("id") ON DELETE CASCADE,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "expires_at" timestamp with time zone,
  "disabled_at" timestamp with time zone,
  "disabled_reason" text,
  "password_hash" text,
  "click_count" bigint DEFAULT 0 NOT NULL,
  "last_clicked_at" timestamp with time zone,
  "creator_ip_hash" text,
  -- Enforce the protocol allowlist at the storage layer as well as in code.
  CONSTRAINT "links_destination_protocol_check"
    CHECK ("destination_url" ~* '^https?://'),
  CONSTRAINT "links_short_code_format_check"
    CHECK ("short_code" ~ '^[A-Za-z0-9_-]{3,48}$'),
  CONSTRAINT "links_click_count_check" CHECK ("click_count" >= 0)
);

-- The redirect lookup. Hottest query in the system.
CREATE UNIQUE INDEX IF NOT EXISTS "links_short_code_unique" ON "links" ("short_code");
-- Dashboard listing.
CREATE INDEX IF NOT EXISTS "links_user_created_idx" ON "links" ("user_id", "created_at" DESC);
-- Expiry sweeps; partial so the many never-expiring rows are not indexed.
CREATE INDEX IF NOT EXISTS "links_expires_at_idx" ON "links" ("expires_at")
  WHERE "expires_at" IS NOT NULL;
-- Admin: recent links across all users.
CREATE INDEX IF NOT EXISTS "links_created_at_idx" ON "links" ("created_at" DESC);
-- Anonymous abuse attribution.
CREATE INDEX IF NOT EXISTS "links_creator_ip_idx" ON "links" ("creator_ip_hash");

CREATE TABLE IF NOT EXISTS "click_events" (
  "id" text PRIMARY KEY NOT NULL,
  "link_id" text NOT NULL REFERENCES "links"("id") ON DELETE CASCADE,
  "timestamp" timestamp with time zone DEFAULT now() NOT NULL,
  "country" text,
  "region" text,
  "city" text,
  "referrer_host" text,
  "device_type" text,
  "browser" text,
  "os" text,
  CONSTRAINT "click_events_country_check"
    CHECK ("country" IS NULL OR "country" ~ '^[A-Z]{2}$')
);

CREATE INDEX IF NOT EXISTS "click_events_link_ts_idx"
  ON "click_events" ("link_id", "timestamp" DESC);
CREATE INDEX IF NOT EXISTS "click_events_ts_idx" ON "click_events" ("timestamp" DESC);

CREATE TABLE IF NOT EXISTS "api_keys" (
  "id" text PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "name" text NOT NULL,
  "key_hash" text NOT NULL,
  "prefix" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "last_used_at" timestamp with time zone,
  "revoked_at" timestamp with time zone
);

CREATE UNIQUE INDEX IF NOT EXISTS "api_keys_hash_unique" ON "api_keys" ("key_hash");
CREATE INDEX IF NOT EXISTS "api_keys_user_idx" ON "api_keys" ("user_id");

CREATE TABLE IF NOT EXISTS "abuse_reports" (
  "id" text PRIMARY KEY NOT NULL,
  "link_id" text NOT NULL REFERENCES "links"("id") ON DELETE CASCADE,
  "category" text NOT NULL,
  "details" text,
  "reporter_email" text,
  "status" text DEFAULT 'open' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "resolved_at" timestamp with time zone,
  "resolved_by" text REFERENCES "users"("id") ON DELETE SET NULL,
  CONSTRAINT "abuse_reports_category_check"
    CHECK ("category" IN ('phishing', 'malware', 'spam', 'illegal', 'other')),
  CONSTRAINT "abuse_reports_status_check"
    CHECK ("status" IN ('open', 'actioned', 'dismissed'))
);

CREATE INDEX IF NOT EXISTS "abuse_reports_status_idx"
  ON "abuse_reports" ("status", "created_at" DESC);
CREATE INDEX IF NOT EXISTS "abuse_reports_link_idx" ON "abuse_reports" ("link_id");
