import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: false,
    include: ['tests/**/*.test.ts'],
    // PGlite instances are heavy; a generous timeout keeps integration tests
    // stable on cold starts.
    testTimeout: 30_000,
    hookTimeout: 60_000,
    pool: 'forks',
    env: {
      NODE_ENV: 'test',
      DATABASE_URL: 'memory://',
      NEXT_PUBLIC_APP_URL: 'https://zurl.world',
      IP_HASH_SECRET: 'test-ip-salt',
      // Suppress structured application logs so test output stays readable.
      LOG_LEVEL: 'error',
    },
  },
  resolve: {
    alias: {
      '@': resolve(import.meta.dirname, '.'),
    },
  },
});
