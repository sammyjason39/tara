/**
 * session-persistence.test.ts
 *
 * Property 2: Session persistence survives reload
 * Validates: Requirements 4, 4.1, 4.2, 4.3, 4.4
 *
 * Generates arbitrary OpnameSession objects; save, reload, restore and assert equivalent data.
 */

import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { saveOpnameSession, loadOpnameSession, clearOpnameSession } from "@/core/services/opname/sessionPersistence";
import { OpnameSession, ScanEntry } from "@/core/types/inventory/inventory";

// Mock localStorage for testing (browser environment required)
const mockLocalStorage = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value.toString(); },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();

// Patch localStorage for testing
const originalLocalStorage = window.localStorage;
Object.defineProperty(window, "localStorage", {
  value: mockLocalStorage,
  writable: true,
});

// Restore after tests
afterEach(() => {
  mockLocalStorage.clear();
  Object.defineProperty(window, "localStorage", {
    value: originalLocalStorage,
    writable: true,
  });
});

describe("Property 2: Session persistence survives reload", () => {
  // Helper to generate arbitrary ScanEntry
  const scanEntryArb = fc.record<ScanEntry>({
    id: fc.string(),
    sku: fc.string({ minLength: 3, maxLength: 50 }),
    name: fc.string({ minLength: 1, maxLength: 100 }),
    systemCount: fc.integer({ min: 0, max: 1000 }),
    actualCount: fc.integer({ min: 0, max: 1000 }),
    timestamp: fc.string({ minLength: 20, maxLength: 30 }),
    serials: fc.option(fc.array(fc.string(), { minLength: 0, maxLength: 10 }), { nil: [] }),
  });

  // Helper to generate arbitrary OpnameSession
  const opnameSessionArb = fc.record<OpnameSession>({
    cycleId: fc.string({ minLength: 1, maxLength: 50 }),
    locationId: fc.string({ minLength: 1, maxLength: 50 }),
    entries: fc.array(scanEntryArb, { minLength: 0, maxLength: 100 }),
    unresolvedBarcodes: fc.array(fc.string({ minLength: 1, maxLength: 50 }), { minLength: 0, maxLength: 50 }),
    anomalies: fc.array(fc.string({ minLength: 1, maxLength: 50 }), { minLength: 0, maxLength: 20 }),
    newItems: fc.array(fc.record({ id: fc.string(), sku: fc.string(), name: fc.string() }), { minLength: 0, maxLength: 50 }),
    createdAt: fc.integer({ min: 0, max: Date.now() }),
    lastUpdated: fc.integer({ min: 0, max: Date.now() }),
  });

  describe("save → load → restore maintains data equivalence", () => {
    it(
      "preserves session data after save and load (≥100 iterations)",
      () => {
        fc.assert(
          fc.property(opnameSessionArb, fc.string({ minLength: 1, maxLength: 30 }), (session, tenantId) => {
            // Save the session
            saveOpnameSession(session, tenantId);
            
            // Load the session
            const loadedSession = loadOpnameSession(tenantId);
            
            // Assert data equivalence
            expect(loadedSession).not.toBeNull();
            expect(loadedSession?.cycleId).toBe(session.cycleId);
            expect(loadedSession?.locationId).toBe(session.locationId);
            expect(loadedSession?.entries).toHaveLength(session.entries.length);
            expect(loadedSession?.entries).toEqual(session.entries);
            expect(loadedSession?.unresolvedBarcodes).toHaveLength(session.unresolvedBarcodes.length);
            expect(loadedSession?.unresolvedBarcodes).toEqual(session.unresolvedBarcodes);
            expect(loadedSession?.anomalies).toHaveLength(session.anomalies.length);
            expect(loadedSession?.anomalies).toEqual(session.anomalies);
            expect(loadedSession?.newItems).toHaveLength(session.newItems.length);
            expect(loadedSession?.newItems).toEqual(session.newItems);
            expect(loadedSession?.createdAt).toBe(session.createdAt);
            expect(loadedSession?.lastUpdated).not.toBe(session.lastUpdated); // lastUpdated is refreshed on save
          }),
          { numRuns: 100 }
        );
      }
    );
  });

  describe("edge cases", () => {
    it(
      "handles empty session (no entries, no unresolved barcodes)",
      () => {
        fc.assert(
          fc.property(fc.string({ minLength: 1, maxLength: 30 }), (tenantId) => {
            const emptySession: OpnameSession = {
              cycleId: "cycle-123",
              locationId: "location-456",
              entries: [],
              unresolvedBarcodes: [],
              anomalies: [],
              newItems: [],
              createdAt: Date.now(),
              lastUpdated: Date.now(),
            };
            
            saveOpnameSession(emptySession, tenantId);
            const loadedSession = loadOpnameSession(tenantId);
            
            expect(loadedSession).not.toBeNull();
            expect(loadedSession?.entries).toEqual([]);
            expect(loadedSession?.unresolvedBarcodes).toEqual([]);
            expect(loadedSession?.anomalies).toEqual([]);
            expect(loadedSession?.newItems).toEqual([]);
          }),
          { numRuns: 100 }
        );
      }
    );

    it(
      "handles session with items and unresolved barcodes",
      () => {
        fc.assert(
          fc.property(
            fc.array(scanEntryArb, { minLength: 1, maxLength: 50 }),
            fc.array(fc.string({ minLength: 1, maxLength: 50 }), { minLength: 1, maxLength: 20 }),
            fc.string({ minLength: 1, maxLength: 30 }),
            (entries, unresolvedBarcodes, tenantId) => {
              const session: OpnameSession = {
                cycleId: "cycle-789",
                locationId: "location-999",
                entries,
                unresolvedBarcodes,
                anomalies: [],
                newItems: [],
                createdAt: Date.now(),
                lastUpdated: Date.now(),
              };
              
              saveOpnameSession(session, tenantId);
              const loadedSession = loadOpnameSession(tenantId);
              
              expect(loadedSession).not.toBeNull();
              expect(loadedSession?.entries).toHaveLength(entries.length);
              expect(loadedSession?.unresolvedBarcodes).toHaveLength(unresolvedBarcodes.length);
            }
          ),
          { numRuns: 100 }
        );
      }
    );

    it(
      "handles session with unresolved barcodes",
      () => {
        fc.assert(
          fc.property(
            fc.array(fc.string({ minLength: 1, maxLength: 50 }), { minLength: 1, maxLength: 30 }),
            fc.string({ minLength: 1, maxLength: 30 }),
            (unresolvedBarcodes, tenantId) => {
              const session: OpnameSession = {
                cycleId: "cycle-999",
                locationId: "location-888",
                entries: [],
                unresolvedBarcodes,
                anomalies: [],
                newItems: [],
                createdAt: Date.now(),
                lastUpdated: Date.now(),
              };
              
              saveOpnameSession(session, tenantId);
              const loadedSession = loadOpnameSession(tenantId);
              
              expect(loadedSession).not.toBeNull();
              expect(loadedSession?.unresolvedBarcodes).toHaveLength(unresolvedBarcodes.length);
              expect(loadedSession?.unresolvedBarcodes).toEqual(unresolvedBarcodes);
            }
          ),
          { numRuns: 100 }
        );
      }
    );
  });

  describe("clearOpnameSession", () => {
    it(
      "removes session data after clear",
      () => {
        fc.assert(
          fc.property(opnameSessionArb, fc.string({ minLength: 1, maxLength: 30 }), (session, tenantId) => {
            // Save and verify it exists
            saveOpnameSession(session, tenantId);
            let loadedSession = loadOpnameSession(tenantId);
            expect(loadedSession).not.toBeNull();
            
            // Clear the session
            clearOpnameSession(tenantId);
            
            // Verify it's gone
            loadedSession = loadOpnameSession(tenantId);
            expect(loadedSession).toBeNull();
          }),
          { numRuns: 100 }
        );
      }
    );
  });

  describe("tenant isolation", () => {
    it(
      "sessions for different tenants do not interfere",
      () => {
        fc.assert(
          fc.property(
            opnameSessionArb,
            opnameSessionArb,
            fc.string({ minLength: 1, maxLength: 10 }),
            fc.string({ minLength: 1, maxLength: 10 }),
            (session1, session2, tenantId1, tenantId2) => {
              // Ensure tenants are different
              if (tenantId1 === tenantId2) return;
              
              saveOpnameSession(session1, tenantId1);
              saveOpnameSession(session2, tenantId2);
              
              const loaded1 = loadOpnameSession(tenantId1);
              const loaded2 = loadOpnameSession(tenantId2);
              
              expect(loaded1).not.toBeNull();
              expect(loaded2).not.toBeNull();
              expect(loaded1?.cycleId).toBe(session1.cycleId);
              expect(loaded2?.cycleId).toBe(session2.cycleId);
              expect(loaded1?.cycleId).not.toBe(loaded2?.cycleId);
            }
          ),
          { numRuns: 100 }
        );
      }
    );
  });
});
