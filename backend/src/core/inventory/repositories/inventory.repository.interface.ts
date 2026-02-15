import { CreateAdjustmentDto } from '../dto/create-adjustment.dto';
import { CreateItemDto } from '../dto/create-item.dto';
import { StockIntakeDto } from '../dto/stock-intake.dto';
import { TransferStockDto } from '../dto/transfer-stock.dto';
import { InventoryAlert } from '../entities/inventory-alert.entity';
import { InventoryItem } from '../entities/inventory-item.entity';
import { StockAdjustment } from '../entities/stock-adjustment.entity';
import { StockBalance } from '../entities/stock-balance.entity';
import { StockMovement } from '../entities/stock-movement.entity';

export type InventoryDashboard = {
  totalItems: number;
  totalOnHand: number;
  totalValuation: number;
  lowStockAlerts: number;
  pendingAdjustments: number;
};

export abstract class IInventoryRepository {
  abstract getDashboard(tenantId: string): Promise<InventoryDashboard>;
  abstract getItems(tenantId: string): Promise<InventoryItem[]>;
  abstract createItem(tenantId: string, data: CreateItemDto): Promise<InventoryItem>;
  abstract getBalances(tenantId: string, locationId?: string): Promise<StockBalance[]>;
  abstract getMovements(tenantId: string, itemId?: string): Promise<StockMovement[]>;
  abstract intakeStock(tenantId: string, data: StockIntakeDto): Promise<StockMovement>;
  abstract transferStock(tenantId: string, data: TransferStockDto): Promise<StockMovement[]>;
  abstract getAdjustments(tenantId: string): Promise<StockAdjustment[]>;
  abstract createAdjustment(tenantId: string, data: CreateAdjustmentDto): Promise<StockAdjustment>;
  abstract approveAdjustment(
    tenantId: string,
    adjustmentId: string,
    approvedBy: string,
  ): Promise<StockAdjustment>;
  abstract getAlerts(tenantId: string): Promise<InventoryAlert[]>;
  abstract setAlertStatus(
    tenantId: string,
    alertId: string,
    status: InventoryAlert['status'],
  ): Promise<InventoryAlert>;
}

