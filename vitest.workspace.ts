import { defineWorkspace } from 'vitest/config';

/**
 * Two suites with genuinely different needs, so they are separate projects
 * rather than one glob.
 *
 * `retrieval` is pure and runs in milliseconds. `api` needs DynamoDB Local and
 * `serverless offline` stood up first, which takes about twenty seconds — and
 * they share one database and one server, so its files run one at a time.
 */
export default defineWorkspace([
  {
    test: {
      name: 'retrieval',
      root: './packages/retrieval',
      include: ['*.test.js'],
    },
  },
  {
    test: {
      name: 'api',
      root: './services/api',
      include: ['tests/**/*.test.js'],
      globalSetup: ['./tests/setup/global.js'],
      fileParallelism: false,
      testTimeout: 30_000,
      hookTimeout: 120_000,
    },
  },
]);
