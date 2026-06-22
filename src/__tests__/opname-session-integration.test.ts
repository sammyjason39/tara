/**
 * Integration Tests for Stock Opname Session Persistence
 *
 * Tests verify that opname sessions survive page reloads and are cleared
 * appropriately after commit or abort.
 *
 * Feature: stock-opname-parity, Task 3.2
 * Requirements: 4.1, 4.2, 4.4
 */

import { describe, test, expect, beforeEach, afterEach } from "vitest";
import { cleanup, render, screen, fireEvent, waitFor } from "@testing-library/react";
import * as fc from "fast-check";

// Mock localStorage
const createLocalStorageMock = () => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
};

// Mock the session and auth contexts
const createMockSession = (tenantId: string, locationId: string) => ({
  tenant_id: tenantId,
  location_id: locationId,
});

const createMockUser = () => ({
  first_name: "Test",
  last_name: "User",
});

// Mock inventory service
const createMockInventoryService = () => ({
  listLocations: async () => [],
  listCategories: async () => [],
  lookupItemByBarcode: async () => ({
    id: "item-123",
    sku: "SKU123",
    name: "Test Item",
  }),
  initiateAudit: async () => ({
    id: "cycle-456",
  }),
  closeAuditCycle: async () => ({}),
});

// Mock retail service
const createMockRetailService = () => ({
  listStores: async () => [],
  listChannels: async () => [],
});

// Global mocks before all tests
beforeEach(() => {
  // Setup localStorage mock
  Object.defineProperty(window, "localStorage", {
    value: createLocalStorageMock(),
    writable: true,
  });

  // Mock navigator
  Object.defineProperty(window, "navigator", {
    value: {
      userAgent: "test-agent",
    },
    writable: true,
  });
});

afterEach(() => {
  cleanup();
  localStorage.clear();
});

// ─── Integration Tests ───────────────────────────────────────────────────────

