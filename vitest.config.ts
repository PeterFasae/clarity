import { defineConfig } from 'vitest/config';

// One runner for the whole monorepo. packages/retrieval's suite is the contract
// and must stay green unmodified; services/api adds integration tests in Phase 1.
export default defineConfig({
  test: {
    include: [
      'packages/**/*.test.{js,ts}',
      'services/**/tests/**/*.test.{js,ts}',
      'apps/**/*.test.{ts,tsx}',
    ],
    exclude: ['**/node_modules/**', '**/dist/**'],
  },
});
