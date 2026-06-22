import { Injectable } from "@nestjs/common";
import {
  IInventoryRepository,
  InventoryDashboard,
  InventoryItem,
  StockBalance,
  StockMovement,
  InventoryAdjustment,
  InventoryAlert,
  MovementRequest,
  CreateItemDto,
  StockIntakeDto,
  TransferStockDto,
  CreateAdjustmentDto,
  CreateMovementRequestDto,
  CreateAgenticEventDto,
  AgenticEvent,
} from "./inventory.repository.interface";
import { TenantContext } from "../../../gateway/tenant-context.interface";

@Injectable()
export class InventoryMockRepository extends IInventoryRepository {
  private items: any[] = [];
  private categories: any[] = [];
  private balances: any[] = [];
  private movements: any[] = [];
  private adjustments: any[] = [];
  private alerts: any[] = [];
  private movementRequests: any[] = [];
  private agenticEvents: any[] = [];

  constructor() {
    super();
    const hanselTenant = "hansel-demo-tenant";
    const loc1 = "hansel-loc-1";
    const loc2 = "hansel-loc-2";

    this.categories = [
      { id: "cat-electronics-1", tenant_id: hanselTenant, name: "Electronics", is_anomaly_category: false },
      { id: "cat-software-1", tenant_id: hanselTenant, name: "Software", is_anomaly_category: false },
      { id: "cat-anomaly-123", tenant_id: hanselTenant, name: "Anomaly", is_anomaly_category: true },
    ];

    this.items = [
      { id: "hansel-prod-1", tenant_id: hanselTenant, sku: "ELEC-MBP-M3", name: "MacBook Pro 14 M3", category: "Electronics", barcode: "888123456789", status: "active", created_at: new Date() },
      { id: "hansel-prod-2", tenant_id: hanselTenant, sku: "ELEC-IPN-15P", name: "iPhone 15 Pro Max", category: "Electronics", barcode: "888987654321", status: "active", created_at: new Date() },
      { id: "hansel-prod-3", tenant_id: hanselTenant, sku: "ELEC-AIR-PRO", name: "AirPods Pro Gen 2", category: "Electronics", barcode: "111222333444", status: "active", created_at: new Date() },
      { id: "hansel-prod-4", tenant_id: hanselTenant, sku: "SOFT-OFFICE-365", name: "Office 365 Personal", category: "Software", barcode: "555666777888", status: "active", created_at: new Date() },
    ];

    this.balances = [
      // Product 1
      { id: "bal-1-1", tenant_id: hanselTenant, product_id: "hansel-prod-1", location_id: loc1, quantity: 10, available: 8, reserved: 2 },
      { id: "bal-1-2", tenant_id: hanselTenant, product_id: "hansel-prod-1", location_id: loc2, quantity: 5, available: 5, reserved: 0 },
      // Product 2
      { id: "bal-2-1", tenant_id: hanselTenant, product_id: "hansel-prod-2", location_id: loc1, quantity: 20, available: 20, reserved: 0 },
      { id: "bal-2-2", tenant_id: hanselTenant, product_id: "hansel-prod-2", location_id: loc2, quantity: 15, available: 10, reserved: 5 },
      // Product 3
      { id: "bal-3-1", tenant_id: hanselTenant, product_id: "hansel-prod-3", location_id: loc1, quantity: 50, available: 50, reserved: 0 },
      // Product 4
      { id: "bal-4-1", tenant_id: hanselTenant, product_id: "hansel-prod-4", location_id: loc1, quantity: 100, available: 100, reserved: 0 },
    ];

    this.alerts = [
        { id: "alt-1", tenant_id: hanselTenant, product_id: "hansel-prod-1", type: "LOW_STOCK", message: "Low stock alert for MacBook Pro", status: "active", severity: "HIGH", created_at: new Date() }
    ];
  }

  async getDashboard(ctx: TenantContext, location_id?: string): Promise<InventoryDashboard> {
    return {
      total_items: this.items.length,
      total_locations: 5,
      total_departments: 3,
      total_on_hand_qty: 1000,
      total_valuation: 50000,
      low_stock_count: 2,
      expiry_warning_count: 0,
      pending_adjustments: 1,
      pending_receipt_syncs: 0,
    };
  }

