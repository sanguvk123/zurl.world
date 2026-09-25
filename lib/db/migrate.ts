/**
 * Migration runner.
 *
 * Applies the plain `.sql` files in `drizzle/` in filename order and records
 * each one in `_migrations`, so re-running is a no-op. Forward-only by design:
 * there are no down-migrations, because rolling a schema backwards in
 * production is almost always more dangerous than rolling forward.
 */

import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { sql } from 'drizzle-orm';
import type { Database } from './index';

const MIGRATIONS_DIR = join(process.cwd(), 'drizzle');

export type MigrationResult = { applied: string[]; skipped: string[] };

export async function runMigrations(db: Database): Promise<MigrationResult> {
  await db.execute(
    sql`CREATE TABLE IF NOT EXISTS "_migrations" (
      "name" text PRIMARY KEY NOT NULL,
      "applied_at" timestamp with time zone DEFAULT now() NOT NULL
    )`,
  );

  const existing = await db.execute(sql`SELECT name FROM "_migrations"`);
  const alreadyApplied = new Set(rowsOf<{ name: string }>(existing).map((row) => row.name));

  const files = readdirSync(MIGRATIONS_DIR)
    .filter((file) => file.endsWith('.sql'))
    .sort();

  const applied: string[] = [];
  const skipped: string[] = [];

  for (const file of files) {
    if (alreadyApplied.has(file)) {
      skipped.push(file);
      continue;
    }

    const contents = readFileSync(join(MIGRATIONS_DIR, file), 'utf8');

    // A migration file contains several statements. Both drivers reject a
    // multi-statement string through the parameterised path, so each statement
    // is executed individually.
    for (const statement of splitStatements(contents)) {
      await db.execute(sql.raw(statement));
    }

    await db.execute(sql`INSERT INTO "_migrations" (name) VALUES (${file})`);
    applied.push(file);
  }

  return { applied, skipped };
}

/**
 * Splits a migration file into individual statements.
 *
 * Semicolons inside single-quoted string literals (the CHECK constraints use
 * them) must not be treated as separators, so quote state is tracked. Line
 * comments are stripped first.
 */
function splitStatements(source: string): string[] {
  const statements: string[] = [];
  let current = '';
  let inString = false;

  const withoutComments = source
    .split('\n')
    .map((line) => {
      const commentIndex = line.indexOf('--');
      if (commentIndex === -1) return line;
      // Only strip when the `--` is not inside a string literal.
      const before = line.slice(0, commentIndex);
      const quotes = (before.match(/'/g) ?? []).length;
      return quotes % 2 === 0 ? before : line;
    })
    .join('\n');

  for (const char of withoutComments) {
    if (char === "'") inString = !inString;

    if (char === ';' && !inString) {
      const trimmed = current.trim();
      if (trimmed.length > 0) statements.push(trimmed);
      current = '';
      continue;
    }

    current += char;
  }

  const last = current.trim();
  if (last.length > 0) statements.push(last);

  return statements;
}

/**
 * Normalises the result shape between drivers: node-postgres returns
 * `{ rows }`, PGlite's drizzle adapter returns the array directly.
 */
function rowsOf<T>(result: unknown): T[] {
  if (Array.isArray(result)) return result as T[];
  if (result && typeof result === 'object' && 'rows' in result) {
    return (result as { rows: T[] }).rows;
  }
  return [];
}
