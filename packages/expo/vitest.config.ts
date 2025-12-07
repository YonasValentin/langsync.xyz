import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const dirname = fileURLToPath(new URL('.', import.meta.url));

const fromRoot = (path: string) => resolve(dirname, path);

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['src/**/*.test.ts'],
    setupFiles: ['./vitest.setup.ts'],
  },
  resolve: {
    alias: {
      '@langsync/core': fromRoot('../core/src/index.ts'),
      '@langsync/client': fromRoot('../client/src/index.ts'),
    },
  },
});
