import { defineConfig } from 'vitest/config';

// Root-level test runner for pure logic modules across the monorepo.
// UI/integration tests can be added per-app later.
export default defineConfig({
    test: {
        include: ['apps/**/src/**/*.test.ts', 'packages/**/src/**/*.test.ts'],
        exclude: ['**/node_modules/**', '**/.next/**'],
        environment: 'node',
    },
});
