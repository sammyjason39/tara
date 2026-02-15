import { beforeEach, describe, expect, it } from "vitest";
import { Roles } from "@/core/security/roles";
import type { SessionContext } from "@/core/security/session";
import { procurementIntegrationAdapters } from "@/core/services/procurement/procurementIntegrationAdapters";
import { inventoryService } from "./inventoryService";

const tenantId = "tenant-inventory-e2e";

const session: SessionContext = {
  userId: "inventory-admin",
  tenantId,
  role: Roles.SUPERADMIN,
  departmentId: "INVENTORY",
};

describe("inventoryService end-to-end flows", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("supports intake, transfer, deduction, and dashboard metrics", () => {
    const [item] = inventoryService.listItems(tenantId);
    expect(item).toBeDefined();

    inventoryService.recordIntake(tenantId, session, {
      itemId: item.id,
      locationCode: "JKT-WH",
      departmentCode: "PRODUCTION",
      quantity: 30,
      unitCost: 120000,
      reason: "Test intake",
    });

    inventoryService.transferStock(tenantId, session, {
      itemId: item.id,
      fromLocationCode: "JKT-WH",
      fromDepartmentCode: "PRODUCTION",
      toLocationCode: "SBY-WH",
      toDepartmentCode: "DISTRIBUTION",
      quantity: 10,
      reason: "Inter-location balancing",
    });

    inventoryService.recordDeduction(tenantId, session, {
      itemId: item.id,
      locationCode: "SBY-WH",
      departmentCode: "DISTRIBUTION",
      quantity: 5,
      reason: "Outbound fulfillment",
    });

    const dashboard = inventoryService.getDashboard(tenantId);
    expect(dashboard.totalItems).toBeGreaterThan(0);
    expect(dashboard.totalOnHandQty).toBeGreaterThan(0);
    expect(dashboard.totalValuation).toBeGreaterThan(0);
  });

  it("handles adjustment approval with alert scans", () => {
    const [item] = inventoryService.listItems(tenantId);
    const adjustment = inventoryService.requestAdjustment(tenantId, session, {
      itemId: item.id,
      locationCode: "JKT-WH",
      departmentCode: "PRODUCTION",
      requestedDelta: -25,
      reason: "High variance correction",
    });
    expect(adjustment.status).toBe("PENDING_APPROVAL");

    const approved = inventoryService.approveAdjustment(tenantId, session, adjustment.id);
    expect(approved.status).toBe("APPROVED");

    inventoryService.runLowStockScan(tenantId, session);
    inventoryService.runExpiryScan(tenantId, session);
    const alerts = inventoryService.listAlerts(tenantId);
    expect(alerts.length).toBeGreaterThan(0);
  });

  it("syncs procurement receipt queue and supports mismatch reporting", () => {
    const [item] = inventoryService.listItems(tenantId);
    const sync = procurementIntegrationAdapters.queueGoodsReceiptSync(tenantId, session, {
      finalPoId: "po-e2e-001",
      requisitionId: "req-e2e-001",
      supplierId: "sup-e2e",
      supplierBranchId: "sup-e2e-jkt",
      branchCode: "JKT",
      expectedDeliveryDate: "2026-03-10",
    });

    const syncedResult = inventoryService.processProcurementReceipt(tenantId, session, {
      syncId: sync.id,
      itemId: item.id,
      quantity: 12,
      unitCost: 95000,
      locationCode: "JKT-WH",
      departmentCode: "PRODUCTION",
      mismatch: false,
    });
    expect(syncedResult.status).toBe("SYNCED");

    const mismatchSync = procurementIntegrationAdapters.queueGoodsReceiptSync(tenantId, session, {
      finalPoId: "po-e2e-002",
      requisitionId: "req-e2e-002",
      supplierId: "sup-e2e",
      supplierBranchId: "sup-e2e-jkt",
      branchCode: "JKT",
      expectedDeliveryDate: "2026-03-11",
    });

    const mismatchResult = inventoryService.processProcurementReceipt(tenantId, session, {
      syncId: mismatchSync.id,
      itemId: item.id,
      quantity: 8,
      unitCost: 92000,
      locationCode: "JKT-WH",
      departmentCode: "PRODUCTION",
      mismatch: true,
      mismatchIssueCount: 2,
    });
    expect(mismatchResult.status).toBe("MISMATCH_REPORTED");

    const integrationEvents = inventoryService.listIntegrationEvents(tenantId);
    expect(
      integrationEvents.some((event) => event.eventType === "PROCUREMENT_RECEIPT_SYNCED"),
    ).toBe(true);
    expect(
      integrationEvents.some((event) => event.eventType === "PROCUREMENT_RECEIPT_MISMATCH"),
    ).toBe(true);
  });
});

