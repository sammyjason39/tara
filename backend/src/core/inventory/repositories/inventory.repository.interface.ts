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
  totalItems: number;
  totalLocations: number;
  totalDepartments: number;
  totalOnHandQty: number;
  totalValuation: number;
  lowStockCount: number;
  expiryWarningCount: number;
  pendingAdjustments: number;
  pendingReceiptSyncs: number;
};

export abstract class IInventoryRepository {
  abstract getDashboard(ctx: TenantContext): Promise<InventoryDashboard>;
  abstract getItems(ctx: TenantContext): Promise<InventoryItem[]>;
  abstract createItem(
    ctx: TenantContext,
    data: CreateItemDto,
  ): Promise<InventoryItem>;
  abstract getBalances(
    ctx: TenantContext,
    location_id?: string,
    departmentId?: string,
  ): Promise<StockBalance[]>;
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
    referenceId: string,
    referenceType: string,
    tx?: any
  ): Promise<void>;

  abstract releaseStock(
    ctx: TenantContext,
    product_id: string,
    location_id: string,
    quantity: number,
    referenceId: string,
    referenceType: string,
    tx?: any
  ): Promise<void>;

  abstract consumeFromReservation(
    ctx: TenantContext,
    product_id: string,
    location_id: string,
    quantity: number,
    referenceId: string,
    referenceType: string,
    tx?: any
  ): Promise<void>;

  abstract transferOut(
    ctx: TenantContext,
    product_id: string,
    fromLocationId: string,
    toLocationId: string,
    quantity: number,
    referenceId: string,
    referenceType: string,
    transferGroupId?: string,
    tx?: any
  ): Promise<StockMovement>;

  abstract transferIn(
    ctx: TenantContext,
    product_id: string,
    fromLocationId: string,
    toLocationId: string,
    quantity: number,
    referenceId: string,
    referenceType: string,
    transferGroupId?: string,
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
}

