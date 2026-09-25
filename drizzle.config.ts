import type { Config } from 'drizzle-kit';

/**
 * Drizzle Kit configuration.
 *
 * Used only to *generate* migration SQL from the schema. Migrations are applied
 * by `scripts/migrate.ts`, which runs the plain `.sql` files — so the runtime
 * has no dependency on drizzle-kit.
 */
export default {
  schema: './lib/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? 'postgresql://localhost:5432/zurl',
  },
  strict: true,
  verbose: true,
} satisfies Config;
