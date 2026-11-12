import { defineConfig } from 'vitest/config';
import path from 'path';

// Root-level test runner for pure logic modules across the monorepo.
// UI/integration tests can be added per-app later.
export default defineConfig({
    resolve: {
        alias: {
            '@': path.resolve(__dirname, 'apps/scholar/src'),
        },
    },
    test: {
        include: ['apps/**/src/**/*.test.ts', 'packages/**/src/**/*.test.ts'],
        exclude: ['**/node_modules/**', '**/.next/**'],
        environment: 'node',
    },
});