  async getItems(ctx: TenantContext, location_id?: string, page?: number, limit?: number, search?: string, category_id?: string, status?: string, is_anomaly?: boolean, sortBy?: "name" | "quantity" | "created_at", sortOrder?: "asc" | "desc"): Promise<InventoryItem[]> {
    let items = this.items.filter((i) => i.tenant_id === ctx.tenant_id);
    if (location_id) {
      const productIds = this.balances
        .filter((b) => b.location_id === location_id)
        .map((b) => b.product_id);
      items = items.filter((i) => productIds.includes(i.id));
    }
    if (search) {
      items = items.filter((i) => i.name.toLowerCase().includes(search.toLowerCase()) || i.sku.toLowerCase().includes(search.toLowerCase()));
    }
    if (category_id && category_id !== "all") {
      items = items.filter((i) => i.category_id === category_id);
    }
    if (status && status !== "all") {
      items = items.filter((i) => i.status === status);
    }
    if (is_anomaly !== undefined) {
      items = items.filter((i) => i.is_anomaly === is_anomaly);
    }
    if (page && limit) {
      const skip = (page - 1) * limit;
      return items.slice(skip, skip + limit);
    }
    return items;
  }

  async countItems(ctx: TenantContext, location_id?: string, search?: string, category_id?: string, is_anomaly?: boolean): Promise<number> {
    let items = this.items.filter((i) => i.tenant_id === ctx.tenant_id);
    if (location_id) {
      const productIds = this.balances
        .filter((b) => b.location_id === location_id)
        .map((b) => b.product_id);
      items = items.filter((i) => productIds.includes(i.id));
    }
    if (search) {
      items = items.filter((i) => i.name.toLowerCase().includes(search.toLowerCase()) || i.sku.toLowerCase().includes(search.toLowerCase()));
    }
    if (category_id && category_id !== "all") {
      items = items.filter((i) => i.category_id === category_id);
    }
    if (is_anomaly !== undefined) {
      items = items.filter((i) => i.is_anomaly === is_anomaly);
    }
    return items.length;
  }

  async createItem(ctx: TenantContext, data: CreateItemDto): Promise<InventoryItem> {
    const item = { id: "item-" + Math.random(), tenant_id: ctx.tenant_id, ...data, created_at: new Date() };
    this.items.push(item);
    return item as any;
  }

  async getBalances(ctx: TenantContext, location_id?: string, department_id?: string, page?: number, limit?: number, search?: string, category_id?: string): Promise<StockBalance[]> {
    let balances = this.balances.filter((b) => b.tenant_id === ctx.tenant_id);
    if (location_id) {
      balances = balances.filter((b) => b.location_id === location_id);
    }
    if (department_id) {
      balances = balances.filter((b) => b.department_id === department_id);
    }
    if (page && limit) {
      const skip = (page - 1) * limit;
      return balances.slice(skip, skip + limit);
    }
    return balances;
  }

  async countBalances(ctx: TenantContext, location_id?: string, department_id?: string, search?: string, category_id?: string): Promise<number> {
    let balances = this.balances.filter((b) => b.tenant_id === ctx.tenant_id);
    if (location_id) {
      balances = balances.filter((b) => b.location_id === location_id);
    }
    if (department_id) {
      balances = balances.filter((b) => b.department_id === department_id);
    }
    return balances.length;
  }

  async getMovements(ctx: TenantContext, item_id?: string, page: number = 1, limit: number = 50): Promise<StockMovement[]> {
    let filtered = this.movements.filter((m) => m.tenant_id === ctx.tenant_id);
    if (item_id) filtered = filtered.filter((m: any) => m.item_id === item_id);
    const skip = (page - 1) * limit;
    return filtered.slice(skip, skip + limit);
  }

  async countMovements(ctx: TenantContext, item_id?: string): Promise<number> {
    let filtered = this.movements.filter((m) => m.tenant_id === ctx.tenant_id);
    if (item_id) filtered = filtered.filter((m: any) => m.item_id === item_id);
    return filtered.length;
  }

  async intakeStock(ctx: TenantContext, data: StockIntakeDto, tx?: any): Promise<StockMovement> {
    const move = { id: "move-" + Math.random(), tenant_id: ctx.tenant_id, ...data, type: "RECEIPT", created_at: new Date() };
    this.movements.push(move);
    return move as any;
  }

  async transferStock(ctx: TenantContext, data: TransferStockDto): Promise<StockMovement[]> {
    const move = { id: "move-" + Math.random(), tenant_id: ctx.tenant_id, ...data, type: "TRANSFER", created_at: new Date() };
    this.movements.push(move);
    return [move as any];
  }

  async deleteItem(ctx: TenantContext, item_id: string): Promise<void> {
    this.items = this.items.filter((i) => i.id !== item_id);
  }

  async batchDeleteItems(ctx: TenantContext, itemIds: string[]): Promise<void> {
    this.items = this.items.filter((i) => !itemIds.includes(i.id));
  }

  async batchIntakeStock(ctx: TenantContext, data: StockIntakeDto[]): Promise<StockMovement[]> {
    const moves: StockMovement[] = [];
    for (const d of data) {
      moves.push(await this.intakeStock(ctx, d));
    }
    return moves;
  }

