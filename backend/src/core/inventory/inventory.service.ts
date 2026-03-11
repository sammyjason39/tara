import { Injectable } from "@nestjs/common";
import { CreateAdjustmentDto } from "./dto/create-adjustment.dto";
import { CreateItemDto } from "./dto/create-item.dto";
import { StockIntakeDto } from "./dto/stock-intake.dto";
import { TransferStockDto } from "./dto/transfer-stock.dto";
import { CreateMovementRequestDto } from "./dto/create-movement-request.dto";
import { IInventoryRepository } from "./repositories/inventory.repository.interface";
import { SkuGeneratorService } from "./sku-generator.service";
import { AuditService } from "../../shared/audit/audit.service";
import { PrismaService } from "../../persistence/prisma.service";

@Injectable()
export class InventoryService {
  constructor(
    private readonly repository: IInventoryRepository,
    private readonly skuGenerator: SkuGeneratorService,
    private readonly auditService: AuditService,
    private readonly prisma: PrismaService,
  ) {}

  async getDashboard(tenant_id: string) {
    return this.repository.getDashboard(tenant_id);
  }

  async getItems(tenant_id: string) {
    return this.repository.getItems(tenant_id);
  }

  async createItem(tenant_id: string, data: CreateItemDto, userId?: string) {
    // Phase 1: Auto-generate SKU if missing or empty
    if (!data.sku || data.sku.trim() === "") {
      data.sku = await this.skuGenerator.generateSku(tenant_id, data.category);
    }

    // Always ensure a barcode exists (tightly coupled)
    if (!data.barcode || data.barcode.trim() === "") {
      data.barcode = this.skuGenerator.generateBarcode(tenant_id, data.sku);
    }

    // Default to pending for HOD approval as per user requirement, but allow override if explicitly set
    const itemData = {
      ...data,
      status: data.status || "pending",
    };

    const item = await this.repository.createItem(tenant_id, itemData);
    if (userId) {
      await this.auditService.log({
        tenantId: tenant_id,
        userId,
        module: "inventory",
        action: "CREATE_PENDING",
        entityType: "ITEM",
        entityId: item.id,
        metadata: { name: data.name, sku: data.sku },
      });
    }
    return item;
  }

  async getBalances(
    tenant_id: string,
    locationId?: string,
    departmentId?: string,
  ) {
    return this.repository.getBalances(tenant_id, locationId, departmentId);
  }

  async getMovements(tenant_id: string, itemId?: string) {
    return this.repository.getMovements(tenant_id, itemId);
  }

