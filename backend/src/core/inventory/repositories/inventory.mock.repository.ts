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
export class InventoryMockRepository implements IInventoryRepository {
  private items: any[] = [];
  private balances: any[] = [];
  private movements: any[] = [];
  private adjustments: any[] = [];
  private alerts: any[] = [];
  private movementRequests: any[] = [];
  private agenticEvents: any[] = [];

  constructor() {
    const hanselTenant = "hansel-demo-tenant";
    const loc1 = "hansel-loc-1";
    const loc2 = "hansel-loc-2";

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

  async getDashboard(ctx: TenantContext): Promise<InventoryDashboard> {
    return {
      totalItems: this.items.length,
      totalLocations: 5,
      totalDepartments: 3,
      totalOnHandQty: 1000,
      totalValuation: 50000,
      lowStockCount: 2,
      expiryWarningCount: 0,
      pendingAdjustments: 1,
      pendingReceiptSyncs: 0,
    };
  }

  async getItems(ctx: TenantContext): Promise<InventoryItem[]> {
    return this.items.filter((i) => i.tenant_id === ctx.tenant_id);
  }

  async createItem(ctx: TenantContext, data: CreateItemDto): Promise<InventoryItem> {
    const item = { id: "item-" + Math.random(), tenant_id: ctx.tenant_id, ...data, created_at: new Date() };
    this.items.push(item);
    return item as any;
  }

  async getBalances(ctx: TenantContext): Promise<StockBalance[]> {
    return this.balances.filter((b) => b.tenant_id === ctx.tenant_id);
  }

  async getMovements(ctx: TenantContext): Promise<StockMovement[]> {
    return this.movements.filter((m) => m.tenant_id === ctx.tenant_id);
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
      fromLocationId: data.fromLocationId,
      toLocationId: data.toLocationId,
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

  async reserveStock(ctx: TenantContext, product_id: string, location_id: string, quantity: number, referenceId: string, referenceType: string, tx?: any): Promise<void> { return; }
  async releaseStock(ctx: TenantContext, product_id: string, location_id: string, quantity: number, referenceId: string, referenceType: string, tx?: any): Promise<void> { return; }
  async consumeFromReservation(ctx: TenantContext, product_id: string, location_id: string, quantity: number, referenceId: string, referenceType: string, tx?: any): Promise<void> { return; }
  async transferOut(ctx: TenantContext, product_id: string, fromLocationId: string, toLocationId: string, quantity: number, referenceId: string, referenceType: string, tx?: any): Promise<StockMovement> { return {} as any; }
  async transferIn(ctx: TenantContext, product_id: string, fromLocationId: string, toLocationId: string, quantity: number, referenceId: string, referenceType: string, tx?: any): Promise<StockMovement> { return {} as any; }
  async takeSnapshot(ctx: TenantContext, location_id?: string): Promise<void> { return; }

  async updateStockReserved(ctx: TenantContext, product_id: string, location_id: string, quantity: number, type: 'increment' | 'decrement', tx?: any): Promise<void> { return; }
  async updateStockInTransit(ctx: TenantContext, product_id: string, fromLocationId: string, toLocationId: string, quantity: number, type: 'increment' | 'decrement', tx?: any): Promise<void> { return; }
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
}