  async batchCreateItems(ctx: TenantContext, data: CreateItemDto[]): Promise<InventoryItem[]> {
    const items: InventoryItem[] = [];
    for (const d of data) {
      items.push(await this.createItem(ctx, d));
    }
    return items;
  }

  async itemExistsBySku(ctx: TenantContext, sku: string): Promise<boolean> {
    return this.items.some((i) => i.tenant_id === ctx.tenant_id && i.sku === sku);
  }

  async getAdjustments(ctx: TenantContext): Promise<InventoryAdjustment[]> {
    return this.adjustments.filter((a) => a.tenant_id === ctx.tenant_id);
  }

  async createAdjustment(ctx: TenantContext, data: CreateAdjustmentDto, tx?: any): Promise<InventoryAdjustment> {
    const adj = { id: "adj-" + Math.random(), tenant_id: ctx.tenant_id, ...data, status: "pending", created_at: new Date() };
    this.adjustments.push(adj);
    return adj as any;
  }

  async approveAdjustment(ctx: TenantContext, id: string, approvedBy: string): Promise<InventoryAdjustment> {
    const adj = this.adjustments.find((a) => a.id === id);
    if (adj) adj.status = "approved";
    return adj as any;
  }

  async getAlerts(ctx: TenantContext): Promise<InventoryAlert[]> {
    return this.alerts.filter((a) => a.tenant_id === ctx.tenant_id);
  }

  async setAlertStatus(ctx: TenantContext, alertId: string, status: InventoryAlert["status"]): Promise<InventoryAlert> {
    const alert = this.alerts.find((a) => a.id === alertId);
    if (alert) alert.status = status;
    return alert as any;
  }

  async updateAlertStatus(ctx: TenantContext, alertId: string, status: InventoryAlert["status"]): Promise<InventoryAlert> {
    return this.setAlertStatus(ctx, alertId, status);
  }

  async getAuditCycles(ctx: TenantContext): Promise<any[]> { return []; }
  async createAuditCycle(ctx: TenantContext, data: any): Promise<any> { return {}; }
  async updateAuditCycle(ctx: TenantContext, id: string, data: any): Promise<any> { return {}; }
  async getIntegrationEvents(ctx: TenantContext): Promise<any[]> { return []; }
  async createIntegrationEvent(ctx: TenantContext, data: any): Promise<any> { return {}; }
  async consumeStock(ctx: TenantContext, data: any, tx?: any): Promise<any> { return {}; }

  async createMovementRequest(ctx: TenantContext, data: CreateMovementRequestDto): Promise<MovementRequest> {
    const request: MovementRequest = {
      id: "mov-" + Math.random(),
      tenant_id: ctx.tenant_id,
      product_id: data.product_id,
      from_location_id: data.from_location_id,
      to_location_id: data.to_location_id,
      quantity: data.quantity,
      priority: (data.priority as any) || "MEDIUM",
      status: "PENDING",
      requested_by: "system",
      created_at: new Date(),
      updated_at: new Date(),
    };
    this.movementRequests.push(request);
    return request;
  }

  async getNextSequence(ctx: TenantContext, category: string): Promise<number> { return 1; }
  async updateItemStatus(ctx: TenantContext, item_id: string, status: string): Promise<InventoryItem> { return {} as any; }
  async getPendingItems(ctx: TenantContext): Promise<InventoryItem[]> { return []; }
  async findHighestSkuByCategory(ctx: TenantContext, category: string): Promise<string | null> { return null; }

  async reserveStock(ctx: TenantContext, product_id: string, location_id: string, quantity: number, reference_id: string, reference_type: string, tx?: any): Promise<void> { return; }
  async releaseStock(ctx: TenantContext, product_id: string, location_id: string, quantity: number, reference_id: string, reference_type: string, tx?: any): Promise<void> { return; }
  async consumeFromReservation(ctx: TenantContext, product_id: string, location_id: string, quantity: number, reference_id: string, reference_type: string, tx?: any): Promise<void> { return; }
  async transferOut(ctx: TenantContext, product_id: string, from_location_id: string, to_location_id: string, quantity: number, reference_id: string, reference_type: string, tx?: any): Promise<StockMovement> { return {} as any; }
  async transferIn(ctx: TenantContext, product_id: string, from_location_id: string, to_location_id: string, quantity: number, reference_id: string, reference_type: string, tx?: any): Promise<StockMovement> { return {} as any; }
  async takeSnapshot(ctx: TenantContext, location_id?: string): Promise<void> { return; }

  async findProductByCode(ctx: TenantContext, code: string): Promise<any | null> { return null; }

  async lookupByBarcode(ctx: TenantContext, barcode: string): Promise<any | null> {
    return this.items.find(i => i.tenant_id === ctx.tenant_id && i.barcode === barcode) || null;
  }