  async intakeStock(tenant_id: string, data: StockIntakeDto, userId?: string) {
    const result = await this.repository.intakeStock(tenant_id, data);
    if (userId) {
      await this.auditService.log({
        tenantId: tenant_id,
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

  async consumeStock(tenant_id: string, data: any, userId?: string) {
    const result = await this.repository.consumeStock(tenant_id, data);
    if (userId) {
      await this.auditService.log({
        tenantId: tenant_id,
        userId,
        module: "inventory",
        action: "CONSUME",
        entityType: "STOCK",
        entityId: data.itemId,
        metadata: { quantity: data.quantity, locationId: data.locationId },
      });
    }
    return result;
  }

  async transferStock(
    tenant_id: string,
    data: TransferStockDto,
    userId?: string,
  ) {
    const result = await this.repository.transferStock(tenant_id, data);
    if (userId) {
      await this.auditService.log({
        tenantId: tenant_id,
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

  async getAdjustments(tenant_id: string) {
    return this.repository.getAdjustments(tenant_id);
  }

  async createAdjustment(
    tenant_id: string,
    data: CreateAdjustmentDto,
    userId?: string,
  ) {
    const adjustment = await this.repository.createAdjustment(tenant_id, data);
    if (userId) {
      await this.auditService.log({
        tenantId: tenant_id,
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
    tenant_id: string,
    adjustmentId: string,
    approvedBy: string,
  ) {
    return this.repository.approveAdjustment(
      tenant_id,
      adjustmentId,
      approvedBy,
    );
  }

  async getAlerts(tenant_id: string) {
    return this.repository.getAlerts(tenant_id);
  }

  async setAlertStatus(
    tenant_id: string,
    alertId: string,
    status: "open" | "acknowledged" | "resolved",
  ) {
    return this.repository.setAlertStatus(tenant_id, alertId, status);
  }

  async getAuditCycles(tenant_id: string) {
    return this.repository.getAuditCycles(tenant_id);
  }

  async createAuditCycle(tenant_id: string, data: any) {
    return this.repository.createAuditCycle(tenant_id, data);
  }

  async updateAuditCycle(tenant_id: string, id: string, data: any) {
    return this.repository.updateAuditCycle(tenant_id, id, data);
  }

  async getIntegrationEvents(tenant_id: string) {
    return this.repository.getIntegrationEvents(tenant_id);
  }

  async createIntegrationEvent(tenant_id: string, data: any) {
    return this.repository.createIntegrationEvent(tenant_id, data);
  }

  async runLowStockScan(tenant_id: string) {
    // Query all stock levels and flag those at/below their minBuffer threshold
    const all = await this.prisma.stockLevel.findMany({
      where: { tenantId: tenant_id },
    });
    const low = all.filter((s) => s.onHand <= s.minBuffer);

    // Create/upsert InventoryAlert for each low stock level found
    let created = 0;
    for (const level of low) {
      const existing = await this.prisma.inventoryAlert.findFirst({
        where: {
          tenantId: tenant_id,
          entityId: level.productId,
          type: "LOW_STOCK",
          status: "OPEN",
        },
      });
      if (!existing) {
        await this.prisma.inventoryAlert.create({
          data: {
            tenantId: tenant_id,
            type: "LOW_STOCK",
            severity: level.onHand === 0 ? "HIGH" : "MEDIUM",
            status: "OPEN",
            entityId: level.productId,
            message: `Stock level for product ${level.productId} at location ${level.locationId} is at ${level.onHand} (threshold: ${level.minBuffer})`,
          },
        });
        created++;
      }
    }

    return {
      scanned: all.length,
      lowStockFound: low.length,
      alertsCreated: created,
    };
  }

  async runExpiryScan(tenant_id: string) {
    // Return count of currently open expiry-related alerts from DB
    const openExpiryAlerts = await this.prisma.inventoryAlert.count({
      where: {
        tenantId: tenant_id,
        type: "EXPIRY_WARNING",
        status: "OPEN",
      },
    });
    return { scanned: 0, expiryFound: openExpiryAlerts };
  }

  async deleteItem(tenant_id: string, itemId: string, userId?: string) {
    const result = await this.repository.deleteItem(tenant_id, itemId);
    if (userId) {
      await this.auditService.log({
        tenantId: tenant_id,
        userId,
        module: "inventory",
        action: "DELETE",
        entityType: "ITEM",
        entityId: itemId,
      });
    }
    return result;
  }

  async batchDeleteItems(
    tenant_id: string,
    itemIds: string[],
    userId?: string,
  ) {
    const result = await this.repository.batchDeleteItems(tenant_id, itemIds);
    if (userId) {
      await this.auditService.log({
        tenantId: tenant_id,
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
    tenant_id: string,
    data: StockIntakeDto[],
    userId?: string,
  ) {
    const result = await this.repository.batchIntakeStock(tenant_id, data);
    if (userId) {
      await this.auditService.log({
        tenantId: tenant_id,
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

  async requestProcurement(tenant_id: string, data: any) {
    return this.repository.requestProcurement(tenant_id, data);
  }

  async batchCreateItems(
    tenant_id: string,
    data: CreateItemDto[],
    userId?: string,
  ) {
    // Phase 1: Process each item for auto-generation
    for (const itemData of data) {
      if (!itemData.sku || itemData.sku.trim() === "") {
        itemData.sku = await this.skuGenerator.generateSku(
          tenant_id,
          itemData.category,
        );
      }
      if (!itemData.barcode || itemData.barcode.trim() === "") {
        itemData.barcode = this.skuGenerator.generateBarcode(
          tenant_id,
          itemData.sku,
        );
      }
    }

    const items = await this.repository.batchCreateItems(
      tenant_id,
      data.map((d) => ({ ...d, status: "pending" })),
    );
    if (userId) {
      await this.auditService.log({
        tenantId: tenant_id,
        userId,
        module: "inventory",
        action: "BATCH_CREATE_PENDING",
        entityType: "ITEM",
        entityId: "batch",
        metadata: { count: data.length },
      });
    }
    return items;
  }

  async getPendingItems(tenant_id: string) {
    return this.repository.getPendingItems(tenant_id);
  }

  async approveItem(tenant_id: string, itemId: string, userId: string) {
    const item = await this.repository.updateItemStatus(
      tenant_id,
      itemId,
      "active",
    );
    await this.auditService.log({
      tenantId: tenant_id,
      userId,
      module: "inventory",
      action: "APPROVE",
      entityType: "ITEM",
      entityId: itemId,
      metadata: { sku: item.sku },
    });
    return item;
  }

  async rejectItem(tenant_id: string, itemId: string, userId: string) {
    const item = await this.repository.updateItemStatus(
      tenant_id,
      itemId,
      "rejected",
    );
    await this.auditService.log({
      tenantId: tenant_id,
      userId,
      module: "inventory",
      action: "REJECT",
      entityType: "ITEM",
      entityId: itemId,
      metadata: { sku: item.sku },
    });
    return item;
  }

  async createMovementRequest(
    tenant_id: string,
    data: CreateMovementRequestDto,
    userId?: string,
  ) {
    const request = await this.repository.createMovementRequest(
      tenant_id,
      data,
    );
    if (userId) {
      await this.auditService.log({
        tenantId: tenant_id,
        userId,
        module: "inventory",
        action: "REQUEST_MOVEMENT",
        entityType: "MOVEMENT_REQUEST",
        entityId: request.id,
        metadata: { type: data.type, lineCount: data.lines.length },
      });
    }
    return request;
  }
}
