import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';
import nextTypescript from 'eslint-config-next/typescript';

/**
 * ESLint configuration (flat).
 *
 * eslint-config-next 16 ships native flat configs, so they are composed
 * directly rather than through the `FlatCompat` bridge.
 *
 * The notable additions are the TypeScript strictness rules: `any` is an error
 * rather than a warning, per the engineering rules for this project.
 */
const config = [
  ...nextCoreWebVitals,
  ...nextTypescript,

  {
    ignores: ['.next/**', 'node_modules/**', 'next-env.d.ts', '.scratch/**', 'drizzle/**'],
  },

  {
    rules: {
      // Casual `any` is banned outright.
      '@typescript-eslint/no-explicit-any': 'error',

      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrors: 'none',
        },
      ],

      // Type-only imports are erased cleanly at compile time.
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],

      // console is reserved for the structured logger.
      'no-console': ['error', { allow: ['warn', 'error'] }],

      'no-debugger': 'error',
      'no-alert': 'error',
      eqeqeq: ['error', 'always', { null: 'ignore' }],
      'prefer-const': 'error',
      'no-var': 'error',
    },
  },

  {
    // The logger is the one place console output is intended.
    files: ['lib/observability/logger.ts'],
    rules: { 'no-console': 'off' },
  },

  {
    files: ['tests/**/*.ts', 'scripts/**/*.ts'],
    rules: {
      'no-console': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
];

export default config;
