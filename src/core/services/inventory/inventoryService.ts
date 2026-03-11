import { apiRequest } from "@/core/api/apiClient";
import type { SessionContext } from "@/core/security/session";
import type {
  InventoryAdjustmentRequest,
  InventoryAlert,
  InventoryAlertStatus,
  InventoryAuditCycle,
  InventoryDashboardMetrics,
  InventoryIntegrationEvent,
  InventoryItemMaster,
  InventoryMovement,
  InventoryStockBalance,
} from "@/core/types/inventory/inventory";

export const inventoryService = {
  async listItems(
    tenantId: string,
    session: SessionContext,
  ): Promise<InventoryItemMaster[]> {
    return apiRequest<InventoryItemMaster[]>(
      "/inventory/items",
      "GET",
      session,
    );
  },

  async listBalances(
    tenantId: string,
    session: SessionContext,
    locationId?: string,
    departmentId?: string,
  ): Promise<InventoryStockBalance[]> {
    const params = new URLSearchParams();
    if (locationId) params.append("locationId", locationId);
    if (departmentId) params.append("departmentId", departmentId);
    const query = params.toString() ? `?${params.toString()}` : "";
    return apiRequest<InventoryStockBalance[]>(
      `/inventory/balances${query}`,
      "GET",
      session,
    );
  },

  async listMovements(
    tenantId: string,
    session: SessionContext,
    itemId?: string,
  ): Promise<InventoryMovement[]> {
    const query = itemId ? `?itemId=${itemId}` : "";
    return apiRequest<InventoryMovement[]>(
      `/inventory/movements${query}`,
      "GET",
      session,
    );
  },

  async listAdjustments(
    tenantId: string,
    session: SessionContext,
  ): Promise<InventoryAdjustmentRequest[]> {
    return apiRequest<InventoryAdjustmentRequest[]>(
      "/inventory/adjustments",
      "GET",
      session,
    );
  },

  async listAuditCycles(
    tenantId: string,
    session: SessionContext,
  ): Promise<InventoryAuditCycle[]> {
    return apiRequest<InventoryAuditCycle[]>(
      "/inventory/audit-cycles",
      "GET",
      session,
    );
  },

  async listAlerts(
    tenantId: string,
    session: SessionContext,
  ): Promise<InventoryAlert[]> {
    return apiRequest<InventoryAlert[]>("/inventory/alerts", "GET", session);
  },

  async listIntegrationEvents(
    tenantId: string,
    session: SessionContext,
  ): Promise<InventoryIntegrationEvent[]> {
    return apiRequest<InventoryIntegrationEvent[]>(
      "/inventory/integration-events",
      "GET",
      session,
    );
  },

  async createItem(
    tenantId: string,
    session: SessionContext,
    payload: {
      sku: string;
      barcode?: string;
      name: string;
      category: InventoryItemMaster["category"];
      uom: string;
      basePrice?: number;
      description?: string;
      moduleTags: string[];
      departmentId?: string;
      status?: string;
    },
  ): Promise<InventoryItemMaster> {
    return apiRequest<InventoryItemMaster>(
      "/inventory/items",
      "POST",
      session,
      payload,
    );
  },

  async recordIntake(
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
    // Adapter to match backend DTO
    const dto = {
      ...payload,
      locationId: payload.locationCode,
      departmentId: payload.departmentCode,
    };
    return apiRequest<any>("/inventory/intake", "POST", session, dto);
  },

  async recordDeduction(
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
    // Adapter to match backend DTO
    const dto = {
      ...payload,
      locationId: payload.locationCode,
      departmentId: payload.departmentCode,
    };
    return apiRequest<any>("/inventory/consume", "POST", session, dto);
  },

  async recordTransfer(
    tenantId: string,
    session: SessionContext,
    payload: {
      itemId: string;
      fromLocationCode: string; // fromLocationId in DTO
      fromDepartmentCode?: string; // fromDepartmentId in DTO
      toLocationCode: string; // toLocationId in DTO
      toDepartmentCode?: string; // toDepartmentId in DTO
      quantity: number;
      reason: string;
    },
  ) {
    const dto = {
      itemId: payload.itemId,
      fromLocationId: payload.fromLocationCode,
      fromDepartmentId: payload.fromDepartmentCode,
      toLocationId: payload.toLocationCode,
      toDepartmentId: payload.toDepartmentCode,
      quantity: payload.quantity,
      reason: payload.reason,
    };
    return apiRequest<any>("/inventory/transfer", "POST", session, dto);
  },

  async requestAdjustment(
    tenantId: string,
    session: SessionContext,
    payload: {
      itemId: string;
      locationCode: string;
      departmentCode?: string;
      requestedDelta: number;
      reason: string;
    },
  ) {
    const dto = {
      itemId: payload.itemId,
      locationId: payload.locationCode,
      departmentId: payload.departmentCode,
      requestedDelta: payload.requestedDelta,
      reason: payload.reason,
    };
    return apiRequest<any>("/inventory/adjustments", "POST", session, dto);
  },

  async approveAdjustment(
    tenantId: string,
    session: SessionContext,
    adjustmentId: string,
  ) {
    return apiRequest<any>(
      `/inventory/adjustments/${adjustmentId}/approve`,
      "PUT",
      session,
      { approvedBy: session.userId },
    );
  },

  async updateAlertStatus(
    tenantId: string,
    session: SessionContext,
    alertId: string,
    status: InventoryAlertStatus,
  ) {
    return apiRequest<any>(
      `/inventory/alerts/${alertId}/status`,
      "PUT",
      session,
      { status },
    );
  },

  async getDashboard(
    tenantId: string,
    session: SessionContext,
  ): Promise<InventoryDashboardMetrics> {
    return apiRequest<InventoryDashboardMetrics>(
      "/inventory/dashboard",
      "GET",
      session,
    );
  },

  async startAuditCycle(
    tenantId: string,
    session: SessionContext,
    payload: {
      locationCode: string;
      departmentCode?: string;
      scope: "LOCATION" | "DEPARTMENT" | "ITEM";
    },
  ) {
    return apiRequest<any>("/inventory/audit-cycles", "POST", session, payload);
  },

  async closeAuditCycle(
    tenantId: string,
    session: SessionContext,
    cycleId: string,
    results: { countedValue: number; varianceValue: number },
  ) {
    return apiRequest<any>(
      `/inventory/audit-cycles/${cycleId}`,
      "PUT",
      session,
      {
        ...results,
        status: "COMPLETED",
        closedBy: session.userId,
      },
    );
  },

  async runLowStockScan(tenantId: string, session: SessionContext) {
    return apiRequest<any>("/inventory/scans/low-stock", "POST", session, {});
  },

  async runExpiryScan(tenantId: string, session: SessionContext) {
    return apiRequest<any>("/inventory/scans/expiry", "POST", session, {});
  },

  // Missing implementation for listProcurementReceiptQueue and processProcurementReceipt
  async listProcurementReceiptQueue(tenantId: string, session: SessionContext) {
    return apiRequest<any[]>("/inventory/procurement-receipts", "GET", session);
  },

  async processProcurementReceipt(
    tenantId: string,
    session: SessionContext,
    payload: {
      finalPoId: string;
      locationId: string;
      items: Array<{ sku: string; quantity: number; unitCost?: number }>;
    },
  ) {
    return apiRequest<any>(
      `/inventory/procurement-receipts/${payload.finalPoId}/process`,
      "POST",
      session,
      { locationId: payload.locationId, items: payload.items },
    );
  },

  async deleteItem(tenantId: string, session: SessionContext, itemId: string) {
    return apiRequest<any>(`/inventory/items/${itemId}`, "DELETE", session);
  },

  async batchDeleteItems(
    tenantId: string,
    session: SessionContext,
    itemIds: string[],
  ) {
    return apiRequest<any>("/inventory/items/batch-delete", "POST", session, {
      itemIds,
    });
  },

  async batchRecordIntake(
    tenantId: string,
    session: SessionContext,
    items: any[],
  ) {
    return apiRequest<any>("/inventory/batch-intake", "POST", session, {
      items,
    });
  },

  async requestProcurement(
    tenantId: string,
    session: SessionContext,
    payload: any,
  ) {
    return apiRequest<any>(
      "/inventory/procurement-request",
      "POST",
      session,
      payload,
    );
  },
};
