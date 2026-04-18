import { defineConfig } from 'vitest/config';
import path from 'path';

/**
 * Zenvix Backend Vitest Configuration
 * - Root is set to the repo root so tests/integration/ resolves correctly
 * - Aliases map '@' to backend/src and '@backend' to backend/src for cross-path imports
 */
export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    root: path.resolve(__dirname, '..'), // repo root
    include: [
      'backend/src/**/*.{test,spec}.{ts,tsx}',
      'tests/**/*.{test,spec}.{ts,tsx}',
    ],
    exclude: ['**/node_modules/**', '**/dist/**'],
  },
  resolve: {
    alias: {
      // Allow tests to import from backend/src using relative paths resolved from repo root
      '@': path.resolve(__dirname, 'src'),
      '@backend': path.resolve(__dirname, 'src'),
      '@nestjs/common': path.resolve(__dirname, 'node_modules/@nestjs/common'),
      '@nestjs/core': path.resolve(__dirname, 'node_modules/@nestjs/core'),
      '@nestjs/testing': path.resolve(__dirname, 'node_modules/@nestjs/testing'),
    },
  },
});
