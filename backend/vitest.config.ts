import { defineConfig } from 'vitest/config';

export default defineConfig({
  esbuild: {
    target: 'es2021',
    tsconfigRaw: {
      compilerOptions: {
        experimentalDecorators: true,
      },
    },
  },
  test: {
    environment: 'node',
    globals: false,
    include: ['src/**/*.spec.ts', 'src/**/*.test.ts'],
  },
});