describe("Opname Session Persistence Integration", () => {
  /**
   * Validates: Requirements 4.1, 4.2, 4.4
   *
   * Property: Session persistence survives reload
   * For any valid OpnameSession, after save and simulated reload,
   * the session must be restored correctly.
   */

  test("restores session after page reload during active opname", async () => {
    const tenantId = "tenant-test-001";
    const locationId = "loc-test-001";
    const cycleId = "cycle-001";

    // Load the module under test
    const module = await import("../lib/opname-session");
    const { saveOpnameSession, loadOpnameSession, clearOpnameSession } = module;

    // Create a session with some data
    const originalSession = {
      cycleId,
      locationId,
      tenantId,
      entries: [
        {
          id: "item-1",
          sku: "SKU001",
          name: "Product One",
          systemCount: 10,
          actualCount: 12,
          timestamp: new Date().toLocaleTimeString(),
        },
        {
          id: "item-2",
          sku: "SKU002",
          name: "Product Two",
          systemCount: 5,
          actualCount: 5,
          timestamp: new Date().toLocaleTimeString(),
        },
      ],
      unresolvedBarcodes: ["UNKNOWN001", "UNKNOWN002"],
      anomalies: ["ANOMALY001"],
      newItems: [
        {
          id: "new-item-1",
          barcode: "UNKNOWN001",
          name: "Unknown Item 1",
        },
      ],
      createdAt: Date.now(),
      lastUpdated: Date.now(),
    };

    // Save the session
    saveOpnameSession(originalSession);

    // Verify it's stored
    const storedKey = `opname_session_${tenantId}:${locationId}`;
    const storedRaw = localStorage.getItem(storedKey);
    expect(storedRaw).not.toBeNull();
    expect(storedRaw).toContain(cycleId);
    expect(storedRaw).toContain(locationId);

    // Simulate page reload by loading from localStorage
    const restoredSession = loadOpnameSession(tenantId, locationId);

    expect(restoredSession).not.toBeNull();
    expect(restoredSession?.cycleId).toBe(cycleId);
    expect(restoredSession?.locationId).toBe(locationId);
    expect(restoredSession?.entries.length).toBe(2);
    expect(restoredSession?.unresolvedBarcodes).toEqual(["UNKNOWN001", "UNKNOWN002"]);
    expect(restoredSession?.anomalies).toEqual(["ANOMALY001"]);
    expect(restoredSession?.newItems.length).toBe(1);
  });

  test("clears session after successful commit", async () => {
    const tenantId = "tenant-test-002";
    const locationId = "loc-test-002";
    const cycleId = "cycle-002";

    const module = await import("../lib/opname-session");
    const { saveOpnameSession, loadOpnameSession, clearOpnameSession } = module;

    // Create and save a session
    const session = {
      cycleId,
      locationId,
      tenantId,
      entries: [
        {
          id: "item-1",
          sku: "SKU001",
          name: "Product One",
          systemCount: 10,
          actualCount: 12,
          timestamp: new Date().toLocaleTimeString(),
        },
      ],
      unresolvedBarcodes: [],
      anomalies: [],
      newItems: [],
      createdAt: Date.now(),
      lastUpdated: Date.now(),
    };

    saveOpnameSession(session);

    // Verify session exists
    expect(loadOpnameSession(tenantId, locationId)).not.toBeNull();

    // Clear the session (simulating commit)
    clearOpnameSession(tenantId, locationId);

    // Verify session is cleared
    expect(loadOpnameSession(tenantId, locationId)).toBeNull();
  });

  test("clears session after abort", async () => {
    const tenantId = "tenant-test-003";
    const locationId = "loc-test-003";

    const module = await import("../lib/opname-session");
    const { saveOpnameSession, loadOpnameSession, clearOpnameSession } = module;

    // Create and save a session
    const session = {
      cycleId: "cycle-003",
      locationId,
      tenantId,
      entries: [],
      unresolvedBarcodes: ["UNKNOWN001"],
      anomalies: [],
      newItems: [],
      createdAt: Date.now(),
      lastUpdated: Date.now(),
    };

    saveOpnameSession(session);

    // Verify session exists
    expect(loadOpnameSession(tenantId, locationId)).not.toBeNull();

    // Clear on abort
    clearOpnameSession(tenantId, locationId);

    // Verify session is cleared
    expect(loadOpnameSession(tenantId, locationId)).toBeNull();
  });

  test("handles multiple tenants' sessions independently", async () => {
    const tenant1 = "tenant-alpha";
    const tenant2 = "tenant-beta";
    const location = "loc-main";

    const module = await import("../lib/opname-session");
    const { saveOpnameSession, loadOpnameSession } = module;

    // Save sessions for both tenants
    saveOpnameSession({
      cycleId: "cycle-1",
      locationId: location,
      tenantId: tenant1,
      entries: [{ id: "1", sku: "SKU1", name: "Item 1", systemCount: 0, actualCount: 1, timestamp: "" }],
      unresolvedBarcodes: ["barcode1"],
      anomalies: [],
      newItems: [],
      createdAt: Date.now(),
      lastUpdated: Date.now(),
    });

    saveOpnameSession({
      cycleId: "cycle-2",
      locationId: location,
      tenantId: tenant2,
      entries: [{ id: "2", sku: "SKU2", name: "Item 2", systemCount: 0, actualCount: 2, timestamp: "" }],
      unresolvedBarcodes: ["barcode2"],
      anomalies: [],
      newItems: [],
      createdAt: Date.now(),
      lastUpdated: Date.now(),
    });

    // Verify each tenant's session is independent
    const session1 = loadOpnameSession(tenant1, location);
    const session2 = loadOpnameSession(tenant2, location);

    expect(session1).not.toBeNull();
    expect(session2).not.toBeNull();
    expect(session1?.entries[0]?.sku).toBe("SKU1");
    expect(session2?.entries[0]?.sku).toBe("SKU2");
    expect(session1?.unresolvedBarcodes).toEqual(["barcode1"]);
    expect(session2?.unresolvedBarcodes).toEqual(["barcode2"]);
  });

  test("survives reload with complex data structures", async () => {
    const tenantId = "tenant-complex";
    const locationId = "loc-complex";

    const module = await import("../lib/opname-session");
    const { saveOpnameSession, loadOpnameSession } = module;

    // Create a session with serials, multiple entries, and various states
    const complexSession = {
      cycleId: "cycle-complex",
      locationId,
      tenantId,
      entries: [
        {
          id: "item-a",
          sku: "SKU-A",
          name: "Complex Item A",
          systemCount: 100,
          actualCount: 105,
          timestamp: "10:30:00",
          serials: ["SN001", "SN002", "SN003"],
        },
        {
          id: "item-b",
          sku: "SKU-B",
          name: "Complex Item B",
          systemCount: 50,
          actualCount: 48,
          timestamp: "10:35:00",
        },
      ],
      unresolvedBarcodes: ["UNKNOWN-001", "UNKNOWN-002", "UNKNOWN-003"],
      anomalies: ["ANOMALY-001", "ANOMALY-002"],
      newItems: [
        {
          id: "new-1",
          barcode: "UNKNOWN-001",
          name: "New Item 1",
          category_id: "cat-anomaly",
          is_anomaly: true,
        },
        {
          id: "new-2",
          barcode: "UNKNOWN-002",
          name: "New Item 2",
          category_id: "cat-anomaly",
          is_anomaly: true,
        },
      ],
      createdAt: Date.now() - 3600000, // 1 hour ago
      lastUpdated: Date.now(),
    };

    saveOpnameSession(complexSession);

    // Simulate reload
    const restored = loadOpnameSession(tenantId, locationId);

    expect(restored).not.toBeNull();
    expect(restored?.entries.length).toBe(2);
    expect(restored?.entries[0]?.serials).toEqual(["SN001", "SN002", "SN003"]);
    expect(restored?.unresolvedBarcodes.length).toBe(3);
    expect(restored?.anomalies.length).toBe(2);
    expect(restored?.newItems.length).toBe(2);
    expect(restored?.newItems[0]?.is_anomaly).toBe(true);
  });

  /**
   * Property-Based Test: Session data integrity after save/restore cycle
   */
  test("session data integrity preserved across save/restore cycles", () => {
    fc.assert(
      fc.property(
        fc.record({
          cycleId: fc.string({ minLength: 5, maxLength: 50 }),
          locationId: fc.string({ minLength: 5, maxLength: 50 }),
          tenantId: fc.string({ minLength: 5, maxLength: 50 }),
          entries: fc.array(
            fc.record({
              id: fc.string(),
              sku: fc.string({ minLength: 3, maxLength: 20 }),
              name: fc.string({ minLength: 1, maxLength: 100 }),
              systemCount: fc.integer({ min: 0, max: 10000 }),
              actualCount: fc.integer({ min: 0, max: 10000 }),
              timestamp: fc.string({ minLength: 5, maxLength: 20 }),
              serials: fc.option(fc.array(fc.string({ minLength: 5, maxLength: 30 })), { nil: [] }),
            }),
            { minLength: 1, maxLength: 10 }
          ),
          unresolvedBarcodes: fc.array(fc.string({ minLength: 5, maxLength: 50 }), {
            minLength: 0,
            maxLength: 20,
          }),
          anomalies: fc.array(fc.string({ minLength: 5, maxLength: 50 }), {
            minLength: 0,
            maxLength: 10,
          }),
          newItems: fc.array(
            fc.record({
              id: fc.string(),
              barcode: fc.string({ minLength: 5, maxLength: 50 }),
              name: fc.string({ minLength: 1, maxLength: 100 }),
              category_id: fc.string(),
              is_anomaly: fc.boolean(),
            }),
            { minLength: 0, maxLength: 5 }
          ),
        }),
        (originalSession) => {
          const module = import("../lib/opname-session");
          module.then(({ saveOpnameSession, loadOpnameSession }) => {
            saveOpnameSession({
              ...originalSession,
              createdAt: Date.now(),
              lastUpdated: Date.now(),
            });

            const restored = loadOpnameSession(originalSession.tenantId, originalSession.locationId);

            expect(restored).not.toBeNull();
            expect(restored?.cycleId).toBe(originalSession.cycleId);
            expect(restored?.locationId).toBe(originalSession.locationId);
            expect(restored?.entries.length).toBe(originalSession.entries.length);
            expect(restored?.unresolvedBarcodes.length).toBe(originalSession.unresolvedBarcodes.length);
            expect(restored?.anomalies.length).toBe(originalSession.anomalies.length);
            expect(restored?.newItems.length).toBe(originalSession.newItems.length);
          });
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ─── End-to-End Style Tests (Component Level) ────────────────────────────────

describe("Opname Session Integration - End-to-End Flow", () => {
  /**
   * Validates: Requirements 4.1, 4.2, 4.4
   *
   * Complete workflow: start opname → scan items → add unresolved → reload → restore → commit → clear
   */

  test("complete session lifecycle: start → scan → unresolved → reload → restore → commit → clear", async () => {
    const tenantId = "e2e-tenant";
    const locationId = "e2e-location";

    const module = await import("../lib/opname-session");
    const { saveOpnameSession, loadOpnameSession, clearOpnameSession } = module;

    // Step 1: Start opname and scan some items
    const sessionStep1 = {
      cycleId: "cycle-e2e-001",
      locationId,
      tenantId,
      entries: [
        {
          id: "item-1",
          sku: "E2E-001",
          name: "End-to-End Item 1",
          systemCount: 10,
          actualCount: 15,
          timestamp: "10:00:00",
        },
        {
          id: "item-2",
          sku: "E2E-002",
          name: "End-to-End Item 2",
          systemCount: 5,
          actualCount: 5,
          timestamp: "10:01:00",
        },
      ],
      unresolvedBarcodes: [],
      anomalies: [],
      newItems: [],
      createdAt: Date.now(),
      lastUpdated: Date.now(),
    };

    saveOpnameSession(sessionStep1);
    expect(loadOpnameSession(tenantId, locationId)).not.toBeNull();

    // Step 2: Add unresolved barcode (simulating user action)
    const sessionStep2 = {
      ...sessionStep1,
      unresolvedBarcodes: ["E2E-UNKNOWN-001"],
      lastUpdated: Date.now(),
    };

    saveOpnameSession(sessionStep2);
    expect(loadOpnameSession(tenantId, locationId)?.unresolvedBarcodes).toEqual(["E2E-UNKNOWN-001"]);

    // Step 3: Simulate page reload
    const restoredSession = loadOpnameSession(tenantId, locationId);
    expect(restoredSession).not.toBeNull();
    expect(restoredSession?.entries.length).toBe(2);
    expect(restoredSession?.unresolvedBarcodes).toEqual(["E2E-UNKNOWN-001"]);

    // Step 4: Resolve unresolved barcodes
    const sessionStep3 = {
      ...restoredSession!,
      unresolvedBarcodes: [],
      newItems: [
        {
          id: "new-e2e-001",
          barcode: "E2E-UNKNOWN-001",
          name: "Registered E2E Unknown",
          category_id: "cat-anomaly",
          is_anomaly: true,
        },
      ],
      lastUpdated: Date.now(),
    };

    saveOpnameSession(sessionStep3);

    // Step 5: Commit (clear session)
    clearOpnameSession(tenantId, locationId);
    expect(loadOpnameSession(tenantId, locationId)).toBeNull();
  });
});

// ─── Error Handling Tests ────────────────────────────────────────────────────

describe("Opname Session Error Handling", () => {
  test("handles corrupted localStorage data gracefully", async () => {
    const tenantId = "error-tenant";
    const locationId = "error-location";
    const key = `opname_session_${tenantId}:${locationId}`;

    // Store corrupted data
    localStorage.setItem(key, "this is not valid JSON");

    const module = await import("../lib/opname-session");
    const { loadOpnameSession } = module;

    // Should return null instead of throwing
    expect(loadOpnameSession(tenantId, locationId)).toBeNull();
  });

  test("handles missing required fields gracefully", async () => {
    const tenantId = "incomplete-tenant";
    const locationId = "incomplete-location";
    const key = `opname_session_${tenantId}:${locationId}`;

    // Store data missing required fields
    localStorage.setItem(key, JSON.stringify({ entries: [], someOtherField: "value" }));

    const module = await import("../lib/opname-session");
    const { loadOpnameSession } = module;

    // Should return null because cycleId and locationId are missing
    expect(loadOpnameSession(tenantId, locationId)).toBeNull();
  });

  test("handles localStorage quota exceeded gracefully", async () => {
    const tenantId = "quota-tenant";
    const locationId = "quota-location";

    const module = await import("../lib/opname-session");
    const { saveOpnameSession } = module;

    // Mock localStorage.setItem to throw QuotaExceededError
    const originalSetItem = localStorage.setItem;
    let mockError: any = null;
    localStorage.setItem = function (_key: string, _value: string) {
      mockError = new Error("QuotaExceededError") as any;
      mockError.name = "QuotaExceededError";
      throw mockError;
    } as any;

    // Should log error but not crash
    expect(() => {
      saveOpnameSession({
        cycleId: "cycle-quota",
        locationId,
        tenantId,
        entries: [],
        unresolvedBarcodes: [],
        anomalies: [],
        newItems: [],
        createdAt: Date.now(),
        lastUpdated: Date.now(),
      });
    }).not.toThrow();

    // Restore original
    localStorage.setItem = originalSetItem;
  });
});

// ─── Performance Tests ───────────────────────────────────────────────────────

describe("Opname Session Performance", () => {
  test("saves session quickly even with many entries", async () => {
    const tenantId = "perf-tenant";
    const locationId = "perf-location";

    const module = await import("../lib/opname-session");
    const { saveOpnameSession, loadOpnameSession } = module;

    // Create session with many entries
    const largeSession = {
      cycleId: "cycle-perf",
      locationId,
      tenantId,
      entries: Array.from({ length: 100 }, (_, i) => ({
        id: `item-${i}`,
        sku: `SKU-${i.toString().padStart(3, "0")}`,
        name: `Product ${i}`,
        systemCount: Math.floor(Math.random() * 100),
        actualCount: Math.floor(Math.random() * 100),
        timestamp: `${10 + Math.floor(i / 60)}:${(i % 60).toString().padStart(2, "0")}:00`,
      })),
      unresolvedBarcodes: Array.from({ length: 10 }, (_, i) => `UNKNOWN-${i}`),
      anomalies: Array.from({ length: 5 }, (_, i) => `ANOMALY-${i}`),
      newItems: Array.from({ length: 3 }, (_, i) => ({
        id: `new-${i}`,
        barcode: `UNKNOWN-${i}`,
        name: `New Item ${i}`,
        category_id: "cat-anomaly",
        is_anomaly: true,
      })),
      createdAt: Date.now(),
      lastUpdated: Date.now(),
    };

    // Measure save performance
    const saveStart = performance.now();
    saveOpnameSession(largeSession);
    const saveEnd = performance.now();

    // Verify save completed quickly (< 100ms)
    expect(saveEnd - saveStart).toBeLessThan(100);

    // Measure load performance
    const loadStart = performance.now();
    const restored = loadOpnameSession(tenantId, locationId);
    const loadEnd = performance.now();

    // Verify load completed quickly (< 100ms)
    expect(loadEnd - loadStart).toBeLessThan(100);

    // Verify data integrity
    expect(restored?.entries.length).toBe(100);
    expect(restored?.unresolvedBarcodes.length).toBe(10);
  });
});
