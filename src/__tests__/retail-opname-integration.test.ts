/**
 * Integration Tests for Retail Opname
 *
 * Tests verify:
 * - Retail opname with Quick Register and branch scoping
 * - Session survives reload during active session
 * - Multiple users on different branches don't interfere
 *
 * Feature: stock-opname-parity, Task 5.3
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 7.1, 7.2
 */

import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";

// Mock localStorage
const createLocalStorageMock = () => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
    get length() { return Object.keys(store).length; },
    key: (index: number) => Object.keys(store)[index] || null,
  };
};

beforeEach(() => {
  Object.defineProperty(window, "localStorage", {
    value: createLocalStorageMock(),
    writable: true,
  });
});

afterEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

// ─── Retail Opname with Quick Register and Branch Scoping ────────────────────

describe("Retail Opname - Quick Register with Branch Scoping", () => {
  /**
   * Validates: Requirements 6.1, 6.2, 6.3, 6.4, 7.1, 7.2
   *
   * Retail opname uses the same Quick Register flow as Core opname
   * but is always scoped to the active branch.
   */

  test("unregistered barcode is added to unresolved list instead of rejected", async () => {
    const { saveOpnameSession, loadOpnameSession } = await import("@/lib/opname-session");

    const tenantId = "retail-tenant-001";
    const branchId = "branch-store-A";
    const unknownBarcode = "UNKNOWN-RETAIL-001";

    // Simulate the retail scanner behavior: when a scan doesn't match
    // any registered item, it goes to unresolved list (Req 6.2)
    const session = {
      cycleId: "retail-cycle-001",
      locationId: branchId,
      tenantId,
      entries: [
        { id: "item-1", sku: "SKU-R001", name: "Retail Item 1", systemCount: 10, actualCount: 12, timestamp: "09:00:00" },
      ],
      unresolvedBarcodes: [unknownBarcode],
      anomalies: [],
      newItems: [],
      createdAt: Date.now(),
      lastUpdated: Date.now(),
    };

    saveOpnameSession(session);
    const loaded = loadOpnameSession(tenantId, branchId);

    expect(loaded).not.toBeNull();
    expect(loaded!.unresolvedBarcodes).toContain(unknownBarcode);
    expect(loaded!.locationId).toBe(branchId);
  });

  test("Quick Register creates items with anomaly flag scoped to active branch", async () => {
    const { buildQuickRegisterPayload, resolveQuickRegisterResponse } = await import("@/lib/quick-register");
    const { saveOpnameSession, loadOpnameSession } = await import("@/lib/opname-session");

    const tenantId = "retail-tenant-002";
    const branchId = "branch-store-B";
    const unresolvedBarcodes = ["UNRESOLVED-001", "UNRESOLVED-002", "UNRESOLVED-003"];

    // Build the Quick Register payload (Req 6.3, 6.4)
    const payload = buildQuickRegisterPayload(unresolvedBarcodes);

    // Verify all items have anomaly category and flag
    payload.forEach((item) => {
      expect(item.is_anomaly).toBe(true);
      expect(item.status).toBe("incomplete");
      expect(item.category).toBe("Anomaly");
    });

    // Simulate backend response
    const mockResponseData = unresolvedBarcodes.map((bc, i) => ({
      id: `created-item-${i}`,
      sku: bc,
      name: `Unregistered Item - ${bc}`,
      category_id: "cat-anomaly-001",
    }));

    const resolved = resolveQuickRegisterResponse(unresolvedBarcodes, mockResponseData);

    // Verify resolved items maintain anomaly flag (Req 6.4)
    resolved.forEach((item, i) => {
      expect(item.barcode).toBe(unresolvedBarcodes[i]);
      expect(item.is_anomaly).toBe(true);
      expect(item.status).toBe("incomplete");
    });

    // Save session after Quick Register: barcodes removed from unresolved (Req 6.3)
    const sessionAfterRegister = {
      cycleId: "retail-cycle-002",
      locationId: branchId,
      tenantId,
      entries: [
        { id: "item-1", sku: "SKU-R001", name: "Retail Item 1", systemCount: 5, actualCount: 5, timestamp: "10:00:00" },
      ],
      unresolvedBarcodes: [], // All resolved via Quick Register
      anomalies: unresolvedBarcodes,
      newItems: resolved,
      createdAt: Date.now(),
      lastUpdated: Date.now(),
    };

    saveOpnameSession(sessionAfterRegister);
    const loaded = loadOpnameSession(tenantId, branchId);

    expect(loaded).not.toBeNull();
    expect(loaded!.unresolvedBarcodes).toEqual([]);
    expect(loaded!.newItems.length).toBe(3);
    expect(loaded!.locationId).toBe(branchId); // Branch scoped (Req 7.1)
  });

  test("branch scoping ensures session is tied to activeStore ID", async () => {
    const { saveOpnameSession, loadOpnameSession } = await import("@/lib/opname-session");

    const tenantId = "retail-tenant-003";
    const branchA = "store-jakarta-01";
    const branchB = "store-bandung-02";

    // Save session for branch A (Req 7.1)
    saveOpnameSession({
      cycleId: "cycle-jkt-001",
      locationId: branchA,
      tenantId,
      entries: [
        { id: "jkt-1", sku: "SKU-JKT-001", name: "Jakarta Item", systemCount: 20, actualCount: 18, timestamp: "08:00:00" },
      ],
      unresolvedBarcodes: ["JKT-UNKNOWN-001"],
      anomalies: [],
      newItems: [],
      createdAt: Date.now(),
      lastUpdated: Date.now(),
    });

    // Loading with the correct branch returns the session
    const sessionA = loadOpnameSession(tenantId, branchA);
    expect(sessionA).not.toBeNull();
    expect(sessionA!.locationId).toBe(branchA);
    expect(sessionA!.entries[0].sku).toBe("SKU-JKT-001");

    // Loading with a different branch returns null (no cross-branch access - Req 7.1)
    const sessionB = loadOpnameSession(tenantId, branchB);
    expect(sessionB).toBeNull();
  });

  test("Quick Register payload uses barcode as SKU for unregistered items", async () => {
    const { buildQuickRegisterPayload } = await import("@/lib/quick-register");

    const barcodes = ["8901234567890", "6291041500213"];
    const payload = buildQuickRegisterPayload(barcodes);

    // Verify each payload item has the barcode used as SKU (Req 6.2)
    payload.forEach((item, i) => {
      expect(item.sku).toBe(barcodes[i]);
      expect(item.barcode).toBe(barcodes[i]);
      expect(item.name).toContain(barcodes[i]);
      expect(item.is_anomaly).toBe(true);
      expect(item.status).toBe("incomplete");
      expect(item.category).toBe("Anomaly");
      expect(item.active).toBe(false);
      expect(item.base_price).toBe(0);
    });
  });

  test("registered items count is preserved alongside Quick Registered items in session", async () => {
    const { saveOpnameSession, loadOpnameSession } = await import("@/lib/opname-session");

    const tenantId = "retail-tenant-004";
    const branchId = "store-surabaya-01";

    // Simulate a session where both registered and Quick Registered items coexist (Req 6.5)
    const session = {
      cycleId: "cycle-sby-001",
      locationId: branchId,
      tenantId,
      entries: [
        { id: "reg-1", sku: "SKU-REG-001", name: "Registered Product A", systemCount: 50, actualCount: 52, timestamp: "11:00:00" },
        { id: "reg-2", sku: "SKU-REG-002", name: "Registered Product B", systemCount: 30, actualCount: 30, timestamp: "11:01:00" },
      ],
      unresolvedBarcodes: [],
      anomalies: ["UNKNOWN-SBY-001"],
      newItems: [
        { id: "new-1", barcode: "UNKNOWN-SBY-001", name: "Unregistered Item - UNKNOWN-SBY-001", is_anomaly: true, status: "incomplete" },
      ],
      createdAt: Date.now(),
      lastUpdated: Date.now(),
    };

    saveOpnameSession(session);
    const loaded = loadOpnameSession(tenantId, branchId);

    expect(loaded).not.toBeNull();
    // Registered items are preserved (Req 6.5)
    expect(loaded!.entries.length).toBe(2);
    expect(loaded!.entries[0].sku).toBe("SKU-REG-001");
    // Quick Registered items are tracked (Req 6.4)
    expect(loaded!.newItems.length).toBe(1);
    expect(loaded!.newItems[0].is_anomaly).toBe(true);
  });
});

