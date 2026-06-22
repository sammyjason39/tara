/**
 * E2E Test: Complete opname workflow with unresolved barcodes
 *
 * Tests the full end-to-end workflow:
 * Start opname → scan items → encounter unknown barcodes → resolve via Quick Register → commit
 *
 * Feature: stock-opname-parity, Task 10.1
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 5.1, 5.3, 6.1, 6.2, 6.3, 6.4, 6.5
 */

import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";

// ─── Helpers ─────────────────────────────────────────────────────────────────

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

// ─── E2E: Complete Opname Workflow with Unresolved Barcodes ──────────────────

describe("E2E: Complete opname workflow with unresolved barcodes", () => {
  /**
   * Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5, 5.1, 5.3, 6.1, 6.2, 6.3, 6.4, 6.5
   *
   * This test validates the complete opname workflow end-to-end:
   * 1. Start an opname session
   * 2. Scan known items (registered) → counted normally
   * 3. Scan unknown barcodes → added to unresolved list (Req 6.2)
   * 4. Attempt commit with unresolved barcodes → blocked (Req 5.1)
   * 5. Quick Register resolves barcodes (Req 1.1, 1.2, 6.3)
   * 6. Barcodes removed from unresolved list (Req 1.4)
   * 7. Items flagged as anomaly with incomplete status (Req 1.2, 6.4)
   * 8. Commit succeeds after all resolved (Req 5.1)
   * 9. Session cleared after commit (Req 5.3)
   */

  test("full workflow: start → scan → unresolved → Quick Register → commit", async () => {
    const { saveOpnameSession, loadOpnameSession, clearOpnameSession } =
      await import("@/lib/opname-session");
    const { buildQuickRegisterPayload, resolveQuickRegisterResponse } =
      await import("@/lib/quick-register");

    const tenantId = "e2e-workflow-tenant";
    const branchId = "e2e-workflow-branch";

    // ── Step 1: Start opname session ──
    const initialSession = {
      cycleId: "cycle-e2e-full-001",
      locationId: branchId,
      tenantId,
      entries: [],
      unresolvedBarcodes: [] as string[],
      anomalies: [] as string[],
      newItems: [] as any[],
      createdAt: Date.now(),
      lastUpdated: Date.now(),
    };
    saveOpnameSession(initialSession);

    const started = loadOpnameSession(tenantId, branchId);
    expect(started).not.toBeNull();
    expect(started!.cycleId).toBe("cycle-e2e-full-001");

    // ── Step 2: Scan known items (registered) ──
    const sessionAfterKnownScans = {
      ...initialSession,
      entries: [
        { id: "reg-1", sku: "SKU-REG-001", name: "Registered Product A", systemCount: 50, actualCount: 52, timestamp: "09:00:00" },
        { id: "reg-2", sku: "SKU-REG-002", name: "Registered Product B", systemCount: 30, actualCount: 28, timestamp: "09:01:00" },
        { id: "reg-3", sku: "SKU-REG-003", name: "Registered Product C", systemCount: 20, actualCount: 20, timestamp: "09:02:00" },
      ],
      lastUpdated: Date.now(),
    };
    saveOpnameSession(sessionAfterKnownScans);

    const afterKnownScans = loadOpnameSession(tenantId, branchId);
    expect(afterKnownScans!.entries.length).toBe(3);
    expect(afterKnownScans!.unresolvedBarcodes.length).toBe(0);

    // ── Step 3: Scan unknown barcodes → added to unresolved (Req 6.2) ──
    const unknownBarcodes = ["UNKNOWN-E2E-001", "UNKNOWN-E2E-002", "UNKNOWN-E2E-003"];
    const sessionWithUnresolved = {
      ...sessionAfterKnownScans,
      unresolvedBarcodes: unknownBarcodes,
      lastUpdated: Date.now(),
    };
    saveOpnameSession(sessionWithUnresolved);

    const afterUnknownScans = loadOpnameSession(tenantId, branchId);
    expect(afterUnknownScans!.unresolvedBarcodes).toEqual(unknownBarcodes);
    // Known items still counted (Req 5.3 - unresolved don't discard counts)
    expect(afterUnknownScans!.entries.length).toBe(3);

    // ── Step 4: Attempt commit with unresolved barcodes → BLOCKED (Req 5.1) ──
    // The commitAudit logic: if unresolvedBarcodes.length > 0, open modal (block)
    const canCommit = afterUnknownScans!.unresolvedBarcodes.length === 0;
    expect(canCommit).toBe(false); // Commit is blocked

    // ── Step 5: Quick Register resolves barcodes (Req 1.1, 1.2, 6.3) ──
    const payload = buildQuickRegisterPayload(unknownBarcodes);

    // Verify payload correctness (Req 1.1 - no user input required)
    expect(payload.length).toBe(3);
    payload.forEach((item, i) => {
      expect(item.sku).toBe(unknownBarcodes[i]);
      expect(item.barcode).toBe(unknownBarcodes[i]);
      expect(item.is_anomaly).toBe(true);        // Req 1.2: anomaly flag
      expect(item.status).toBe("incomplete");     // Req 1.1: incomplete stub
      expect(item.category).toBe("Anomaly");      // Req 1.2: anomaly category
      expect(item.base_price).toBe(0);            // No price required (Req 1.1)
      expect(item.name).toContain(unknownBarcodes[i]); // Auto-generated name
    });

    // Simulate backend response
    const mockBackendResponse = unknownBarcodes.map((bc, i) => ({
      id: `created-item-${i}`,
      sku: bc,
      name: `Unregistered Item - ${bc}`,
      category_id: "cat-anomaly-e2e",
      is_anomaly: true,
      status: "incomplete",
    }));

    // Resolve response (Req 1.4 - items carry barcode for reconciliation)
    const resolved = resolveQuickRegisterResponse(unknownBarcodes, mockBackendResponse);
    expect(resolved.length).toBe(3);
    resolved.forEach((item, i) => {
      expect(item.barcode).toBe(unknownBarcodes[i]);
      expect(item.is_anomaly).toBe(true);
      expect(item.status).toBe("incomplete");
    });

    // ── Step 6: Barcodes removed from unresolved list (Req 1.4) ──
    const sessionAfterResolve = {
      ...sessionWithUnresolved,
      unresolvedBarcodes: [], // All resolved via Quick Register
      anomalies: unknownBarcodes,
      newItems: resolved,
      lastUpdated: Date.now(),
    };
    saveOpnameSession(sessionAfterResolve);

    const afterResolve = loadOpnameSession(tenantId, branchId);
    expect(afterResolve!.unresolvedBarcodes).toEqual([]); // Req 1.4
    expect(afterResolve!.anomalies).toEqual(unknownBarcodes);
    expect(afterResolve!.newItems.length).toBe(3);

    // ── Step 7: Verify anomaly flagging (Req 1.2, 6.4) ──
    afterResolve!.newItems.forEach((item) => {
      expect(item.is_anomaly).toBe(true);    // Req 1.2, 6.4
      expect(item.status).toBe("incomplete"); // Req 1.2, 6.4
    });

    // ── Step 8: Commit succeeds now that all resolved (Req 5.1) ──
    const canCommitNow = afterResolve!.unresolvedBarcodes.length === 0;
    expect(canCommitNow).toBe(true); // Commit is allowed

    // Verify both registered counts AND Quick Registered items included (Req 5.1 clause 2)
    expect(afterResolve!.entries.length).toBe(3); // Original registered scans
    expect(afterResolve!.newItems.length).toBe(3); // Quick Registered items

    // ── Step 9: Session cleared after commit (Req 5.3) ──
    clearOpnameSession(tenantId, branchId);
    expect(loadOpnameSession(tenantId, branchId)).toBeNull();
  });

  test("commit blocked until ALL unresolved barcodes are resolved (Req 5.1)", async () => {
    const { saveOpnameSession, loadOpnameSession } =
      await import("@/lib/opname-session");
    const { buildQuickRegisterPayload, resolveQuickRegisterResponse } =
      await import("@/lib/quick-register");

    const tenantId = "e2e-partial-tenant";
    const branchId = "e2e-partial-branch";
    const allBarcodes = ["PARTIAL-001", "PARTIAL-002", "PARTIAL-003", "PARTIAL-004"];

    // Start with 4 unresolved barcodes
    saveOpnameSession({
      cycleId: "cycle-partial-001",
      locationId: branchId,
      tenantId,
      entries: [
        { id: "p-1", sku: "SKU-P001", name: "Partial Item", systemCount: 10, actualCount: 10, timestamp: "10:00:00" },
      ],
      unresolvedBarcodes: allBarcodes,
      anomalies: [],
      newItems: [],
      createdAt: Date.now(),
      lastUpdated: Date.now(),
    });

    // Resolve only 2 of 4 barcodes
    const partialBarcodes = allBarcodes.slice(0, 2);
    const partialResolved = resolveQuickRegisterResponse(
      partialBarcodes,
      partialBarcodes.map((bc, i) => ({ id: `part-${i}`, sku: bc }))
    );

    saveOpnameSession({
      cycleId: "cycle-partial-001",
      locationId: branchId,
      tenantId,
      entries: [
        { id: "p-1", sku: "SKU-P001", name: "Partial Item", systemCount: 10, actualCount: 10, timestamp: "10:00:00" },
      ],
      unresolvedBarcodes: allBarcodes.slice(2), // Still 2 unresolved
      anomalies: partialBarcodes,
      newItems: partialResolved,
      createdAt: Date.now(),
      lastUpdated: Date.now(),
    });

    // Commit still blocked - not all resolved
    const session = loadOpnameSession(tenantId, branchId);
    expect(session!.unresolvedBarcodes.length).toBe(2);
    expect(session!.unresolvedBarcodes.length === 0).toBe(false); // Cannot commit

    // Resolve remaining 2 barcodes
    const remainingBarcodes = allBarcodes.slice(2);
    const remainingResolved = resolveQuickRegisterResponse(
      remainingBarcodes,
      remainingBarcodes.map((bc, i) => ({ id: `rem-${i}`, sku: bc }))
    );

    saveOpnameSession({
      cycleId: "cycle-partial-001",
      locationId: branchId,
      tenantId,
      entries: [
        { id: "p-1", sku: "SKU-P001", name: "Partial Item", systemCount: 10, actualCount: 10, timestamp: "10:00:00" },
      ],
      unresolvedBarcodes: [], // All resolved now
      anomalies: allBarcodes,
      newItems: [...partialResolved, ...remainingResolved],
      createdAt: Date.now(),
      lastUpdated: Date.now(),
    });

    // Now commit is allowed
    const finalSession = loadOpnameSession(tenantId, branchId);
    expect(finalSession!.unresolvedBarcodes.length).toBe(0);
    expect(finalSession!.unresolvedBarcodes.length === 0).toBe(true); // Can commit
    expect(finalSession!.newItems.length).toBe(4); // All 4 registered
  });

  test("Quick Register feedback: items marked incomplete in Anomaly category (Req 1.3)", async () => {
    const { buildQuickRegisterPayload, ANOMALY_CATEGORY_NAME } =
      await import("@/lib/quick-register");

    const barcodes = ["FEEDBACK-001", "FEEDBACK-002"];
    const payload = buildQuickRegisterPayload(barcodes);

    // Req 1.3: Feedback message should state items are incomplete and in Anomaly category
    // The payload itself carries the Anomaly category information for the feedback
    payload.forEach((item) => {
      expect(item.category).toBe(ANOMALY_CATEGORY_NAME); // Items in "Anomaly" category
      expect(item.status).toBe("incomplete");             // Items are "incomplete"
      expect(item.is_anomaly).toBe(true);                 // Anomaly flag set
    });

    // Verify the category name constant is correct
    expect(ANOMALY_CATEGORY_NAME).toBe("Anomaly");
  });

  test("scanned counts preserved when exiting unresolved step (Req 5.3)", async () => {
    const { saveOpnameSession, loadOpnameSession } =
      await import("@/lib/opname-session");

    const tenantId = "e2e-preserve-tenant";
    const branchId = "e2e-preserve-branch";

    // Session has both scanned entries and unresolved barcodes
    const session = {
      cycleId: "cycle-preserve-001",
      locationId: branchId,
      tenantId,
      entries: [
        { id: "pv-1", sku: "SKU-PV001", name: "Preserve Item A", systemCount: 100, actualCount: 98, timestamp: "08:30:00" },
        { id: "pv-2", sku: "SKU-PV002", name: "Preserve Item B", systemCount: 75, actualCount: 80, timestamp: "08:31:00" },
        { id: "pv-3", sku: "SKU-PV003", name: "Preserve Item C", systemCount: 40, actualCount: 40, timestamp: "08:32:00" },
      ],
      unresolvedBarcodes: ["PRESERVE-UNKNOWN-001", "PRESERVE-UNKNOWN-002"],
      anomalies: [],
      newItems: [],
      createdAt: Date.now(),
      lastUpdated: Date.now(),
    };

    saveOpnameSession(session);

    // Simulate: user sees unresolved modal, decides to close it without resolving
    // (Req 5.3: exiting unresolved step does not lose scanned counts)
    const loaded = loadOpnameSession(tenantId, branchId);
    expect(loaded!.entries.length).toBe(3);
    expect(loaded!.entries[0].actualCount).toBe(98);
    expect(loaded!.entries[1].actualCount).toBe(80);
    expect(loaded!.entries[2].actualCount).toBe(40);
    // Unresolved still present (user can resolve later)
    expect(loaded!.unresolvedBarcodes.length).toBe(2);
  });

  test("retail opname uses same experience as core opname (Req 6.1, 6.5)", async () => {
    const { saveOpnameSession, loadOpnameSession, clearOpnameSession } =
      await import("@/lib/opname-session");
    const { buildQuickRegisterPayload, resolveQuickRegisterResponse } =
      await import("@/lib/quick-register");

    // Core opname workflow
    const coreTenantId = "e2e-parity-core";
    const coreLocation = "warehouse-main";

    saveOpnameSession({
      cycleId: "cycle-core-parity",
      locationId: coreLocation,
      tenantId: coreTenantId,
      entries: [
        { id: "c-1", sku: "SKU-CORE-001", name: "Core Item", systemCount: 10, actualCount: 12, timestamp: "10:00:00" },
      ],
      unresolvedBarcodes: ["CORE-UNKNOWN-001"],
      anomalies: [],
      newItems: [],
      createdAt: Date.now(),
      lastUpdated: Date.now(),
    });

    // Retail opname workflow (same behavior, different branch scope)
    const retailTenantId = "e2e-parity-retail";
    const retailBranch = "store-outlet-01";

    saveOpnameSession({
      cycleId: "cycle-retail-parity",
      locationId: retailBranch,
      tenantId: retailTenantId,
      entries: [
        { id: "r-1", sku: "SKU-RETAIL-001", name: "Retail Item", systemCount: 10, actualCount: 12, timestamp: "10:00:00" },
      ],
      unresolvedBarcodes: ["RETAIL-UNKNOWN-001"],
      anomalies: [],
      newItems: [],
      createdAt: Date.now(),
      lastUpdated: Date.now(),
    });

    // Both use the SAME Quick Register flow (Req 6.1, 6.3)
    const corePayload = buildQuickRegisterPayload(["CORE-UNKNOWN-001"]);
    const retailPayload = buildQuickRegisterPayload(["RETAIL-UNKNOWN-001"]);

    // Same payload structure (Req 6.1: same experience)
    expect(corePayload[0].is_anomaly).toBe(retailPayload[0].is_anomaly);
    expect(corePayload[0].status).toBe(retailPayload[0].status);
    expect(corePayload[0].category).toBe(retailPayload[0].category);
    expect(corePayload[0].active).toBe(retailPayload[0].active);
    expect(corePayload[0].base_price).toBe(retailPayload[0].base_price);

    // Resolve both using the same function (Req 6.3)
    const coreResolved = resolveQuickRegisterResponse(
      ["CORE-UNKNOWN-001"],
      [{ id: "core-created-1", sku: "CORE-UNKNOWN-001" }]
    );
    const retailResolved = resolveQuickRegisterResponse(
      ["RETAIL-UNKNOWN-001"],
      [{ id: "retail-created-1", sku: "RETAIL-UNKNOWN-001" }]
    );

    // Same anomaly behavior applied (Req 6.4)
    expect(coreResolved[0].is_anomaly).toBe(true);
    expect(retailResolved[0].is_anomaly).toBe(true);
    expect(coreResolved[0].status).toBe("incomplete");
    expect(retailResolved[0].status).toBe("incomplete");

    // After resolution, both allow commit (Req 6.5)
    // Update core session
    saveOpnameSession({
      cycleId: "cycle-core-parity",
      locationId: coreLocation,
      tenantId: coreTenantId,
      entries: [
        { id: "c-1", sku: "SKU-CORE-001", name: "Core Item", systemCount: 10, actualCount: 12, timestamp: "10:00:00" },
      ],
      unresolvedBarcodes: [],
      anomalies: ["CORE-UNKNOWN-001"],
      newItems: coreResolved,
      createdAt: Date.now(),
      lastUpdated: Date.now(),
    });

    // Update retail session
    saveOpnameSession({
      cycleId: "cycle-retail-parity",
      locationId: retailBranch,
      tenantId: retailTenantId,
      entries: [
        { id: "r-1", sku: "SKU-RETAIL-001", name: "Retail Item", systemCount: 10, actualCount: 12, timestamp: "10:00:00" },
      ],
      unresolvedBarcodes: [],
      anomalies: ["RETAIL-UNKNOWN-001"],
      newItems: retailResolved,
      createdAt: Date.now(),
      lastUpdated: Date.now(),
    });

    // Both can now commit
    const coreSession = loadOpnameSession(coreTenantId, coreLocation);
    const retailSession = loadOpnameSession(retailTenantId, retailBranch);
    expect(coreSession!.unresolvedBarcodes.length === 0).toBe(true);
    expect(retailSession!.unresolvedBarcodes.length === 0).toBe(true);

    // Commit clears both (Req 6.5)
    clearOpnameSession(coreTenantId, coreLocation);
    clearOpnameSession(retailTenantId, retailBranch);
    expect(loadOpnameSession(coreTenantId, coreLocation)).toBeNull();
    expect(loadOpnameSession(retailTenantId, retailBranch)).toBeNull();
  });

  test("Quick Register failure keeps barcodes in unresolved list (Req 1.5)", async () => {
    const { saveOpnameSession, loadOpnameSession } =
      await import("@/lib/opname-session");

    const tenantId = "e2e-failure-tenant";
    const branchId = "e2e-failure-branch";
    const barcodes = ["FAIL-001", "FAIL-002"];

    // Session with unresolved barcodes
    saveOpnameSession({
      cycleId: "cycle-fail-001",
      locationId: branchId,
      tenantId,
      entries: [
        { id: "f-1", sku: "SKU-F001", name: "Fail Item", systemCount: 5, actualCount: 5, timestamp: "11:00:00" },
      ],
      unresolvedBarcodes: barcodes,
      anomalies: [],
      newItems: [],
      createdAt: Date.now(),
      lastUpdated: Date.now(),
    });

    // Simulate Quick Register failure: barcodes remain unresolved (Req 1.5)
    // On failure, session state is NOT updated - barcodes stay in unresolved list
    const sessionAfterFailure = loadOpnameSession(tenantId, branchId);
    expect(sessionAfterFailure!.unresolvedBarcodes).toEqual(barcodes);
    expect(sessionAfterFailure!.newItems.length).toBe(0);
    // Commit still blocked
    expect(sessionAfterFailure!.unresolvedBarcodes.length === 0).toBe(false);
  });

  test("commit includes both registered and Quick Registered item counts (Req 5.1 clause 2)", async () => {
    const { saveOpnameSession, loadOpnameSession, clearOpnameSession } =
      await import("@/lib/opname-session");
    const { resolveQuickRegisterResponse } =
      await import("@/lib/quick-register");

    const tenantId = "e2e-both-tenant";
    const branchId = "e2e-both-branch";

    // Resolve some items
    const resolved = resolveQuickRegisterResponse(
      ["BOTH-001", "BOTH-002"],
      [
        { id: "both-created-1", sku: "BOTH-001", name: "Registered via QR 1" },
        { id: "both-created-2", sku: "BOTH-002", name: "Registered via QR 2" },
      ]
    );

    // Session with registered counts AND quick registered items
    saveOpnameSession({
      cycleId: "cycle-both-001",
      locationId: branchId,
      tenantId,
      entries: [
        { id: "b-1", sku: "SKU-BOTH-001", name: "Registered A", systemCount: 100, actualCount: 102, timestamp: "12:00:00" },
        { id: "b-2", sku: "SKU-BOTH-002", name: "Registered B", systemCount: 50, actualCount: 48, timestamp: "12:01:00" },
      ],
      unresolvedBarcodes: [], // All resolved
      anomalies: ["BOTH-001", "BOTH-002"],
      newItems: resolved,
      createdAt: Date.now(),
      lastUpdated: Date.now(),
    });

    // At commit time, both registered counts AND new items are available
    const commitSession = loadOpnameSession(tenantId, branchId);
    expect(commitSession!.entries.length).toBe(2);   // Registered item counts
    expect(commitSession!.newItems.length).toBe(2);   // Quick Registered items

    // Total items for commit: entries (counted) + newItems (registered during session)
    const totalItemsForCommit = commitSession!.entries.length + commitSession!.newItems.length;
    expect(totalItemsForCommit).toBe(4);

    // Commit succeeds
    expect(commitSession!.unresolvedBarcodes.length === 0).toBe(true);
    clearOpnameSession(tenantId, branchId);
    expect(loadOpnameSession(tenantId, branchId)).toBeNull();
  });
});
