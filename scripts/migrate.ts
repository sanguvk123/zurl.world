/**
 * Applies pending migrations.
 *
 *   npm run db:migrate
 *
 * Safe to run repeatedly: applied migrations are recorded in `_migrations`.
 */

import './load-env';
import { getDb } from '../lib/db';
import { runMigrations } from '../lib/db/migrate';

async function main(): Promise<void> {
  assertUsableDatabaseUrl(process.env.DATABASE_URL);

  const target = process.env.DATABASE_URL ?? 'memory:// (no DATABASE_URL set)';
  console.log(`Running migrations against: ${redact(target)}`);

  const db = await getDb();
  const { applied, skipped } = await runMigrations(db);

  if (applied.length === 0) {
    console.log(`Already up to date (${skipped.length} migration(s) previously applied).`);
  } else {
    for (const name of applied) console.log(`  applied  ${name}`);
    console.log(`Done. ${applied.length} migration(s) applied.`);
  }
}

/**
 * Rejects a `DATABASE_URL` that cannot possibly work, before any connection is
 * attempted.
 *
 * Without this, an unsubstituted placeholder is passed straight to the driver,
 * which interprets it as a local socket path and fails deep inside Postgres
 * with something like `couldn't read file "applied"` — an error that says
 * nothing about the real problem.
 */
function assertUsableDatabaseUrl(url: string | undefined): void {
  if (!url) return; // Falls back to PGlite, which is valid for local work.

  const example =
    '  DATABASE_URL="postgresql://user:password@host.neon.tech/dbname?sslmode=require" npm run db:migrate';

  // Angle brackets, ellipses and the literal words from documentation examples.
  const placeholderPattern = /[<>]|\.\.\.|paste |your-|yours|example\.com|xxxxx/i;
  if (placeholderPattern.test(url)) {
    throw new Error(
      `DATABASE_URL still contains example text (${redact(url)}).\n` +
        'Copy the real value from Vercel > Storage > your database > ".env.local" tab.\n' +
        example,
    );
  }

  if (!/^(postgres(ql)?:\/\/|pglite:|memory:\/\/)/.test(url)) {
    throw new Error(
      `DATABASE_URL is not a recognised connection string (${redact(url)}).\n` +
        'Expected it to start with postgresql://, pglite: or memory://\n' +
        example,
    );
  }

  // A prefix check is not enough: `postgresql://user:...` parses as a URL with
  // an empty host, which the driver silently treats as a local socket and then
  // fails deep inside Postgres with an unrelated message.
  if (url.startsWith('postgres')) {
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      throw new Error(`DATABASE_URL is not a valid URL (${redact(url)}).\n${example}`);
    }

    if (!parsed.hostname) {
      throw new Error(
        `DATABASE_URL has no host (${redact(url)}).\n` +
          'A Neon string looks like postgresql://user:password@ep-something.aws.neon.tech/neondb?sslmode=require\n' +
          example,
      );
    }

    if (!parsed.pathname || parsed.pathname === '/') {
      throw new Error(
        `DATABASE_URL has no database name (${redact(url)}).\n` +
          'Expected a path after the host, for example .../neondb?sslmode=require\n' +
          example,
      );
    }
  }
}

/** Never print credentials, even to a local terminal. */
function redact(url: string): string {
  return url.replace(/\/\/[^@]*@/, '//***:***@');
}

/**
 * Prints the actual reason a migration failed.
 *
 * Drizzle wraps driver errors, so `error.message` is the SQL that was being
 * run — not why it failed. The useful part (authentication failed, connection
 * timeout, permission denied) is on `error.cause`. Printing only the wrapper
 * makes every failure look identical and tells the reader nothing.
 */
function describeFailure(error: unknown): string {
  const lines: string[] = [];
  const top = error instanceof Error ? error : new Error(String(error));

  const cause = (top as { cause?: unknown }).cause;
  const real = cause instanceof Error ? cause : null;
  const detail = real as (Error & { code?: string; severity?: string }) | null;

  lines.push(real ? real.message : top.message);

  if (detail?.code) lines.push(`  code: ${detail.code}`);

  const hint = hintFor(detail?.code, real?.message ?? top.message);
  if (hint) lines.push(`\n${hint}`);

  return lines.join('\n');
}

/** Maps the failures that actually happen during a first deploy to next steps. */
function hintFor(code: string | undefined, message: string): string | null {
  if (code === '28P01' || /password authentication failed/i.test(message)) {
    return 'The password is wrong. If you rotated it, copy the new connection string from Vercel > Storage > ".env.local".';
  }
  if (code === '3D000') {
    return 'That database does not exist on the server. Check the name after the final "/".';
  }
  if (code === '42501') {
    return 'This role cannot create tables. Use the owner role (neondb_owner on Neon).';
  }
  if (/timeout/i.test(message)) {
    return [
      'The server never completed the connection.',
      '  - On a corporate or VPN network, outbound Postgres (5432) is often blocked. Try another network.',
      '  - Neon free-tier databases sleep when idle; the first attempt can time out. Try once more.',
    ].join('\n');
  }
  if (/ENOTFOUND|EAI_AGAIN/i.test(message)) {
    return 'The host could not be resolved. Check for a typo in the hostname.';
  }
  if (/self.signed|certificate/i.test(message)) {
    return 'TLS verification failed, which usually means something is intercepting the connection (corporate proxy).';
  }
  return null;
}

main()
  .then(() => process.exit(0))
  .catch((error: unknown) => {
    console.error('Migration failed:', describeFailure(error));
    process.exit(1);
  });
