import { audit } from "@/core/logging/audit";
import { mockInventoryRepo } from "@/core/repositories/inventory/mockInventoryRepo";
import type { SessionContext } from "@/core/security/session";
import { procurementService } from "@/core/services/procurement/procurementService";
import type {
  InventoryAdjustmentRequest,
  InventoryAlert,
  InventoryAlertStatus,
  InventoryAuditCycle,
  InventoryDashboardMetrics,
  InventoryItemMaster,
  InventoryMovement,
  InventoryMovementType,
  InventoryStockBalance,
} from "@/core/types/inventory/inventory";

const repo = mockInventoryRepo;

const nowIso = () => new Date().toISOString();
const createId = (prefix: string) =>
  `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;

const ensureTenant = (tenantId: string, session: SessionContext) => {
  if (session.role === "SUPERADMIN") return;
  if (tenantId !== session.tenantId) throw new Error("Tenant access denied");
};

const findBalance = (
  tenantId: string,
  itemId: string,
  locationCode: string,
  departmentCode?: string,
) =>
  repo
    .listBalances(tenantId)
    .find(
      (item) =>
        item.itemId === itemId &&
        item.locationCode === locationCode &&
        (item.departmentCode ?? "") === (departmentCode ?? ""),
    );

const upsertBalance = (
  tenantId: string,
  payload: {
    itemId: string;
    locationCode: string;
    departmentCode?: string;
    quantityDelta: number;
    unitCost: number;
  },
): InventoryStockBalance => {
  const existing = findBalance(
    tenantId,
    payload.itemId,
    payload.locationCode,
    payload.departmentCode,
  );
  if (!existing) {
    const created: InventoryStockBalance = {
      id: createId("inv-bal"),
      tenantId,
      itemId: payload.itemId,
      locationCode: payload.locationCode,
      departmentCode: payload.departmentCode,
      quantity: Math.max(payload.quantityDelta, 0),
      reservedQuantity: 0,
      avgUnitCost: Math.max(payload.unitCost, 0),
      currency: "IDR",
      reorderPoint: 20,
      safetyStock: 10,
      updatedAt: nowIso(),
    };
    repo.createBalance(tenantId, created);
    return created;
  }

  const nextQty = Math.max(existing.quantity + payload.quantityDelta, 0);
  const weightedCost =
    nextQty > 0 && payload.quantityDelta > 0
      ? (existing.avgUnitCost * existing.quantity + payload.unitCost * payload.quantityDelta) /
        Math.max(existing.quantity + payload.quantityDelta, 1)
      : existing.avgUnitCost;
  const updated = repo.updateBalance(tenantId, existing.id, {
    quantity: nextQty,
    avgUnitCost: Math.max(weightedCost, 0),
    updatedAt: nowIso(),
  });
  if (!updated) throw new Error("Unable to update stock balance.");
  return updated;
};

const createMovement = (
  tenantId: string,
  session: SessionContext,
  payload: {
    itemId: string;
    type: InventoryMovementType;
    quantity: number;
    unitCost: number;
    reason: string;
    sourceLocationCode?: string;
    sourceDepartmentCode?: string;
    destinationLocationCode?: string;
    destinationDepartmentCode?: string;
    referenceType?: string;
    referenceId?: string;
  },
) => {
  const movement: InventoryMovement = {
    id: createId("inv-mov"),
    tenantId,
    itemId: payload.itemId,
    type: payload.type,
    quantity: Math.max(payload.quantity, 0),
    unitCost: Math.max(payload.unitCost, 0),
    reason: payload.reason,
    sourceLocationCode: payload.sourceLocationCode,
    sourceDepartmentCode: payload.sourceDepartmentCode,
    destinationLocationCode: payload.destinationLocationCode,
    destinationDepartmentCode: payload.destinationDepartmentCode,
    referenceType: payload.referenceType,
    referenceId: payload.referenceId,
    performedBy: session.userId,
    createdAt: nowIso(),
  };
  repo.createMovement(tenantId, movement);
  return movement;
};

const createIntegrationEvent = (
  tenantId: string,
  target: "FINANCE" | "PROCUREMENT" | "SALES" | "PAYMENT" | "HR" | "IT",
  eventType: string,
  entityId: string,
  detail: string,
  status: "PENDING" | "SYNCED" | "FAILED" = "SYNCED",
) => {
  repo.createIntegrationEvent(tenantId, {
    id: createId("inv-int"),
    tenantId,
    target,
    status,
    eventType,
    entityId,
    detail,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  });
};

const ensureAlert = (
  tenantId: string,
  type: InventoryAlert["type"],
  entityId: string,
  message: string,
  severity: InventoryAlert["severity"] = "MEDIUM",
) => {
  const existing = repo
    .listAlerts(tenantId)
    .find((item) => item.type === type && item.entityId === entityId && item.status === "OPEN");
  if (existing) return existing;
  const alert: InventoryAlert = {
    id: createId("inv-alert"),
    tenantId,
    type,
    severity,
    status: "OPEN",
    entityId,
    message,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
  repo.createAlert(tenantId, alert);
  return alert;
};

export const inventoryService = {
  listItems: (tenantId: string) => repo.listItems(tenantId),
  listBalances: (tenantId: string) => repo.listBalances(tenantId),
  listMovements: (tenantId: string) => repo.listMovements(tenantId),
  listAdjustments: (tenantId: string) => repo.listAdjustments(tenantId),
  listAuditCycles: (tenantId: string) => repo.listAuditCycles(tenantId),
  listAlerts: (tenantId: string) => repo.listAlerts(tenantId),
  listIntegrationEvents: (tenantId: string) => repo.listIntegrationEvents(tenantId),

  createItem(
    tenantId: string,
    session: SessionContext,
    payload: { sku: string; name: string; category: InventoryItemMaster["category"]; uom: string; moduleTags: string[] },
  ) {
    ensureTenant(tenantId, session);
    const created: InventoryItemMaster = {
      id: createId("inv-itm"),
      tenantId,
      sku: payload.sku.toUpperCase(),
      name: payload.name,
      category: payload.category,
      uom: payload.uom.toUpperCase(),
      barcode: `BC-${payload.sku.toUpperCase()}`,
      qrCode: `QR-${payload.sku.toUpperCase()}`,
      moduleTags: payload.moduleTags.length ? payload.moduleTags : ["GENERAL"],
      active: true,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    repo.createItem(tenantId, created);
    audit.log({
      tenantId,
      actorId: session.userId,
      action: "inventory.item.create",
      entityType: "inventory_item",
      entityId: created.id,
      after: { sku: created.sku, category: created.category },
    });
    return created;
  },

  recordIntake(
    tenantId: string,
    session: SessionContext,
    payload: {
      itemId: string;
      locationCode: string;
      departmentCode?: string;
      quantity: number;
      unitCost: number;
      reason: string;
      referenceType?: string;
      referenceId?: string;
    },
  ) {
    ensureTenant(tenantId, session);
    const quantity = Math.max(payload.quantity, 0);
    const balance = upsertBalance(tenantId, {
      itemId: payload.itemId,
      locationCode: payload.locationCode.toUpperCase(),
      departmentCode: payload.departmentCode?.toUpperCase(),
      quantityDelta: quantity,
      unitCost: payload.unitCost,
    });
    const movement = createMovement(tenantId, session, {
      itemId: payload.itemId,
      type: "INTAKE",
      quantity,
      unitCost: payload.unitCost,
      reason: payload.reason,
      destinationLocationCode: payload.locationCode.toUpperCase(),
      destinationDepartmentCode: payload.departmentCode?.toUpperCase(),
      referenceType: payload.referenceType,
      referenceId: payload.referenceId,
    });
    createIntegrationEvent(
      tenantId,
      "FINANCE",
      "INVENTORY_INTAKE",
      movement.id,
      `${quantity} units received into ${balance.locationCode}.`,
    );
    return { movement, balance };
  },

  recordDeduction(
    tenantId: string,
    session: SessionContext,
    payload: {
      itemId: string;
      locationCode: string;
      departmentCode?: string;
      quantity: number;
      reason: string;
      referenceType?: string;
      referenceId?: string;
    },
  ) {
    ensureTenant(tenantId, session);
    const source = findBalance(
      tenantId,
      payload.itemId,
      payload.locationCode.toUpperCase(),
      payload.departmentCode?.toUpperCase(),
    );
    if (!source || source.quantity < payload.quantity) throw new Error("Insufficient stock.");
    const balance = upsertBalance(tenantId, {
      itemId: payload.itemId,
      locationCode: payload.locationCode.toUpperCase(),
      departmentCode: payload.departmentCode?.toUpperCase(),
      quantityDelta: -Math.max(payload.quantity, 0),
      unitCost: source.avgUnitCost,
    });
    const movement = createMovement(tenantId, session, {
      itemId: payload.itemId,
      type: "DEDUCTION",
      quantity: payload.quantity,
      unitCost: source.avgUnitCost,
      reason: payload.reason,
      sourceLocationCode: payload.locationCode.toUpperCase(),
      sourceDepartmentCode: payload.departmentCode?.toUpperCase(),
      referenceType: payload.referenceType,
      referenceId: payload.referenceId,
    });
    createIntegrationEvent(
      tenantId,
      "SALES",
      "INVENTORY_DEDUCTION",
      movement.id,
      `${payload.quantity} units consumed from ${payload.locationCode.toUpperCase()}.`,
    );
    return { movement, balance };
  },

  transferStock(
    tenantId: string,
    session: SessionContext,
    payload: {
      itemId: string;
      fromLocationCode: string;
      fromDepartmentCode?: string;
      toLocationCode: string;
      toDepartmentCode?: string;
      quantity: number;
      reason: string;
    },
  ) {
    ensureTenant(tenantId, session);
    const source = findBalance(
      tenantId,
      payload.itemId,
      payload.fromLocationCode.toUpperCase(),
      payload.fromDepartmentCode?.toUpperCase(),
    );
    if (!source || source.quantity < payload.quantity) throw new Error("Insufficient source stock.");

    const sourceBalance = upsertBalance(tenantId, {
      itemId: payload.itemId,
      locationCode: payload.fromLocationCode.toUpperCase(),
      departmentCode: payload.fromDepartmentCode?.toUpperCase(),
      quantityDelta: -Math.max(payload.quantity, 0),
      unitCost: source.avgUnitCost,
    });
    const destinationBalance = upsertBalance(tenantId, {
      itemId: payload.itemId,
      locationCode: payload.toLocationCode.toUpperCase(),
      departmentCode: payload.toDepartmentCode?.toUpperCase(),
      quantityDelta: Math.max(payload.quantity, 0),
      unitCost: source.avgUnitCost,
    });
    const outbound = createMovement(tenantId, session, {
      itemId: payload.itemId,
      type: "TRANSFER_OUT",
      quantity: payload.quantity,
      unitCost: source.avgUnitCost,
      reason: payload.reason,
      sourceLocationCode: payload.fromLocationCode.toUpperCase(),
      sourceDepartmentCode: payload.fromDepartmentCode?.toUpperCase(),
      destinationLocationCode: payload.toLocationCode.toUpperCase(),
      destinationDepartmentCode: payload.toDepartmentCode?.toUpperCase(),
    });
    const inbound = createMovement(tenantId, session, {
      itemId: payload.itemId,
      type: "TRANSFER_IN",
      quantity: payload.quantity,
      unitCost: source.avgUnitCost,
      reason: payload.reason,
      sourceLocationCode: payload.fromLocationCode.toUpperCase(),
      sourceDepartmentCode: payload.fromDepartmentCode?.toUpperCase(),
      destinationLocationCode: payload.toLocationCode.toUpperCase(),
      destinationDepartmentCode: payload.toDepartmentCode?.toUpperCase(),
    });
    createIntegrationEvent(
      tenantId,
      "PROCUREMENT",
      "INVENTORY_TRANSFER",
      outbound.id,
      `Transfer ${payload.quantity} units ${payload.fromLocationCode.toUpperCase()} -> ${payload.toLocationCode.toUpperCase()}.`,
    );
    return { sourceBalance, destinationBalance, outbound, inbound };
  },

  requestAdjustment(
    tenantId: string,
    session: SessionContext,
    payload: {
      itemId: string;
      locationCode: string;
      departmentCode?: string;
      requestedDelta: number;
      reason: string;
    },
  ): InventoryAdjustmentRequest {
    ensureTenant(tenantId, session);
    const created: InventoryAdjustmentRequest = {
      id: createId("inv-adj"),
      tenantId,
      itemId: payload.itemId,
      locationCode: payload.locationCode.toUpperCase(),
      departmentCode: payload.departmentCode?.toUpperCase(),
      requestedDelta: payload.requestedDelta,
      reason: payload.reason,
      status: "PENDING_APPROVAL",
      requestedBy: session.userId,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    repo.createAdjustment(tenantId, created);
    if (Math.abs(payload.requestedDelta) >= 20) {
      ensureAlert(
        tenantId,
        "ADJUSTMENT_REQUIRES_APPROVAL",
        created.id,
        `Adjustment ${created.id} requires approval due to high variance.`,
        "HIGH",
      );
    }
    return created;
  },

  approveAdjustment(tenantId: string, session: SessionContext, adjustmentId: string) {
    ensureTenant(tenantId, session);
    const adjustment = repo.listAdjustments(tenantId).find((item) => item.id === adjustmentId);
    if (!adjustment) throw new Error("Adjustment request not found.");
    if (adjustment.status !== "PENDING_APPROVAL") return adjustment;

    const current = findBalance(
      tenantId,
      adjustment.itemId,
      adjustment.locationCode,
      adjustment.departmentCode,
    );
    const unitCost = current?.avgUnitCost ?? 0;
    upsertBalance(tenantId, {
      itemId: adjustment.itemId,
      locationCode: adjustment.locationCode,
      departmentCode: adjustment.departmentCode,
      quantityDelta: adjustment.requestedDelta,
      unitCost,
    });
    createMovement(tenantId, session, {
      itemId: adjustment.itemId,
      type: adjustment.requestedDelta >= 0 ? "ADJUSTMENT_PLUS" : "ADJUSTMENT_MINUS",
      quantity: Math.abs(adjustment.requestedDelta),
      unitCost,
      reason: adjustment.reason,
      destinationLocationCode: adjustment.locationCode,
      destinationDepartmentCode: adjustment.departmentCode,
      referenceType: "ADJUSTMENT",
      referenceId: adjustment.id,
    });
    const updated = repo.updateAdjustment(tenantId, adjustment.id, {
      status: "APPROVED",
      approvedBy: session.userId,
      approvedAt: nowIso(),
      updatedAt: nowIso(),
    });
    if (!updated) throw new Error("Unable to approve adjustment.");
    return updated;
  },

  startAuditCycle(
    tenantId: string,
    session: SessionContext,
    payload: { locationCode: string; departmentCode?: string; scope: "LOCATION" | "DEPARTMENT" | "ITEM" },
  ) {
    ensureTenant(tenantId, session);
    const created: InventoryAuditCycle = {
      id: createId("inv-audit"),
      tenantId,
      locationCode: payload.locationCode.toUpperCase(),
      departmentCode: payload.departmentCode?.toUpperCase(),
      scope: payload.scope,
      status: "OPEN",
      openedBy: session.userId,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    repo.createAuditCycle(tenantId, created);
    return created;
  },

  closeAuditCycle(
    tenantId: string,
    session: SessionContext,
    auditCycleId: string,
    payload: { expectedValue: number; countedValue: number },
  ) {
    ensureTenant(tenantId, session);
    const cycle = repo.listAuditCycles(tenantId).find((item) => item.id === auditCycleId);
    if (!cycle) throw new Error("Audit cycle not found.");
    const varianceValue = payload.countedValue - payload.expectedValue;
    const updated = repo.updateAuditCycle(tenantId, cycle.id, {
      status: "COMPLETED",
      expectedValue: payload.expectedValue,
      countedValue: payload.countedValue,
      varianceValue,
      closedBy: session.userId,
      updatedAt: nowIso(),
    });
    if (!updated) throw new Error("Unable to close audit cycle.");
    createMovement(tenantId, session, {
      itemId: "AUDIT_SCOPE",
      type: "AUDIT_RECONCILIATION",
      quantity: Math.abs(varianceValue),
      unitCost: 1,
      reason: "Audit cycle reconciliation",
      destinationLocationCode: cycle.locationCode,
      destinationDepartmentCode: cycle.departmentCode,
      referenceType: "AUDIT_CYCLE",
      referenceId: cycle.id,
    });
    return updated;
  },

  setAlertStatus(
    tenantId: string,
    session: SessionContext,
    alertId: string,
    status: InventoryAlertStatus,
  ) {
    ensureTenant(tenantId, session);
    const updated = repo.updateAlert(tenantId, alertId, { status, updatedAt: nowIso() });
    if (!updated) throw new Error("Alert not found.");
    return updated;
  },

  runLowStockScan(tenantId: string, session: SessionContext) {
    ensureTenant(tenantId, session);
    repo.listBalances(tenantId).forEach((balance) => {
      if (balance.quantity <= balance.reorderPoint) {
        ensureAlert(
          tenantId,
          "LOW_STOCK",
          balance.id,
          `Stock below reorder point at ${balance.locationCode}/${balance.departmentCode ?? "GENERAL"}.`,
          balance.quantity <= balance.safetyStock ? "HIGH" : "MEDIUM",
        );
      }
    });
    return repo.listAlerts(tenantId);
  },

  runExpiryScan(tenantId: string, session: SessionContext) {
    ensureTenant(tenantId, session);
    const today = new Date().getTime();
    repo.listBalances(tenantId).forEach((balance) => {
      if (!balance.expiryDate) return;
      const expiry = new Date(balance.expiryDate).getTime();
      const days = Math.round((expiry - today) / (1000 * 60 * 60 * 24));
      if (days <= 14) {
        ensureAlert(
          tenantId,
          "EXPIRY_WARNING",
          balance.id,
          `Item nearing expiry in ${Math.max(days, 0)} days (${balance.locationCode}).`,
          days <= 3 ? "HIGH" : "MEDIUM",
        );
      }
    });
    return repo.listAlerts(tenantId);
  },

  listProcurementReceiptQueue(tenantId: string) {
    return procurementService
      .listGoodsReceiptSyncs(tenantId)
      .filter((item) => item.status === "PENDING_RECEIPT" || item.status === "MISMATCH_REPORTED");
  },

  processProcurementReceipt(
    tenantId: string,
    session: SessionContext,
    payload: {
      syncId: string;
      itemId: string;
      quantity: number;
      unitCost: number;
      locationCode: string;
      departmentCode?: string;
      mismatch: boolean;
      mismatchIssueCount?: number;
    },
  ) {
    ensureTenant(tenantId, session);
    if (payload.mismatch) {
      procurementService.updateGoodsReceiptSyncStatus(tenantId, session, payload.syncId, {
        status: "MISMATCH_REPORTED",
        issueCount: Math.max(payload.mismatchIssueCount ?? 1, 1),
        invoiceMismatch: true,
      });
      createIntegrationEvent(
        tenantId,
        "PROCUREMENT",
        "PROCUREMENT_RECEIPT_MISMATCH",
        payload.syncId,
        "Goods receipt mismatch reported by inventory.",
        "FAILED",
      );
      return { status: "MISMATCH_REPORTED" as const };
    }

    const intake = this.recordIntake(tenantId, session, {
      itemId: payload.itemId,
      locationCode: payload.locationCode,
      departmentCode: payload.departmentCode,
      quantity: payload.quantity,
      unitCost: payload.unitCost,
      reason: "Procurement receipt sync",
      referenceType: "PROCUREMENT_SYNC",
      referenceId: payload.syncId,
    });
    procurementService.updateGoodsReceiptSyncStatus(tenantId, session, payload.syncId, {
      status: "SYNCED",
      issueCount: 0,
      invoiceMismatch: false,
    });
    createIntegrationEvent(
      tenantId,
      "PROCUREMENT",
      "PROCUREMENT_RECEIPT_SYNCED",
      payload.syncId,
      "Goods receipt synced from Procurement to Inventory.",
    );
    return { status: "SYNCED" as const, intake };
  },

  getDashboard(tenantId: string): InventoryDashboardMetrics {
    const items = repo.listItems(tenantId);
    const balances = repo.listBalances(tenantId);
    const alerts = repo.listAlerts(tenantId);
    const pendingReceiptSyncs = this.listProcurementReceiptQueue(tenantId).filter(
      (item) => item.status === "PENDING_RECEIPT",
    ).length;
    const locationCount = new Set(balances.map((item) => item.locationCode)).size;
    const departmentCount = new Set(
      balances.map((item) => `${item.locationCode}-${item.departmentCode ?? "GENERAL"}`),
    ).size;
    return {
      totalItems: items.length,
      totalLocations: locationCount,
      totalDepartments: departmentCount,
      totalOnHandQty: balances.reduce((sum, item) => sum + item.quantity, 0),
      totalValuation: balances.reduce((sum, item) => sum + item.quantity * item.avgUnitCost, 0),
      lowStockCount: alerts.filter((item) => item.type === "LOW_STOCK" && item.status === "OPEN").length,
      expiryWarningCount: alerts.filter((item) => item.type === "EXPIRY_WARNING" && item.status === "OPEN").length,
      pendingAdjustments: repo
        .listAdjustments(tenantId)
        .filter((item) => item.status === "PENDING_APPROVAL").length,
      pendingReceiptSyncs,
    };
  },
};

