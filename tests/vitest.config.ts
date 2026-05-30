import { defineConfig } from 'vitest/config';
import path from 'path';

/**
 * Zenvix Tests Vitest Configuration
 */
export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    root: path.resolve(__dirname, '..'), // repo root
    include: [
      'tests/**/*.{test,spec}.{ts,tsx}',
      'backend/audit/**/*.{test,spec}.{ts,tsx}',
    ],
    exclude: ['**/node_modules/**', '**/dist/**'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@backend': path.resolve(__dirname, 'src'),
    },
  },
});