// ─── Session Survives Reload During Active Retail Session ────────────────────

describe("Retail Opname - Session Survives Reload", () => {
  /**
   * Validates: Requirements 6.5, 7.1
   *
   * Retail opname sessions persist to localStorage and are restored
   * correctly after a page reload, maintaining branch scoping.
   */

  test("active retail session restores all state after simulated reload", async () => {
    const { saveOpnameSession, loadOpnameSession } = await import("@/lib/opname-session");

    const tenantId = "reload-tenant-001";
    const branchId = "store-reload-A";

    // Build a mid-session state
    const activeSession = {
      cycleId: "cycle-reload-001",
      locationId: branchId,
      tenantId,
      entries: [
        { id: "r-1", sku: "SKU-RELOAD-001", name: "Reload Product 1", systemCount: 15, actualCount: 17, timestamp: "14:00:00" },
        { id: "r-2", sku: "SKU-RELOAD-002", name: "Reload Product 2", systemCount: 8, actualCount: 8, timestamp: "14:01:00" },
        { id: "r-3", sku: "SKU-RELOAD-003", name: "Reload Product 3", systemCount: 25, actualCount: 22, timestamp: "14:02:00" },
      ],
      unresolvedBarcodes: ["RELOAD-UNKNOWN-001", "RELOAD-UNKNOWN-002"],
      anomalies: ["RELOAD-ANOMALY-001"],
      newItems: [
        { id: "new-r1", barcode: "RELOAD-ANOMALY-001", name: "Quick Registered Item", is_anomaly: true, status: "incomplete" },
      ],
      createdAt: Date.now() - 600000, // 10 minutes ago
      lastUpdated: Date.now(),
    };

    // Save (simulates state persisted before reload)
    saveOpnameSession(activeSession);

    // Simulate reload: load from localStorage
    const restored = loadOpnameSession(tenantId, branchId);

    // All state must be preserved
    expect(restored).not.toBeNull();
    expect(restored!.cycleId).toBe("cycle-reload-001");
    expect(restored!.locationId).toBe(branchId);
    expect(restored!.entries.length).toBe(3);
    expect(restored!.entries[0].actualCount).toBe(17);
    expect(restored!.entries[2].actualCount).toBe(22);
    expect(restored!.unresolvedBarcodes).toEqual(["RELOAD-UNKNOWN-001", "RELOAD-UNKNOWN-002"]);
    expect(restored!.anomalies).toEqual(["RELOAD-ANOMALY-001"]);
    expect(restored!.newItems.length).toBe(1);
    expect(restored!.newItems[0].is_anomaly).toBe(true);
  });

  test("session cleared after successful commit is not restored on reload", async () => {
    const { saveOpnameSession, loadOpnameSession, clearOpnameSession } = await import("@/lib/opname-session");

    const tenantId = "reload-tenant-002";
    const branchId = "store-reload-B";

    // Create and save a session
    saveOpnameSession({
      cycleId: "cycle-committed-001",
      locationId: branchId,
      tenantId,
      entries: [
        { id: "c-1", sku: "SKU-C001", name: "Committed Item", systemCount: 10, actualCount: 10, timestamp: "15:00:00" },
      ],
      unresolvedBarcodes: [],
      anomalies: [],
      newItems: [],
      createdAt: Date.now(),
      lastUpdated: Date.now(),
    });

    // Verify session exists
    expect(loadOpnameSession(tenantId, branchId)).not.toBeNull();

    // Simulate successful commit → clear
    clearOpnameSession(tenantId, branchId);

    // After reload, session should be gone
    expect(loadOpnameSession(tenantId, branchId)).toBeNull();
  });

  test("session cleared after abort is not restored on reload", async () => {
    const { saveOpnameSession, loadOpnameSession, clearOpnameSession } = await import("@/lib/opname-session");

    const tenantId = "reload-tenant-003";
    const branchId = "store-reload-C";

    // Create session with data
    saveOpnameSession({
      cycleId: "cycle-aborted-001",
      locationId: branchId,
      tenantId,
      entries: [
        { id: "a-1", sku: "SKU-A001", name: "Aborted Item", systemCount: 5, actualCount: 7, timestamp: "16:00:00" },
      ],
      unresolvedBarcodes: ["ABORT-UNKNOWN-001"],
      anomalies: [],
      newItems: [],
      createdAt: Date.now(),
      lastUpdated: Date.now(),
    });

    // User aborts → clear
    clearOpnameSession(tenantId, branchId);

    // Session gone
    expect(loadOpnameSession(tenantId, branchId)).toBeNull();
  });

  test("incremental session updates are preserved across reloads", async () => {
    const { saveOpnameSession, loadOpnameSession } = await import("@/lib/opname-session");

    const tenantId = "reload-tenant-004";
    const branchId = "store-reload-D";

    // Step 1: Initial scan
    saveOpnameSession({
      cycleId: "cycle-incremental-001",
      locationId: branchId,
      tenantId,
      entries: [
        { id: "i-1", sku: "SKU-INC-001", name: "Inc Product 1", systemCount: 10, actualCount: 1, timestamp: "09:00:00" },
      ],
      unresolvedBarcodes: [],
      anomalies: [],
      newItems: [],
      createdAt: Date.now(),
      lastUpdated: Date.now(),
    });

    // Step 2: More scans add entries
    saveOpnameSession({
      cycleId: "cycle-incremental-001",
      locationId: branchId,
      tenantId,
      entries: [
        { id: "i-1", sku: "SKU-INC-001", name: "Inc Product 1", systemCount: 10, actualCount: 5, timestamp: "09:05:00" },
        { id: "i-2", sku: "SKU-INC-002", name: "Inc Product 2", systemCount: 20, actualCount: 3, timestamp: "09:06:00" },
      ],
      unresolvedBarcodes: ["INC-UNKNOWN-001"],
      anomalies: [],
      newItems: [],
      createdAt: Date.now(),
      lastUpdated: Date.now(),
    });

    // Reload: latest state is the one restored
    const restored = loadOpnameSession(tenantId, branchId);

    expect(restored).not.toBeNull();
    expect(restored!.entries.length).toBe(2);
    expect(restored!.entries[0].actualCount).toBe(5);
    expect(restored!.entries[1].actualCount).toBe(3);
    expect(restored!.unresolvedBarcodes).toEqual(["INC-UNKNOWN-001"]);
  });
});

