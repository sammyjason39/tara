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
  abstract getDashboard(tenant_id: string): Promise<InventoryDashboard>;
  abstract getItems(tenant_id: string): Promise<InventoryItem[]>;
  abstract createItem(
    tenant_id: string,
    data: CreateItemDto,
  ): Promise<InventoryItem>;
  abstract getBalances(
    tenant_id: string,
    locationId?: string,
    departmentId?: string,
  ): Promise<StockBalance[]>;
  abstract getMovements(
    tenant_id: string,
    itemId?: string,
  ): Promise<StockMovement[]>;

  abstract intakeStock(
    tenant_id: string,
    data: StockIntakeDto,
    tx?: any
  ): Promise<StockMovement>;

  abstract transferStock(
    tenant_id: string,
    data: TransferStockDto,
  ): Promise<StockMovement[]>;
  abstract getAdjustments(tenant_id: string): Promise<InventoryAdjustment[]>;
  abstract createAdjustment(
    tenant_id: string,
    data: CreateAdjustmentDto,
    tx?: any
  ): Promise<InventoryAdjustment>;
  abstract approveAdjustment(
    tenant_id: string,
    adjustmentId: string,
    approvedBy: string,
  ): Promise<InventoryAdjustment>;
  abstract getAlerts(tenant_id: string): Promise<InventoryAlert[]>;
  abstract setAlertStatus(
    tenant_id: string,
    alertId: string,
    status: InventoryAlert["status"],
  ): Promise<InventoryAlert>;
  abstract getAuditCycles(tenant_id: string): Promise<any[]>;
  abstract createAuditCycle(tenant_id: string, data: any): Promise<any>;
  abstract updateAuditCycle(
    tenant_id: string,
    id: string,
    data: any,
  ): Promise<any>;
  abstract getIntegrationEvents(tenant_id: string): Promise<any[]>;
  abstract createIntegrationEvent(tenant_id: string, data: any): Promise<any>;
  abstract consumeStock(tenant_id: string, data: any, tx?: any): Promise<any>;
  abstract deleteItem(tenant_id: string, itemId: string): Promise<void>;
  abstract batchDeleteItems(
    tenant_id: string,
    itemIds: string[],
  ): Promise<void>;
  abstract batchIntakeStock(
    tenant_id: string,
    data: StockIntakeDto[],
  ): Promise<StockMovement[]>;
  abstract batchCreateItems(
    tenant_id: string,
    data: CreateItemDto[],
  ): Promise<InventoryItem[]>;
  abstract itemExistsBySku(tenant_id: string, sku: string): Promise<boolean>;
  abstract requestProcurement(tenant_id: string, data: any): Promise<any>;
  abstract createMovementRequest(
    tenant_id: string,
    data: CreateMovementRequestDto,
  ): Promise<MovementRequest>;
  abstract getNextSequence(
    tenant_id: string,
    category: string,
  ): Promise<number>;
  abstract updateItemStatus(
    tenant_id: string,
    itemId: string,
    status: string,
  ): Promise<InventoryItem>;
  abstract getPendingItems(tenant_id: string): Promise<InventoryItem[]>;
  abstract findHighestSkuByCategory(
    tenant_id: string,
    category: string,
  ): Promise<string | null>;



  abstract reserveStock(
    tenant_id: string,
    productId: string,
    locationId: string,
    quantity: number,
    referenceId: string,
    referenceType: string,
    tx?: any
  ): Promise<void>;

  abstract releaseStock(
    tenant_id: string,
    productId: string,
    locationId: string,
    quantity: number,
    referenceId: string,
    referenceType: string,
    tx?: any
  ): Promise<void>;

  abstract consumeFromReservation(
    tenant_id: string,
    productId: string,
    locationId: string,
    quantity: number,
    referenceId: string,
    referenceType: string,
    tx?: any
  ): Promise<void>;

  abstract transferOut(
    tenant_id: string,
    productId: string,
    fromLocationId: string,
    toLocationId: string,
    quantity: number,
    referenceId: string,
    referenceType: string,
    transferGroupId?: string,
    tx?: any
  ): Promise<StockMovement>;

  abstract transferIn(
    tenant_id: string,
    productId: string,
    fromLocationId: string,
    toLocationId: string,
    quantity: number,
    referenceId: string,
    referenceType: string,
    transferGroupId?: string,
    tx?: any
  ): Promise<StockMovement>;

  abstract takeSnapshot(
    tenant_id: string,
    locationId: string
  ): Promise<void>;

  abstract findProductByCode(
    tenant_id: string,
    code: string
  ): Promise<any | null>;

  // --- Agentic Layer ---
  abstract createAgenticEvent(
    tenant_id: string,
    data: CreateAgenticEventDto,
  ): Promise<AgenticEvent>;
}

