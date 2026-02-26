import { Injectable } from "@nestjs/common";
import { CreateAdjustmentDto } from "./dto/create-adjustment.dto";
import { CreateItemDto } from "./dto/create-item.dto";
import { StockIntakeDto } from "./dto/stock-intake.dto";
import { TransferStockDto } from "./dto/transfer-stock.dto";
import { IInventoryRepository } from "./repositories/inventory.repository.interface";
import { AuditService } from "../../shared/audit/audit.service";

@Injectable()
export class InventoryService {
  constructor(
    private readonly repository: IInventoryRepository,
    private readonly auditService: AuditService,
  ) {}

  async getDashboard(tenantId: string) {
    return this.repository.getDashboard(tenantId);
  }

  async getItems(tenantId: string) {
    return this.repository.getItems(tenantId);
  }

  async createItem(tenantId: string, data: CreateItemDto, userId?: string) {
    const item = await this.repository.createItem(tenantId, data);
    if (userId) {
      await this.auditService.log({
        tenantId,
        userId,
        module: "inventory",
        action: "CREATE",
        entityType: "ITEM",
        entityId: item.id,
        metadata: { name: data.name, sku: data.sku },
      });
    }
    return item;
  }

  async getBalances(
    tenantId: string,
    locationId?: string,
    departmentId?: string,
  ) {
    return this.repository.getBalances(tenantId, locationId, departmentId);
  }

  async getMovements(tenantId: string, itemId?: string) {
    return this.repository.getMovements(tenantId, itemId);
  }

  async intakeStock(tenantId: string, data: StockIntakeDto, userId?: string) {
    const result = await this.repository.intakeStock(tenantId, data);
    if (userId) {
      await this.auditService.log({
        tenantId,
        userId,
        module: "inventory",
        action: "INTAKE",
        entityType: "STOCK",
        entityId: data.itemId,
        metadata: { quantity: data.quantity, locationId: data.locationId },
      });
    }
    return result;
  }

  async transferStock(
    tenantId: string,
    data: TransferStockDto,
    userId?: string,
  ) {
    const result = await this.repository.transferStock(tenantId, data);
    if (userId) {
      await this.auditService.log({
        tenantId,
        userId,
        module: "inventory",
        action: "TRANSFER",
        entityType: "STOCK",
        entityId: data.itemId,
        metadata: {
          quantity: data.quantity,
          fromLocation: data.fromLocationId,
          toLocation: data.toLocationId,
        },
      });
    }
    return result;
  }

  async getAdjustments(tenantId: string) {
    return this.repository.getAdjustments(tenantId);
  }

  async createAdjustment(
    tenantId: string,
    data: CreateAdjustmentDto,
    userId?: string,
  ) {
    const adjustment = await this.repository.createAdjustment(tenantId, data);
    if (userId) {
      await this.auditService.log({
        tenantId,
        userId,
        module: "inventory",
        action: "ADJUST_CREATE",
        entityType: "ADJUSTMENT",
        entityId: (adjustment as any).id,
        metadata: {
          itemId: data.itemId,
          delta: data.requestedDelta,
          reason: data.reason,
        },
      });
    }
    return adjustment;
  }

  async approveAdjustment(
    tenantId: string,
    adjustmentId: string,
    approvedBy: string,
  ) {
    return this.repository.approveAdjustment(
      tenantId,
      adjustmentId,
      approvedBy,
    );
  }

  async getAlerts(tenantId: string) {
    return this.repository.getAlerts(tenantId);
  }

  async setAlertStatus(
    tenantId: string,
    alertId: string,
    status: "open" | "acknowledged" | "resolved",
  ) {
    return this.repository.setAlertStatus(tenantId, alertId, status);
  }

  async getAuditCycles(tenantId: string) {
    return this.repository.getAuditCycles(tenantId);
  }

  async createAuditCycle(tenantId: string, data: any) {
    return this.repository.createAuditCycle(tenantId, data);
  }

  async updateAuditCycle(tenantId: string, id: string, data: any) {
    return this.repository.updateAuditCycle(tenantId, id, data);
  }

  async getIntegrationEvents(tenantId: string) {
    return this.repository.getIntegrationEvents(tenantId);
  }

  async createIntegrationEvent(tenantId: string, data: any) {
    return this.repository.createIntegrationEvent(tenantId, data);
  }

  async runLowStockScan(tenantId: string) {
    const balances = await this.repository.getBalances(tenantId);
    // Placeholder logic: just return scanned count for now as per mock requirement speed
    return {
      scanned: balances.length,
      lowStockFound: balances.filter((b) => b.quantity <= 50).length,
    };
  }

  async runExpiryScan(tenantId: string) {
    return { scanned: 0, expiryFound: 0 };
  }

  async consumeStock(tenantId: string, data: any) {
    return this.repository.consumeStock(tenantId, data);
  }

  async deleteItem(tenantId: string, itemId: string, userId?: string) {
    const result = await this.repository.deleteItem(tenantId, itemId);
    if (userId) {
      await this.auditService.log({
        tenantId,
        userId,
        module: "inventory",
        action: "DELETE",
        entityType: "ITEM",
        entityId: itemId,
      });
    }
    return result;
  }

  async batchDeleteItems(tenantId: string, itemIds: string[], userId?: string) {
    const result = await this.repository.batchDeleteItems(tenantId, itemIds);
    if (userId) {
      await this.auditService.log({
        tenantId,
        userId,
        module: "inventory",
        action: "BATCH_DELETE",
        entityType: "ITEM",
        entityId: "batch",
        metadata: { count: itemIds.length },
      });
    }
    return result;
  }

  async batchIntakeStock(
    tenantId: string,
    data: StockIntakeDto[],
    userId?: string,
  ) {
    const result = await this.repository.batchIntakeStock(tenantId, data);
    if (userId) {
      await this.auditService.log({
        tenantId,
        userId,
        module: "inventory",
        action: "BATCH_INTAKE",
        entityType: "STOCK",
        entityId: "batch",
        metadata: { count: data.length },
      });
    }
    return result;
  }

  async requestProcurement(tenantId: string, data: any) {
    return this.repository.requestProcurement(tenantId, data);
  }

  async batchCreateItems(
    tenantId: string,
    data: CreateItemDto[],
    userId?: string,
  ) {
    const items = await this.repository.batchCreateItems(tenantId, data);
    if (userId) {
      await this.auditService.log({
        tenantId,
        userId,
        module: "inventory",
        action: "BATCH_CREATE",
        entityType: "ITEM",
        entityId: "batch",
        metadata: { count: data.length },
      });
    }
    return items;
  }
}
