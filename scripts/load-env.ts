/**
 * Loads `.env.local` (and friends) for standalone scripts.
 *
 * `next dev`, `next build` and `next start` load these files automatically, but
 * a script run through plain `tsx` does not. Without this, `npm run db:migrate`
 * would silently ignore the `DATABASE_URL` in `.env.local` and migrate an
 * in-memory database that disappears the moment the process exits — leaving the
 * developer with an empty database and no error to explain why.
 *
 * `@next/env` ships as part of Next.js, so this adds no dependency and applies
 * exactly the same precedence rules as the dev server.
 *
 * Import this module for its side effect *before* anything that reads
 * `process.env`:
 *
 *   import './load-env';
 *   import { getDb } from '../lib/db';
 */

import { createRequire } from 'node:module';

// `@next/env` is published as CommonJS, so a named ESM import is not available
// under the loader `tsx` uses. `createRequire` keeps this working regardless of
// how the script is executed.
const require = createRequire(import.meta.url);
const { loadEnvConfig } = require('@next/env') as {
  loadEnvConfig: (dir: string) => unknown;
};

loadEnvConfig(process.cwd());
