import { CreateAdjustmentDto } from "../dto/create-adjustment.dto";
import { CreateItemDto } from "../dto/create-item.dto";
import { StockIntakeDto } from "../dto/stock-intake.dto";
import { TransferStockDto } from "../dto/transfer-stock.dto";
import { CreateMovementRequestDto } from "../dto/create-movement-request.dto";
import { CreateAgenticEventDto } from "../dto/create-agentic-event.dto";
import { InventoryAlert } from "../entities/inventory-alert.entity";
import { InventoryItem } from "../entities/inventory-item.entity";
import { InventoryAdjustment } from "../entities/inventory-adjustment.entity";
import { StockBalance } from "../entities/stock-balance.entity";
import { StockMovement } from "../entities/stock-movement.entity";
import { MovementRequest } from "../entities/movement-request.entity";
import { AgenticEvent } from "../entities/agentic-event.entity";
import { TenantContext } from "../../../gateway/tenant-context.interface";

export {
  CreateAdjustmentDto,
  CreateItemDto,
  StockIntakeDto,
  TransferStockDto,
  CreateMovementRequestDto,
  CreateAgenticEventDto,
  InventoryAlert,
  InventoryItem,
  InventoryAdjustment,
  StockBalance,
  StockMovement,
  MovementRequest,
  AgenticEvent,
};

export type InventoryDashboard = {
  total_items: number;
  total_locations: number;
  total_departments: number;
  total_on_hand_qty: number;
  total_valuation: number;
  low_stock_count: number;
  expiry_warning_count: number;
  pending_adjustments: number;
  pending_receipt_syncs: number;
};

export abstract class IInventoryRepository {
  abstract getDashboard(ctx: TenantContext, location_id?: string): Promise<InventoryDashboard>;
  abstract getItems(
    ctx: TenantContext,
    location_id?: string,
    page?: number,
    limit?: number,
    search?: string,
    category_id?: string,
    status?: string,
    sortBy?: "name" | "quantity" | "created_at",
    sortOrder?: "asc" | "desc",
  ): Promise<InventoryItem[]>;
  abstract countItems(
    ctx: TenantContext,
    location_id?: string,
    search?: string,
    category_id?: string,
  ): Promise<number>;
  abstract createItem(
    ctx: TenantContext,
    data: CreateItemDto,
  ): Promise<InventoryItem>;
  abstract getBalances(
    ctx: TenantContext,
    location_id?: string,
    department_id?: string,
    page?: number,
    limit?: number,
    search?: string,
    category_id?: string,
    item_id?: string
  ): Promise<StockBalance[]>;
  abstract countBalances(
    ctx: TenantContext,
    location_id?: string,
    department_id?: string,
    search?: string,
    category_id?: string,
    item_id?: string
  ): Promise<number>;
  abstract getMovements(
    ctx: TenantContext,
    item_id?: string,
  ): Promise<StockMovement[]>;

  abstract intakeStock(
    ctx: TenantContext,
    data: StockIntakeDto,
    tx?: any
  ): Promise<StockMovement>;

  abstract transferStock(
    ctx: TenantContext,
    data: TransferStockDto,
  ): Promise<StockMovement[]>;
  abstract getAdjustments(ctx: TenantContext): Promise<InventoryAdjustment[]>;
  abstract createAdjustment(
    ctx: TenantContext,
    data: CreateAdjustmentDto,
    tx?: any
  ): Promise<InventoryAdjustment>;
  abstract approveAdjustment(
    ctx: TenantContext,
    adjustmentId: string,
    approvedBy: string,
  ): Promise<InventoryAdjustment>;
  abstract getAlerts(ctx: TenantContext): Promise<InventoryAlert[]>;
  abstract setAlertStatus(
    ctx: TenantContext,
    alertId: string,
    status: InventoryAlert["status"],
  ): Promise<InventoryAlert>;
  abstract getAuditCycles(ctx: TenantContext): Promise<any[]>;
  abstract createAuditCycle(ctx: TenantContext, data: any): Promise<any>;
  abstract updateAuditCycle(
    ctx: TenantContext,
    id: string,
    data: any,
  ): Promise<any>;
  abstract getIntegrationEvents(ctx: TenantContext): Promise<any[]>;
  abstract createIntegrationEvent(ctx: TenantContext, data: any): Promise<any>;
  abstract consumeStock(ctx: TenantContext, data: any, tx?: any): Promise<any>;
  abstract deleteItem(ctx: TenantContext, item_id: string): Promise<void>;
  abstract batchDeleteItems(
    ctx: TenantContext,
    itemIds: string[],
  ): Promise<void>;
  abstract batchIntakeStock(
    ctx: TenantContext,
    data: StockIntakeDto[],
  ): Promise<StockMovement[]>;
  abstract batchCreateItems(
    ctx: TenantContext,
    data: CreateItemDto[],
  ): Promise<InventoryItem[]>;
  abstract itemExistsBySku(ctx: TenantContext, sku: string): Promise<boolean>;
  abstract requestProcurement(ctx: TenantContext, data: any): Promise<any>;
  abstract createMovementRequest(
    ctx: TenantContext,
    data: CreateMovementRequestDto,
  ): Promise<MovementRequest>;
  abstract getNextSequence(
    ctx: TenantContext,
    category: string,
  ): Promise<number>;
  abstract updateItemStatus(
    ctx: TenantContext,
    item_id: string,
    status: string,
  ): Promise<InventoryItem>;
  abstract getPendingItems(ctx: TenantContext): Promise<InventoryItem[]>;
  abstract findHighestSkuByCategory(
    ctx: TenantContext,
    category: string,
  ): Promise<string | null>;

