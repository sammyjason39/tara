import { vi } from 'vitest';

// Compatibility shim: several specs were authored against Jest globals.
// Vitest's `vi` is API-compatible for the methods used here (fn, spyOn,
// clearAllMocks, resetAllMocks). No jest.mock hoisting is used in this repo.
(globalThis as unknown as { jest: typeof vi }).jest = vi;