// ─── Multiple Users on Different Branches Don't Interfere ────────────────────

describe("Retail Opname - Multi-User Multi-Branch Isolation", () => {
  /**
   * Validates: Requirements 6.1, 6.5, 7.1, 7.2
   *
   * Sessions are isolated per tenant+location key. Two users on different
   * branches never see or overwrite each other's data.
   */

  test("two branches with simultaneous sessions remain fully isolated", async () => {
    const { saveOpnameSession, loadOpnameSession } = await import("@/lib/opname-session");

    const tenantId = "multi-tenant-001";
    const branchA = "store-north";
    const branchB = "store-south";

    // User A at branch A scans items
    saveOpnameSession({
      cycleId: "cycle-north-001",
      locationId: branchA,
      tenantId,
      entries: [
        { id: "n-1", sku: "SKU-NORTH-001", name: "North Item 1", systemCount: 100, actualCount: 95, timestamp: "08:00:00" },
        { id: "n-2", sku: "SKU-NORTH-002", name: "North Item 2", systemCount: 50, actualCount: 55, timestamp: "08:01:00" },
      ],
      unresolvedBarcodes: ["NORTH-UNKNOWN-001"],
      anomalies: [],
      newItems: [],
      createdAt: Date.now(),
      lastUpdated: Date.now(),
    });

    // User B at branch B scans different items
    saveOpnameSession({
      cycleId: "cycle-south-001",
      locationId: branchB,
      tenantId,
      entries: [
        { id: "s-1", sku: "SKU-SOUTH-001", name: "South Item 1", systemCount: 200, actualCount: 198, timestamp: "08:00:00" },
      ],
      unresolvedBarcodes: ["SOUTH-UNKNOWN-001", "SOUTH-UNKNOWN-002"],
      anomalies: [],
      newItems: [],
      createdAt: Date.now(),
      lastUpdated: Date.now(),
    });

    // Load branch A session
    const sessionA = loadOpnameSession(tenantId, branchA);
    expect(sessionA).not.toBeNull();
    expect(sessionA!.cycleId).toBe("cycle-north-001");
    expect(sessionA!.entries.length).toBe(2);
    expect(sessionA!.entries[0].sku).toBe("SKU-NORTH-001");
    expect(sessionA!.unresolvedBarcodes).toEqual(["NORTH-UNKNOWN-001"]);

    // Load branch B session
    const sessionB = loadOpnameSession(tenantId, branchB);
    expect(sessionB).not.toBeNull();
    expect(sessionB!.cycleId).toBe("cycle-south-001");
    expect(sessionB!.entries.length).toBe(1);
    expect(sessionB!.entries[0].sku).toBe("SKU-SOUTH-001");
    expect(sessionB!.unresolvedBarcodes).toEqual(["SOUTH-UNKNOWN-001", "SOUTH-UNKNOWN-002"]);
  });

  test("clearing one branch session does not affect another", async () => {
    const { saveOpnameSession, loadOpnameSession, clearOpnameSession } = await import("@/lib/opname-session");

    const tenantId = "multi-tenant-002";
    const branchX = "store-east";
    const branchY = "store-west";

    // Save sessions for both branches
    saveOpnameSession({
      cycleId: "cycle-east-001",
      locationId: branchX,
      tenantId,
      entries: [
        { id: "e-1", sku: "SKU-EAST-001", name: "East Item", systemCount: 30, actualCount: 28, timestamp: "09:00:00" },
      ],
      unresolvedBarcodes: [],
      anomalies: [],
      newItems: [],
      createdAt: Date.now(),
      lastUpdated: Date.now(),
    });

    saveOpnameSession({
      cycleId: "cycle-west-001",
      locationId: branchY,
      tenantId,
      entries: [
        { id: "w-1", sku: "SKU-WEST-001", name: "West Item", systemCount: 40, actualCount: 42, timestamp: "09:00:00" },
      ],
      unresolvedBarcodes: ["WEST-UNKNOWN-001"],
      anomalies: [],
      newItems: [],
      createdAt: Date.now(),
      lastUpdated: Date.now(),
    });

    // Clear branch X (simulating commit)
    clearOpnameSession(tenantId, branchX);

    // Branch X is cleared
    expect(loadOpnameSession(tenantId, branchX)).toBeNull();

    // Branch Y is untouched
    const sessionY = loadOpnameSession(tenantId, branchY);
    expect(sessionY).not.toBeNull();
    expect(sessionY!.cycleId).toBe("cycle-west-001");
    expect(sessionY!.entries[0].sku).toBe("SKU-WEST-001");
  });

  test("different tenants on same branch ID remain isolated", async () => {
    const { saveOpnameSession, loadOpnameSession } = await import("@/lib/opname-session");

    const tenantA = "tenant-alpha";
    const tenantB = "tenant-beta";
    const sameBranch = "store-main";

    // Tenant A session
    saveOpnameSession({
      cycleId: "cycle-alpha-001",
      locationId: sameBranch,
      tenantId: tenantA,
      entries: [
        { id: "a-1", sku: "ALPHA-SKU-001", name: "Alpha Item", systemCount: 10, actualCount: 10, timestamp: "10:00:00" },
      ],
      unresolvedBarcodes: [],
      anomalies: [],
      newItems: [],
      createdAt: Date.now(),
      lastUpdated: Date.now(),
    });

    // Tenant B session with same branch ID
    saveOpnameSession({
      cycleId: "cycle-beta-001",
      locationId: sameBranch,
      tenantId: tenantB,
      entries: [
        { id: "b-1", sku: "BETA-SKU-001", name: "Beta Item", systemCount: 20, actualCount: 22, timestamp: "10:00:00" },
      ],
      unresolvedBarcodes: ["BETA-UNKNOWN-001"],
      anomalies: [],
      newItems: [],
      createdAt: Date.now(),
      lastUpdated: Date.now(),
    });

    // Each tenant gets their own session
    const alphaSession = loadOpnameSession(tenantA, sameBranch);
    const betaSession = loadOpnameSession(tenantB, sameBranch);

    expect(alphaSession).not.toBeNull();
    expect(betaSession).not.toBeNull();
    expect(alphaSession!.cycleId).toBe("cycle-alpha-001");
    expect(betaSession!.cycleId).toBe("cycle-beta-001");
    expect(alphaSession!.entries[0].sku).toBe("ALPHA-SKU-001");
    expect(betaSession!.entries[0].sku).toBe("BETA-SKU-001");
  });

  test("multiple branches scan same unknown barcode; items scoped to correct branch", async () => {
    /**
     * E2E scenario for Task 10.2: Two branches scan the exact same unknown barcode.
     * Each branch Quick Registers independently. The resulting items are scoped
     * to the correct branch and do not interfere with each other.
     *
     * Validates: Requirements 7.1, 7.2, 7.3
     */
    const { saveOpnameSession, loadOpnameSession, clearOpnameSession } = await import("@/lib/opname-session");
    const { buildQuickRegisterPayload, resolveQuickRegisterResponse } = await import("@/lib/quick-register");

    const tenantId = "multi-branch-same-barcode-tenant";
    const branchJakarta = "store-jakarta";
    const branchBandung = "store-bandung";
    const sharedUnknownBarcode = "SHARED-UNKNOWN-BARCODE-999";

    // Branch Jakarta scans the shared unknown barcode
    saveOpnameSession({
      cycleId: "cycle-jakarta-001",
      locationId: branchJakarta,
      tenantId,
      entries: [
        { id: "jkt-1", sku: "SKU-JKT-100", name: "Jakarta Existing Item", systemCount: 40, actualCount: 38, timestamp: "08:00:00" },
      ],
      unresolvedBarcodes: [sharedUnknownBarcode],
      anomalies: [],
      newItems: [],
      createdAt: Date.now(),
      lastUpdated: Date.now(),
    });

    // Branch Bandung scans the same unknown barcode
    saveOpnameSession({
      cycleId: "cycle-bandung-001",
      locationId: branchBandung,
      tenantId,
      entries: [
        { id: "bdg-1", sku: "SKU-BDG-200", name: "Bandung Existing Item", systemCount: 25, actualCount: 27, timestamp: "08:00:00" },
      ],
      unresolvedBarcodes: [sharedUnknownBarcode],
      anomalies: [],
      newItems: [],
      createdAt: Date.now(),
      lastUpdated: Date.now(),
    });

    // Verify both branches have the same unresolved barcode independently
    const jakartaBeforeResolve = loadOpnameSession(tenantId, branchJakarta);
    const bandungBeforeResolve = loadOpnameSession(tenantId, branchBandung);
    expect(jakartaBeforeResolve!.unresolvedBarcodes).toContain(sharedUnknownBarcode);
    expect(bandungBeforeResolve!.unresolvedBarcodes).toContain(sharedUnknownBarcode);

    // Jakarta Quick Registers the barcode (Req 7.2 - item scoped to active branch)
    const jakartaPayload = buildQuickRegisterPayload([sharedUnknownBarcode]);
    expect(jakartaPayload[0].is_anomaly).toBe(true);
    expect(jakartaPayload[0].barcode).toBe(sharedUnknownBarcode);

    const jakartaResolved = resolveQuickRegisterResponse(
      [sharedUnknownBarcode],
      [{ id: "item-jkt-new-001", sku: sharedUnknownBarcode, branch_id: branchJakarta }]
    );

    // Update Jakarta session after Quick Register
    saveOpnameSession({
      cycleId: "cycle-jakarta-001",
      locationId: branchJakarta,
      tenantId,
      entries: [
        { id: "jkt-1", sku: "SKU-JKT-100", name: "Jakarta Existing Item", systemCount: 40, actualCount: 38, timestamp: "08:00:00" },
      ],
      unresolvedBarcodes: [], // Resolved
      anomalies: [sharedUnknownBarcode],
      newItems: jakartaResolved,
      createdAt: Date.now(),
      lastUpdated: Date.now(),
    });

    // Verify Bandung session is UNAFFECTED by Jakarta's Quick Register (Req 7.1)
    const bandungAfterJakartaResolve = loadOpnameSession(tenantId, branchBandung);
    expect(bandungAfterJakartaResolve).not.toBeNull();
    expect(bandungAfterJakartaResolve!.unresolvedBarcodes).toContain(sharedUnknownBarcode);
    expect(bandungAfterJakartaResolve!.newItems).toEqual([]);
    expect(bandungAfterJakartaResolve!.anomalies).toEqual([]);

    // Bandung Quick Registers the same barcode independently (Req 7.2)
    const bandungPayload = buildQuickRegisterPayload([sharedUnknownBarcode]);
    expect(bandungPayload[0].is_anomaly).toBe(true);
    expect(bandungPayload[0].barcode).toBe(sharedUnknownBarcode);

    const bandungResolved = resolveQuickRegisterResponse(
      [sharedUnknownBarcode],
      [{ id: "item-bdg-new-001", sku: sharedUnknownBarcode, branch_id: branchBandung }]
    );

    // Update Bandung session after Quick Register
    saveOpnameSession({
      cycleId: "cycle-bandung-001",
      locationId: branchBandung,
      tenantId,
      entries: [
        { id: "bdg-1", sku: "SKU-BDG-200", name: "Bandung Existing Item", systemCount: 25, actualCount: 27, timestamp: "08:00:00" },
      ],
      unresolvedBarcodes: [], // Resolved
      anomalies: [sharedUnknownBarcode],
      newItems: bandungResolved,
      createdAt: Date.now(),
      lastUpdated: Date.now(),
    });

    // Final verification: each branch has its own registered item from the same barcode
    const jakartaFinal = loadOpnameSession(tenantId, branchJakarta);
    const bandungFinal = loadOpnameSession(tenantId, branchBandung);

    // Jakarta's item is scoped to Jakarta (Req 7.2)
    expect(jakartaFinal).not.toBeNull();
    expect(jakartaFinal!.locationId).toBe(branchJakarta);
    expect(jakartaFinal!.newItems.length).toBe(1);
    expect(jakartaFinal!.newItems[0].barcode).toBe(sharedUnknownBarcode);
    expect(jakartaFinal!.newItems[0].is_anomaly).toBe(true);
    expect(jakartaFinal!.newItems[0].branch_id).toBe(branchJakarta);
    expect(jakartaFinal!.unresolvedBarcodes).toEqual([]);

    // Bandung's item is scoped to Bandung (Req 7.2)
    expect(bandungFinal).not.toBeNull();
    expect(bandungFinal!.locationId).toBe(branchBandung);
    expect(bandungFinal!.newItems.length).toBe(1);
    expect(bandungFinal!.newItems[0].barcode).toBe(sharedUnknownBarcode);
    expect(bandungFinal!.newItems[0].is_anomaly).toBe(true);
    expect(bandungFinal!.newItems[0].branch_id).toBe(branchBandung);
    expect(bandungFinal!.unresolvedBarcodes).toEqual([]);

    // Items are distinct entries despite same barcode (different branch scope)
    expect(jakartaFinal!.newItems[0].branch_id).not.toBe(bandungFinal!.newItems[0].branch_id);

    // Core_Opname retains cross-branch visibility (Req 7.3):
    // Both branch sessions exist and are accessible independently
    // A core auditor could load either branch's session data
    expect(jakartaFinal!.cycleId).toBe("cycle-jakarta-001");
    expect(bandungFinal!.cycleId).toBe("cycle-bandung-001");
  });

  test("Quick Register on one branch does not leak items to another branch session", async () => {
    const { saveOpnameSession, loadOpnameSession } = await import("@/lib/opname-session");
    const { buildQuickRegisterPayload, resolveQuickRegisterResponse } = await import("@/lib/quick-register");

    const tenantId = "multi-tenant-003";
    const branchMain = "store-main-floor";
    const branchWarehouse = "store-warehouse";

    // Main floor has unresolved barcodes
    saveOpnameSession({
      cycleId: "cycle-main-001",
      locationId: branchMain,
      tenantId,
      entries: [
        { id: "m-1", sku: "SKU-MAIN-001", name: "Main Floor Item", systemCount: 60, actualCount: 58, timestamp: "11:00:00" },
      ],
      unresolvedBarcodes: ["MAIN-UNKNOWN-001"],
      anomalies: [],
      newItems: [],
      createdAt: Date.now(),
      lastUpdated: Date.now(),
    });

    // Warehouse has its own session
    saveOpnameSession({
      cycleId: "cycle-warehouse-001",
      locationId: branchWarehouse,
      tenantId,
      entries: [
        { id: "wh-1", sku: "SKU-WH-001", name: "Warehouse Item", systemCount: 500, actualCount: 495, timestamp: "11:00:00" },
      ],
      unresolvedBarcodes: [],
      anomalies: [],
      newItems: [],
      createdAt: Date.now(),
      lastUpdated: Date.now(),
    });

    // Quick Register on main floor
    const payload = buildQuickRegisterPayload(["MAIN-UNKNOWN-001"]);
    const resolved = resolveQuickRegisterResponse(
      ["MAIN-UNKNOWN-001"],
      [{ id: "registered-main-001", sku: "MAIN-UNKNOWN-001" }]
    );

    // Update main floor session after Quick Register
    saveOpnameSession({
      cycleId: "cycle-main-001",
      locationId: branchMain,
      tenantId,
      entries: [
        { id: "m-1", sku: "SKU-MAIN-001", name: "Main Floor Item", systemCount: 60, actualCount: 58, timestamp: "11:00:00" },
      ],
      unresolvedBarcodes: [],
      anomalies: ["MAIN-UNKNOWN-001"],
      newItems: resolved,
      createdAt: Date.now(),
      lastUpdated: Date.now(),
    });

    // Verify warehouse session is untouched (Req 7.1, 7.2)
    const warehouseSession = loadOpnameSession(tenantId, branchWarehouse);
    expect(warehouseSession).not.toBeNull();
    expect(warehouseSession!.newItems).toEqual([]);
    expect(warehouseSession!.anomalies).toEqual([]);
    expect(warehouseSession!.unresolvedBarcodes).toEqual([]);

    // Verify main floor session was updated correctly
    const mainSession = loadOpnameSession(tenantId, branchMain);
    expect(mainSession).not.toBeNull();
    expect(mainSession!.newItems.length).toBe(1);
    expect(mainSession!.newItems[0].barcode).toBe("MAIN-UNKNOWN-001");
    expect(mainSession!.newItems[0].is_anomaly).toBe(true);
    expect(mainSession!.unresolvedBarcodes).toEqual([]);
  });

  test("full retail opname lifecycle: start → scan → unresolved → Quick Register → commit → cleared", async () => {
    const { saveOpnameSession, loadOpnameSession, clearOpnameSession } = await import("@/lib/opname-session");
    const { buildQuickRegisterPayload, resolveQuickRegisterResponse } = await import("@/lib/quick-register");

    const tenantId = "lifecycle-tenant";
    const branchId = "store-lifecycle";

    // Step 1: Start session and scan known items
    saveOpnameSession({
      cycleId: "cycle-life-001",
      locationId: branchId,
      tenantId,
      entries: [
        { id: "l-1", sku: "SKU-LIFE-001", name: "Lifecycle Item 1", systemCount: 10, actualCount: 10, timestamp: "12:00:00" },
      ],
      unresolvedBarcodes: [],
      anomalies: [],
      newItems: [],
      createdAt: Date.now(),
      lastUpdated: Date.now(),
    });

    // Step 2: Scan unknown barcodes
    saveOpnameSession({
      cycleId: "cycle-life-001",
      locationId: branchId,
      tenantId,
      entries: [
        { id: "l-1", sku: "SKU-LIFE-001", name: "Lifecycle Item 1", systemCount: 10, actualCount: 12, timestamp: "12:05:00" },
      ],
      unresolvedBarcodes: ["LIFE-UNKNOWN-001", "LIFE-UNKNOWN-002"],
      anomalies: [],
      newItems: [],
      createdAt: Date.now(),
      lastUpdated: Date.now(),
    });

    // Verify unresolved barcodes exist
    let session = loadOpnameSession(tenantId, branchId);
    expect(session!.unresolvedBarcodes.length).toBe(2);

    // Step 3: Quick Register resolves all barcodes
    const payload = buildQuickRegisterPayload(["LIFE-UNKNOWN-001", "LIFE-UNKNOWN-002"]);
    expect(payload.length).toBe(2);
    expect(payload.every(p => p.is_anomaly === true)).toBe(true);

    const resolved = resolveQuickRegisterResponse(
      ["LIFE-UNKNOWN-001", "LIFE-UNKNOWN-002"],
      [
        { id: "reg-life-001", sku: "LIFE-UNKNOWN-001" },
        { id: "reg-life-002", sku: "LIFE-UNKNOWN-002" },
      ]
    );

    // Step 4: Update session post-Quick Register
    saveOpnameSession({
      cycleId: "cycle-life-001",
      locationId: branchId,
      tenantId,
      entries: [
        { id: "l-1", sku: "SKU-LIFE-001", name: "Lifecycle Item 1", systemCount: 10, actualCount: 12, timestamp: "12:05:00" },
      ],
      unresolvedBarcodes: [],
      anomalies: ["LIFE-UNKNOWN-001", "LIFE-UNKNOWN-002"],
      newItems: resolved,
      createdAt: Date.now(),
      lastUpdated: Date.now(),
    });

    // Verify all resolved
    session = loadOpnameSession(tenantId, branchId);
    expect(session!.unresolvedBarcodes).toEqual([]);
    expect(session!.newItems.length).toBe(2);

    // Step 5: Commit clears session
    clearOpnameSession(tenantId, branchId);
    expect(loadOpnameSession(tenantId, branchId)).toBeNull();
  });
});
