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
  WarehouseBin,
  BinAssignment,
  InventoryIotEvent,
  AgenticEvent,
} from "@/core/types/inventory/inventory";

export const inventoryService = {
  async listItems(
    tenantId: string,
    session: SessionContext,
    location_id?: string,
    page: number = 1,
    limit: number = 30,
    search?: string,
    category_id?: string,
  ): Promise<InventoryItemMaster[]> {
    const params = new URLSearchParams();
    if (location_id) params.append("location_id", location_id);
    if (search) params.append("search", search);
    if (category_id && category_id !== "all") params.append("category_id", category_id);
    params.append("page", page.toString());
    params.append("limit", limit.toString());
    
    return apiRequest<InventoryItemMaster[]>(
      `/v1/inventory/items?${params.toString()}`,
      "GET",
      session,
    );
  },

  async lookupItemByBarcode(
    tenantId: string,
    session: SessionContext,
    barcode: string,
  ): Promise<InventoryItemMaster | null> {
    return apiRequest<InventoryItemMaster | null>(
      `/v1/inventory/items/lookup?barcode=${barcode}`,
      "GET",
      session,
    );
  },

  async listBalances(
    tenantId: string,
    session: SessionContext,
    location_id?: string,
    department_id?: string,
    page: number = 1,
    limit: number = 30,
    search?: string,
    category_id?: string,
  ): Promise<InventoryStockBalance[]> {
    const params = new URLSearchParams();
    if (location_id) params.append("location_id", location_id);
    if (department_id) params.append("department_id", department_id);
    if (search) params.append("search", search);
    if (category_id && category_id !== "all") params.append("category_id", category_id);
    params.append("page", page.toString());
    params.append("limit", limit.toString());
    
    return apiRequest<InventoryStockBalance[]>(
      `/v1/inventory/balances?${params.toString()}`,
      "GET",
      session,
    );
  },

  async listMovements(
    tenantId: string,
    session: SessionContext,
    item_id?: string,
  ): Promise<InventoryMovement[]> {
    const query = item_id ? `?item_id=${item_id}` : "";
    return apiRequest<InventoryMovement[]>(
      `/v1/inventory/movements${query}`,
      "GET",
      session,
    );
  },

  async listAdjustments(
    tenantId: string,
    session: SessionContext,
  ): Promise<InventoryAdjustmentRequest[]> {
    return apiRequest<InventoryAdjustmentRequest[]>(
      "/v1/inventory/adjustments",
      "GET",
      session,
    );
  },

  async listAuditCycles(
    tenantId: string,
    session: SessionContext,
  ): Promise<InventoryAuditCycle[]> {
    return apiRequest<InventoryAuditCycle[]>(
      "/v1/inventory/audit-cycles",
      "GET",
      session,
    );
  },

  async listAlerts(
    tenantId: string,
    session: SessionContext,
  ): Promise<InventoryAlert[]> {
    return apiRequest<InventoryAlert[]>("/v1/inventory/alerts", "GET", session);
  },

  async listIntegrationEvents(
    tenantId: string,
    session: SessionContext,
  ): Promise<InventoryIntegrationEvent[]> {
    return apiRequest<InventoryIntegrationEvent[]>(
      "/v1/inventory/integration-events",
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
      base_price?: number;
      description?: string;
      module_tags: string[];
      department_id?: string;
      status?: string;
    },
  ): Promise<InventoryItemMaster> {
    return apiRequest<InventoryItemMaster>(
      "/v1/inventory/items",
      "POST",
      session,
      payload,
    );
  },

  async recordIntake(
    tenantId: string,
    session: SessionContext,
    payload: {
      item_id: string;
      location_id: string;
      department_id?: string;
      quantity: number;
      unit_cost: number;
      reason: string;
      reference_type?: string;
      reference_id?: string;
    },
  ) {
    return apiRequest<any>("/v1/inventory/intake", "POST", session, payload);
  },

  async recordDeduction(
    tenantId: string,
    session: SessionContext,
    payload: {
      item_id: string;
      location_id: string;
      department_id?: string;
      quantity: number;
      reason: string;
      reference_type?: string;
      reference_id?: string;
    },
  ) {
    return apiRequest<any>("/v1/inventory/consume", "POST", session, payload);
  },

  async recordTransfer(
    tenantId: string,
    session: SessionContext,
    payload: {
      item_id: string;
      from_location_id: string;
      from_department_id?: string;
      to_location_id: string;
      to_department_id?: string;
      quantity: number;
      reason: string;
    },
  ) {
    return apiRequest<any>("/v1/inventory/transfer", "POST", session, payload);
  },

  async requestAdjustment(
    tenantId: string,
    session: SessionContext,
    payload: {
      item_id: string;
      location_id: string;
      department_id?: string;
      requested_delta: number;
      reason: string;
    },
  ) {
    return apiRequest<any>("/v1/inventory/adjustments", "POST", session, payload);
  },

  async approveAdjustment(
    tenantId: string,
    session: SessionContext,
    adjustment_id: string,
  ) {
    return apiRequest<any>(
      `/v1/inventory/adjustments/${adjustment_id}/approve`,
      "PUT",
      session,
      { approved_by: session.user_id },
    );
  },

  async updateAlertStatus(
    tenantId: string,
    session: SessionContext,
    alert_id: string,
    status: InventoryAlertStatus,
  ) {
    return apiRequest<any>(
      `/v1/inventory/alerts/${alert_id}/status`,
      "PUT",
      session,
      { status },
    );
  },

  async getDashboard(
    tenantId: string,
    session: SessionContext,
    location_id?: string,
  ): Promise<InventoryDashboardMetrics> {
    const query = location_id ? `?location_id=${location_id}` : "";
    return apiRequest<InventoryDashboardMetrics>(
      `/v1/inventory/dashboard${query}`,
      "GET",
      session,
    );
  },

  async startAuditCycle(
    tenantId: string,
    session: SessionContext,
    payload: {
      location_id: string;
      department_id?: string;
      scope: "LOCATION" | "DEPARTMENT" | "ITEM";
    },
  ) {
    return apiRequest<any>("/v1/inventory/audit-cycles", "POST", session, payload);
  },

  async initiateAudit(
    tenantId: string,
    session: SessionContext,
    payload: { location_id: string; department_id?: string; scope: string },
  ) {
    return apiRequest<any>("/v1/inventory/audit/initiate", "POST", session, payload);
  },

  async closeAuditCycle(
    tenantId: string,
    session: SessionContext,
    cycle_id: string,
    results: { 
      counted_value: number; 
      variance_value: number; 
      anomalies?: string[]; 
      newItems?: any[] 
    },
  ) {
    return apiRequest<any>(
      `/v1/inventory/audit-cycles/${cycle_id}`,
      "PUT",
      session,
      {
        ...results,
        status: "COMPLETED",
        closed_by: session.user_id,
      },
    );
  },

  async createAuditItem(
    tenantId: string,
    session: SessionContext,
    cycleId: string,
    payload: any,
  ) {
    return apiRequest<any>(
      `/v1/inventory/audit/${cycleId}/items`,
      "POST",
      session,
      payload,
    );
  },

  async runLowStockScan(tenantId: string, session: SessionContext) {
    return apiRequest<any>("/v1/inventory/scans/low-stock", "POST", session, {});
  },

  async runExpiryScan(tenantId: string, session: SessionContext) {
    return apiRequest<any>("/v1/inventory/scans/expiry", "POST", session, {});
  },

  async listProcurementReceiptQueue(tenantId: string, session: SessionContext) {
    return apiRequest<any[]>("/v1/inventory/procurement-receipts", "GET", session);
  },

  async processProcurementReceipt(
    tenantId: string,
    session: SessionContext,
    payload: {
      final_po_id: string;
      location_id: string;
      items: Array<{ sku: string; quantity: number; unit_cost?: number }>;
    },
  ) {
    return apiRequest<any>(
      `/v1/inventory/procurement-receipts/${payload.final_po_id}/process`,
      "POST",
      session,
      { location_id: payload.location_id, items: payload.items },
    );
  },

  async deleteItem(tenantId: string, session: SessionContext, item_id: string) {
    return apiRequest<any>(`/v1/inventory/items/${item_id}`, "DELETE", session);
  },

  async batchDeleteItems(
    tenantId: string,
    session: SessionContext,
    item_ids: string[],
  ) {
    return apiRequest<any>("/v1/inventory/items/batch-delete", "POST", session, {
      item_ids,
    });
  },

  async batchRecordIntake(
    tenantId: string,
    session: SessionContext,
    items: any[],
  ) {
    return apiRequest<any>("/v1/inventory/batch-intake", "POST", session, {
      items,
    });
  },

  async requestProcurement(
    tenantId: string,
    session: SessionContext,
    payload: any,
  ) {
    return apiRequest<any>(
      "/v1/inventory/procurement-request",
      "POST",
      session,
      payload,
    );
  },

  // --- Warehouse Module ---
  async getWarehouseBins(
    tenantId: string,
    session: SessionContext,
    location_id: string,
  ): Promise<WarehouseBin[]> {
    return apiRequest<WarehouseBin[]>(
      `/v1/warehouse/bins?location_id=${location_id}`,
      "GET",
      session,
    );
  },

  async createWarehouseBin(
    tenantId: string,
    session: SessionContext,
    payload: {
      location_id: string;
      code: string;
      zone?: string;
      aisle?: string;
      rack?: string;
      level?: string;
      capacity: number;
    },
  ): Promise<WarehouseBin> {
    return apiRequest<WarehouseBin>("/v1/warehouse/bins", "POST", session, payload);
  },

  async getBinStock(
    tenantId: string,
    session: SessionContext,
    bin_id: string,
  ): Promise<BinAssignment[]> {
    return apiRequest<BinAssignment[]>(
      `/v1/warehouse/bins/${bin_id}/stock`,
      "GET",
      session,
    );
  },

  async assignStockToBin(
    tenantId: string,
    session: SessionContext,
    bin_id: string,
    payload: { product_id: string; qty: number },
  ) {
    return apiRequest<any>(
      `/v1/warehouse/bins/${bin_id}/assign`,
      "POST",
      session,
      payload,
    );
  },

  // --- IoT / RFID ---
  async listIotEvents(
    tenantId: string,
    session: SessionContext,
  ): Promise<InventoryIotEvent[]> {
    return apiRequest<InventoryIotEvent[]>("/v1/inventory/iot/events", "GET", session);
  },

  async recordIotScan(
    tenantId: string,
    session: SessionContext,
    payload: {
      device_id: string;
      event_type: string;
      sku: string;
      location_id?: string;
      bin_id?: string;
      payload: any;
    },
  ) {
    const endpoint =
      payload.event_type === "RFID_SCAN"
        ? "/v1/inventory/iot/rfid-scan"
        : "/v1/inventory/iot/barcode-scan";
    return apiRequest<any>(endpoint, "POST", session, payload);
  },

  // --- Agentic Layer ---
  async listAgenticEvents(
    tenantId: string,
    session: SessionContext,
  ): Promise<AgenticEvent[]> {
    return apiRequest<AgenticEvent[]>("/v1/inventory/agentic/events", "GET", session);
  },

  // --- NEW Stock Transfer Lifecycle (Grading to Production) ---
  async listStockTransfers(
    tenantId: string,
    session: SessionContext,
  ): Promise<any[]> {
    return apiRequest<any[]>("/v1/inventory/stock-transfers", "GET", session);
  },

  async createStockTransfer(
    tenantId: string,
    session: SessionContext,
    payload: {
      item_id: string;
      from_location_id: string;
      to_location_id: string;
      quantity: number;
      reason: string;
    },
  ) {
    return apiRequest<any>("/v1/inventory/stock-transfers", "POST", session, payload);
  },

  async pickStockTransfer(
    tenantId: string,
    session: SessionContext,
    id: string,
  ) {
    return apiRequest<any>(`/v1/inventory/stock-transfers/${id}/pick`, "PUT", session, {});
  },

  async shipStockTransfer(
    tenantId: string,
    session: SessionContext,
    id: string,
    tracking_number: string,
  ) {
    return apiRequest<any>(`/v1/inventory/stock-transfers/${id}/ship`, "PUT", session, {
      tracking_number: tracking_number,
    });
  },

  async receiveStockTransfer(
    tenantId: string,
    session: SessionContext,
    id: string,
  ) {
    return apiRequest<any>(`/v1/inventory/stock-transfers/${id}/receive`, "PUT", session, {});
  },

  async uploadItemImage(
    tenantId: string,
    session: SessionContext,
    item_id: string,
    file: File,
  ) {
    const formData = new FormData();
    formData.append("file", file);

    const baseUrl = (window as any).VITE_API_URL || "http://localhost:3001/api";
    const response = await fetch(`${baseUrl}/v1/inventory/items/${item_id}/images`, {
      method: "POST",
      headers: {
        "x-tenant-id": tenantId,
        Authorization: `Bearer ${session.token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error("Failed to upload image");
    }

    return response.json();
  },

  async deleteItemImage(
    tenantId: string,
    session: SessionContext,
    item_id: string,
    image_id: string,
  ) {
    return apiRequest<any>(
      `/v1/inventory/items/${item_id}/images/${image_id}`,
      "DELETE",
      session,
    );
  },

  async setPrimaryItemImage(
    tenantId: string,
    session: SessionContext,
    item_id: string,
    image_id: string,
  ) {
    return apiRequest<any>(
      `/v1/inventory/items/${item_id}/images/${image_id}/primary`,
      "PUT",
      session,
      {},
    );
  },

  async listItemImages(
    tenantId: string,
    session: SessionContext,
    item_id: string,
  ) {
    return apiRequest<any[]>(
      `/v1/inventory/items/${item_id}/images`,
      "GET",
      session,
    );
  },

  // --- Category Management ---
  async listCategories(
    tenantId: string,
    session: SessionContext,
  ): Promise<any[]> {
    return apiRequest<any[]>("/v1/inventory/categories", "GET", session);
  },

  async createCategory(
    tenantId: string,
    session: SessionContext,
    payload: { name: string; parent_id?: string; icon?: string },
  ): Promise<any> {
    return apiRequest<any>("/v1/inventory/categories", "POST", session, payload);
  },

  async updateCategory(
    tenantId: string,
    session: SessionContext,
    id: string,
    payload: { name: string; parent_id?: string; icon?: string },
  ): Promise<any> {
    return apiRequest<any>(`/v1/inventory/categories/${id}`, "PUT", session, payload);
  },

  async deleteCategory(
    tenantId: string,
    session: SessionContext,
    id: string,
  ): Promise<void> {
    return apiRequest<void>(`/v1/inventory/categories/${id}`, "DELETE", session);
  },

  async updateItemCategory(
    tenantId: string,
    session: SessionContext,
    item_id: string,
    category_id: string,
  ): Promise<any> {
    return apiRequest<any>(
      `/v1/inventory/items/${item_id}/category`,
      "PATCH",
      session,
      { category_id },
    );
  },

  async updateItem(
    tenantId: string,
    session: SessionContext,
    itemId: string,
    payload: Partial<InventoryItemMaster>,
  ) {
    return apiRequest<InventoryItemMaster>(
      `/v1/inventory/items/${itemId}`,
      "PATCH",
      session,
      payload,
    );
  },

  async getSalesHistory(
    tenantId: string,
    session: SessionContext,
    itemId: string,
  ): Promise<any[]> {
    const res = await apiRequest<{ data: any[] }>(
      `/v1/inventory/items/${itemId}/sales-history`,
      "GET",
      session,
    );
    return res.data;
  },

  async getProcurementHistory(
    tenantId: string,
    session: SessionContext,
    itemId: string,
  ): Promise<any[]> {
    const res = await apiRequest<{ data: any[] }>(
      `/v1/inventory/items/${itemId}/procurement-history`,
      "GET",
      session,
    );
    return res.data;
  },
  
  async listLocations(
    tenantId: string,
    session: SessionContext,
  ): Promise<any[]> {
    const res = await apiRequest<{ success: boolean, data: any[] }>(
      "/v1/settings/locations",
      "GET",
      session,
    );
    return Array.isArray(res) ? res : res.data || [];
  },

  async listDepartments(
    tenantId: string,
    session: SessionContext,
  ): Promise<any[]> {
    const res = await apiRequest<{ success: boolean, data: any[] }>(
      "/v1/hr/departments",
      "GET",
      session,
    );
    return Array.isArray(res) ? res : res.data || [];
  },

  async listEmployees(
    tenantId: string,
    session: SessionContext,
  ): Promise<any[]> {
    const res = await apiRequest<{ success: boolean, data: any[] }>(
      "/v1/hr/employees",
      "GET",
      session,
    );
    return Array.isArray(res) ? res : res.data || [];
  },
};