  abstract reserveStock(
    ctx: TenantContext,
    product_id: string,
    location_id: string,
    quantity: number,
    reference_id: string,
    reference_type: string,
    tx?: any
  ): Promise<void>;

  abstract releaseStock(
    ctx: TenantContext,
    product_id: string,
    location_id: string,
    quantity: number,
    reference_id: string,
    reference_type: string,
    tx?: any
  ): Promise<void>;

  abstract consumeFromReservation(
    ctx: TenantContext,
    product_id: string,
    location_id: string,
    quantity: number,
    reference_id: string,
    reference_type: string,
    tx?: any
  ): Promise<void>;

  abstract transferOut(
    ctx: TenantContext,
    product_id: string,
    from_location_id: string,
    to_location_id: string,
    quantity: number,
    reference_id: string,
    reference_type: string,
    transfer_group_id?: string,
    tx?: any
  ): Promise<StockMovement>;

  abstract transferIn(
    ctx: TenantContext,
    product_id: string,
    from_location_id: string,
    to_location_id: string,
    quantity: number,
    reference_id: string,
    reference_type: string,
    transfer_group_id?: string,
    tx?: any
  ): Promise<StockMovement>;

  abstract takeSnapshot(
    ctx: TenantContext,
    location_id: string
  ): Promise<void>;

  abstract findProductByCode(
    ctx: TenantContext,
    code: string
  ): Promise<any | null>;

  abstract lookupByBarcode(
    ctx: TenantContext, 
    barcode: string
  ): Promise<any | null>;

  abstract quickAdjust(
    ctx: TenantContext,
    item_id: string,
    location_id: string,
    delta: number,
    user_id: string
  ): Promise<any>;

  // --- Stock Transfer Lifecycle ---
  abstract getTransfers(ctx: TenantContext): Promise<any[]>;
  abstract getTransferById(ctx: TenantContext, id: string): Promise<any | null>;
  abstract createStockTransfer(ctx: TenantContext, data: any, tx?: any): Promise<any>;
  abstract updateStockTransfer(ctx: TenantContext, id: string, data: any, tx?: any): Promise<any>;

  // --- Agentic Layer ---
  abstract getAgenticEvents(ctx: TenantContext): Promise<AgenticEvent[]>;
  abstract createAgenticEvent(
    ctx: TenantContext,
    data: CreateAgenticEventDto,
  ): Promise<AgenticEvent>;

  // --- Category Management ---
  abstract getProductCategories(ctx: TenantContext): Promise<any[]>;
  abstract createProductCategory(ctx: TenantContext, data: any): Promise<any>;
  abstract updateProductCategory(ctx: TenantContext, id: string, data: any): Promise<any>;
  abstract deleteProductCategory(ctx: TenantContext, id: string): Promise<void>;
  abstract updateItemCategory(ctx: TenantContext, itemId: string, categoryId: string): Promise<any>;
  abstract updateItem(ctx: TenantContext, itemId: string, data: any): Promise<any>;
  abstract getSalesHistory(ctx: TenantContext, itemId: string): Promise<any[]>;
  abstract getProcurementHistory(ctx: TenantContext, itemId: string): Promise<any[]>;
}