  async quickAdjust(ctx: TenantContext, item_id: string, location_id: string, delta: number, user_id: string): Promise<any> {
    return { id: 'lvl-' + Math.random(), on_hand: 100 + delta };
  }

  async getAgenticEvents(ctx: TenantContext): Promise<AgenticEvent[]> {
    return this.agenticEvents.filter((e) => e.tenant_id === ctx.tenant_id);
  }

  async createAgenticEvent(ctx: TenantContext, data: CreateAgenticEventDto): Promise<AgenticEvent> {
    const event = { id: "evt-" + Math.random(), tenant_id: ctx.tenant_id, ...data, created_at: new Date() };
    this.agenticEvents.push(event);
    return event as any;
  }

  async requestProcurement(ctx: TenantContext, data: any): Promise<any> { return {}; }

  // --- Stock Transfer Lifecycle ---
  async getTransfers(ctx: TenantContext): Promise<any[]> { return []; }
  async getTransferById(ctx: TenantContext, id: string): Promise<any | null> { return null; }
  async createStockTransfer(ctx: TenantContext, data: any, tx?: any): Promise<any> { return { id: "mock-id", ...data }; }
  async updateStockTransfer(ctx: TenantContext, id: string, data: any, tx?: any): Promise<any> { return { id, ...data }; }

  // --- Category Management ---
  async getProductCategories(ctx: TenantContext): Promise<any[]> { return []; }
  async createProductCategory(ctx: TenantContext, data: any): Promise<any> { return { id: "cat-" + Math.random(), ...data }; }
  async updateProductCategory(ctx: TenantContext, id: string, data: any): Promise<any> { return { id, ...data }; }
  async deleteProductCategory(ctx: TenantContext, id: string): Promise<void> { return; }
  async updateItemCategory(ctx: TenantContext, itemId: string, categoryId: string): Promise<any> {
    return { id: itemId, categoryId };
  }

  async updateItem(ctx: TenantContext, itemId: string, data: any): Promise<any> {
    return { id: itemId, ...data };
  }

  async getItemById(ctx: TenantContext, itemId: string): Promise<any> {
    return this.items.find(i => i.id === itemId && i.tenant_id === ctx.tenant_id) || null;
  }

  async getCategoryById(ctx: TenantContext, categoryId: string): Promise<any> {
    return this.categories.find(c => c.id === categoryId && c.tenant_id === ctx.tenant_id) || null;
  }

  async getSalesHistory(ctx: TenantContext, itemId: string): Promise<any[]> {
    return [];
  }

  async getProcurementHistory(ctx: TenantContext, itemId: string): Promise<any[]> {
    return [];
  }

  // --- Void Request & Approval Workflow Methods ---
  async createVoidRequest(
    ctx: TenantContext,
    data: {
      entity_type: string;
      entity_id: string;
      reason: string;
      requested_by: string;
      company_id?: string;
      status?: "PENDING" | "APPROVED" | "REJECTED";
      approved_by?: string;
      approved_at?: Date;
    }
  ): Promise<any> {
    const voidRequest = {
      id: `vr-${Date.now()}`,
      tenant_id: ctx.tenant_id,
      entity_type: data.entity_type,
      entity_id: data.entity_id,
      reason: data.reason,
      requested_by: data.requested_by,
      status: data.status || "PENDING",
      company_id: data.company_id,
      approved_by: data.status === "APPROVED" ? data.approved_by || data.requested_by : null,
      approved_at: data.status === "APPROVED" ? data.approved_at || new Date() : null,
      created_at: new Date(),
      updated_at: new Date(),
    };
    return voidRequest;
  }

  async approveVoidRequest(
    ctx: TenantContext,
    voidRequest_id: string,
    approver_id: string
  ): Promise<any> {
    return {
      id: voidRequest_id,
      status: "APPROVED",
      approved_by: approver_id,
      approved_at: new Date(),
      last_action: "APPROVED",
      updated_at: new Date(),
    };
  }

  async rejectVoidRequest(
    ctx: TenantContext,
    voidRequest_id: string,
    rejector_id: string
  ): Promise<any> {
    return {
      id: voidRequest_id,
      status: "REJECTED",
      rejected_by: rejector_id,
      rejected_at: new Date(),
      last_action: "REJECTED",
      updated_at: new Date(),
    };
  }

  async getVoidRequestById(ctx: TenantContext, voidRequest_id: string): Promise<any | null> {
    return null;
  }

  async getVoidRequestsByEntity(
    ctx: TenantContext,
    entity_type: string,
    entity_id: string
  ): Promise<any[]> {
    return [];
  }

  async listVoidRequests(
    ctx: TenantContext,
    filters?: {
      status?: string;
      entity_type?: string;
    }
  ): Promise<any[]> {
    return [];
  }
}
