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

@Injectable()
export class InventoryMockRepository implements IInventoryRepository {
  private items: any[] = [];
  private balances: any[] = [];
  private movements: any[] = [];
  private adjustments: any[] = [];
  private alerts: any[] = [];
  private movementRequests: any[] = [];
  private agenticEvents: any[] = [];

  async getDashboard(tenant_id: string): Promise<InventoryDashboard> {
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

  async getItems(tenant_id: string): Promise<InventoryItem[]> {
    return this.items.filter((i) => i.tenant_id === tenant_id);
  }

  async createItem(tenant_id: string, data: CreateItemDto): Promise<InventoryItem> {
    const item = { id: "item-" + Math.random(), tenant_id, ...data, createdAt: new Date() };
    this.items.push(item);
    return item as any;
  }

  async getBalances(tenant_id: string): Promise<StockBalance[]> {
    return this.balances.filter((b) => b.tenant_id === tenant_id);
  }

  async getMovements(tenant_id: string): Promise<StockMovement[]> {
    return this.movements.filter((m) => m.tenant_id === tenant_id);
  }

  async intakeStock(tenant_id: string, data: StockIntakeDto, tx?: any): Promise<StockMovement> {
    const move = { id: "move-" + Math.random(), tenant_id, ...data, type: "RECEIPT", createdAt: new Date() };
    this.movements.push(move);
    return move as any;
  }

  async transferStock(tenant_id: string, data: TransferStockDto): Promise<StockMovement[]> {
    const move = { id: "move-" + Math.random(), tenant_id, ...data, type: "TRANSFER", createdAt: new Date() };
    this.movements.push(move);
    return [move as any];
  }

  async deleteItem(tenant_id: string, itemId: string): Promise<void> {
    this.items = this.items.filter((i) => i.id !== itemId);
  }

  async batchDeleteItems(tenant_id: string, itemIds: string[]): Promise<void> {
    this.items = this.items.filter((i) => !itemIds.includes(i.id));
  }

  async batchIntakeStock(tenant_id: string, data: StockIntakeDto[]): Promise<StockMovement[]> {
    const moves: StockMovement[] = [];
    for (const d of data) {
      moves.push(await this.intakeStock(tenant_id, d));
    }
    return moves;
  }

  async batchCreateItems(tenant_id: string, data: CreateItemDto[]): Promise<InventoryItem[]> {
    const items: InventoryItem[] = [];
    for (const d of data) {
      items.push(await this.createItem(tenant_id, d));
    }
    return items;
  }

  async itemExistsBySku(tenant_id: string, sku: string): Promise<boolean> {
    return this.items.some((i) => i.tenant_id === tenant_id && i.sku === sku);
  }

  async getAdjustments(tenant_id: string): Promise<InventoryAdjustment[]> {
    return this.adjustments.filter((a) => a.tenant_id === tenant_id);
  }

  async createAdjustment(tenant_id: string, data: CreateAdjustmentDto, tx?: any): Promise<InventoryAdjustment> {
    const adj = { id: "adj-" + Math.random(), tenant_id, ...data, status: "pending", createdAt: new Date() };
    this.adjustments.push(adj);
    return adj as any;
  }

  async approveAdjustment(tenant_id: string, id: string, approvedBy: string): Promise<InventoryAdjustment> {
    const adj = this.adjustments.find((a) => a.id === id);
    if (adj) adj.status = "approved";
    return adj as any;
  }

  async getAlerts(tenant_id: string): Promise<InventoryAlert[]> {
    return this.alerts.filter((a) => a.tenant_id === tenant_id);
  }

  async setAlertStatus(tenant_id: string, alertId: string, status: InventoryAlert["status"]): Promise<InventoryAlert> {
    const alert = this.alerts.find((a) => a.id === alertId);
    if (alert) alert.status = status;
    return alert as any;
  }

  async updateAlertStatus(tenant_id: string, alertId: string, status: InventoryAlert["status"]): Promise<InventoryAlert> {
    return this.setAlertStatus(tenant_id, alertId, status);
  }

  async getAuditCycles(tenant_id: string): Promise<any[]> { return []; }
  async createAuditCycle(tenant_id: string, data: any): Promise<any> { return {}; }
  async updateAuditCycle(tenant_id: string, id: string, data: any): Promise<any> { return {}; }
  async getIntegrationEvents(tenant_id: string): Promise<any[]> { return []; }
  async createIntegrationEvent(tenant_id: string, data: any): Promise<any> { return {}; }
  async consumeStock(tenant_id: string, data: any, tx?: any): Promise<any> { return {}; }

  async createMovementRequest(tenant_id: string, data: CreateMovementRequestDto): Promise<MovementRequest> {
    const request: MovementRequest = {
      id: "mov-" + Math.random(),
      tenant_id: tenant_id,
      productId: data.productId,
      fromLocationId: data.fromLocationId,
      toLocationId: data.toLocationId,
      quantity: data.quantity,
      priority: (data.priority as any) || "MEDIUM",
      status: "PENDING",
      requestedBy: "system",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.movementRequests.push(request);
    return request;
  }

  async getNextSequence(tenant_id: string, category: string): Promise<number> { return 1; }
  async updateItemStatus(tenant_id: string, itemId: string, status: string): Promise<InventoryItem> { return {} as any; }
  async getPendingItems(tenant_id: string): Promise<InventoryItem[]> { return []; }
  async findHighestSkuByCategory(tenant_id: string, category: string): Promise<string | null> { return null; }

  async reserveStock(tenant_id: string, productId: string, locationId: string, quantity: number, referenceId: string, referenceType: string, tx?: any): Promise<void> { return; }
  async releaseStock(tenant_id: string, productId: string, locationId: string, quantity: number, referenceId: string, referenceType: string, tx?: any): Promise<void> { return; }
  async consumeFromReservation(tenant_id: string, productId: string, locationId: string, quantity: number, referenceId: string, referenceType: string, tx?: any): Promise<void> { return; }
  async transferOut(tenant_id: string, productId: string, fromLocationId: string, toLocationId: string, quantity: number, referenceId: string, referenceType: string, tx?: any): Promise<StockMovement> { return {} as any; }
  async transferIn(tenant_id: string, productId: string, fromLocationId: string, toLocationId: string, quantity: number, referenceId: string, referenceType: string, tx?: any): Promise<StockMovement> { return {} as any; }
  async takeSnapshot(tenant_id: string, locationId?: string): Promise<void> { return; }

  async updateStockReserved(tenant_id: string, productId: string, locationId: string, quantity: number, type: 'increment' | 'decrement', tx?: any): Promise<void> { return; }
  async updateStockInTransit(tenant_id: string, productId: string, fromLocationId: string, toLocationId: string, quantity: number, type: 'increment' | 'decrement', tx?: any): Promise<void> { return; }
  async findProductByCode(tenant_id: string, code: string): Promise<any | null> { return null; }

  async createAgenticEvent(tenant_id: string, data: CreateAgenticEventDto): Promise<AgenticEvent> {
    const event = { id: "evt-" + Math.random(), tenant_id, ...data, createdAt: new Date() };
    this.agenticEvents.push(event);
    return event as any;
  }

  async requestProcurement(tenant_id: string, data: any): Promise<any> { return {}; }
}
