import { defineConfig } from 'vitest/config';

// Only unit tests run under Vitest; tests/e2e belongs to Playwright, whose
// spec files crash if Vitest's default include pattern picks them up.
export default defineConfig({
  test: {
    include: ['tests/unit/**/*.test.ts'],
  },
});
