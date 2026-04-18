import { Injectable } from "@nestjs/common";
import { CreateAdjustmentDto } from "./dto/create-adjustment.dto";
import { CreateItemDto } from "./dto/create-item.dto";
import { StockIntakeDto } from "./dto/stock-intake.dto";
import { TransferStockDto } from "./dto/transfer-stock.dto";
import { CreateMovementRequestDto } from "./dto/create-movement-request.dto";
import { CreateAgenticEventDto } from "./dto/create-agentic-event.dto";
import { IInventoryRepository } from "./repositories/inventory.repository.interface";
import { SkuGeneratorService } from "./sku-generator.service";
import { AuditService } from "../../shared/audit/audit.service";
import { PrismaService } from "../../persistence/prisma.service";
import { EventBusService } from "../../shared/events/event-bus.service";
import { v4 as uuidv4 } from "uuid";

@Injectable()
export class InventoryService {
  constructor(
    private readonly repository: IInventoryRepository,
    private readonly skuGenerator: SkuGeneratorService,
    private readonly auditService: AuditService,
    private readonly prisma: PrismaService,
    private readonly eventBus: EventBusService,
  ) {}

  async getDashboard(tenant_id: string) {
    return this.repository.getDashboard(tenant_id);
  }

  async getItems(tenant_id: string) {
    return this.repository.getItems(tenant_id);
  }

  async createItem(tenant_id: string, data: CreateItemDto, user_id?: string) {
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
    if (user_id) {
      await this.auditService.log({
        tenant_id: tenant_id,
        user_id,
        module: "inventory",
        action: "CREATE_PENDING",
        entity_type: "ITEM",
        entity_id: item.id,
        metadata: { name: data.name, sku: data.sku },
      });
    }
    return item;
  }

  async getBalances(
    tenant_id: string,
    location_id?: string,
    departmentId?: string,
  ) {
    return this.repository.getBalances(tenant_id, location_id, departmentId);
  }

  async getMovements(tenant_id: string, item_id?: string) {
    return this.repository.getMovements(tenant_id, item_id);
  }

  async intakeStock(tenant_id: string, data: StockIntakeDto, user_id?: string, tx?: any, correlation_id?: string) {
    const result = await this.repository.intakeStock(tenant_id, data, tx);
    
    // Emit standardized event (V1 Schema matching EventRegistry)
    await this.eventBus.publish({
      event_type: 'STOCK_MOVEMENT_CREATED',
      tenant_id: tenant_id,
      entity_id: result.id,
      entity_type: 'STOCK_MOVEMENT',
      source_module: 'inventory',
      payload: {
        movementId: result.id,
        tenant_id: tenant_id,
        product_id: data.item_id,
        location_id: data.location_id,
        quantity: data.quantity,
        type: 'intake',
        referenceId: data.referenceId || result.referenceId,
        referenceType: (data as any).referenceType || 'MANUAL',
        timestamp: new Date().toISOString(),
      },
      user_id,
      correlation_id,
    });

    if (user_id) {
      await this.auditService.log({
        tenant_id: tenant_id,
        user_id,
        module: "inventory",
        action: "INTAKE",
        entity_type: "STOCK",
        entity_id: data.item_id,
        metadata: { quantity: data.quantity, location_id: data.location_id },
      });
    }
    return result;
  }

  async consumeStock(
    tenant_id: string,
    data: any,
    user_id?: string,
    tx?: any,
    correlation_id?: string,
  ) {
    // Phase 4: Hardened consumption with available check (moved to repo)
    const result = await this.repository.consumeStock(tenant_id, data, tx);

    await this.eventBus.publish({
        event_type: 'STOCK_MOVEMENT_CREATED',
        tenant_id: tenant_id,
        entity_id: result.id,
        entity_type: 'STOCK_MOVEMENT',
        source_module: 'inventory',
        payload: {
          movementId: result.id,
          tenant_id: tenant_id,
          product_id: data.item_id,
          location_id: data.location_id,
          quantity: -data.quantity,
          type: 'deduction',
          referenceId: data.referenceId || result.referenceId,
          referenceType: data.referenceType || 'CONSUMPTION',
          timestamp: new Date().toISOString(),
        },
        user_id,
        correlation_id,
      });

    if (user_id) {
      await this.auditService.log({
        tenant_id: tenant_id,
        user_id,
        module: "inventory",
        action: "CONSUME",
        entity_type: "STOCK",
        entity_id: data.item_id,
        metadata: {
          quantity: data.quantity,
          locations: data.location_id,
          referenceId: data.referenceId,
        },
      });
    }
    return result;
  }

  // --- Financial-Grade Reservation Lifecycle ---

  async reserveStock(
    tenant_id: string,
    data: { product_id: string; location_id: string; quantity: number; referenceId: string; referenceType: string },
    user_id: string,
    correlation_id?: string
  ) {
    await this.repository.reserveStock(
        tenant_id, 
        data.product_id, 
        data.location_id, 
        data.quantity, 
        data.referenceId, 
        data.referenceType
    );
    
    await this.eventBus.publish({
        event_type: 'STOCK_RESERVED',
        tenant_id,
        entity_id: data.product_id,
        entity_type: 'PRODUCT',
        source_module: 'inventory',
        payload: { 
            ...data, 
            timestamp: new Date().toISOString() 
        },
        user_id,
        correlation_id
    });
  }

  async releaseStock(
    tenant_id: string,
    data: { product_id: string; location_id: string; quantity: number; referenceId: string; referenceType: string },
    user_id: string,
    correlation_id?: string
  ) {
    await this.repository.releaseStock(
        tenant_id, 
        data.product_id, 
        data.location_id, 
        data.quantity, 
        data.referenceId, 
        data.referenceType
    );
    
    await this.eventBus.publish({
        event_type: 'STOCK_RELEASED',
        tenant_id,
        entity_id: data.product_id,
        entity_type: 'PRODUCT',
        source_module: 'inventory',
        payload: { 
            ...data, 
            timestamp: new Date().toISOString() 
        },
        user_id,
        correlation_id
    });
  }

  async confirmReservation(
    tenant_id: string,
    data: { product_id: string; location_id: string; quantity: number; referenceId: string; referenceType: string },
    user_id: string,
    correlation_id?: string
  ) {
    await this.repository.consumeFromReservation(
        tenant_id, 
        data.product_id, 
        data.location_id, 
        data.quantity, 
        data.referenceId, 
        data.referenceType
    );

    await this.eventBus.publish({
        event_type: 'STOCK_MOVEMENT_CREATED',
        tenant_id,
        entity_id: data.referenceId,
        entity_type: 'STOCK_MOVEMENT',
        source_module: 'inventory',
        payload: {
            movementId: data.referenceId,
            tenant_id,
            product_id: data.product_id,
            location_id: data.location_id,
            quantity: -data.quantity,
            type: 'deduction',
            referenceId: data.referenceId,
            referenceType: data.referenceType,
            status: 'CONSUMED_RESERVATION',
            timestamp: new Date().toISOString(),
        },
        user_id,
        correlation_id
    });
  }

  // --- In-Transit / Multi-Step Transfer ---

  async initiateTransfer(
    tenant_id: string,
    data: { product_id: string; fromLocationId: string; toLocationId: string; quantity: number; referenceId: string; referenceType: string, transferGroupId?: string },
    user_id: string,
    correlation_id?: string
  ) {
    const groupId = data.transferGroupId || `TRG-${Date.now()}`;
    const move = await this.repository.transferOut(
        tenant_id, 
        data.product_id, 
        data.fromLocationId, 
        data.toLocationId, 
        data.quantity, 
        data.referenceId, 
        data.referenceType,
        groupId
    );
    
    await this.eventBus.publish({
        event_type: 'STOCK_MOVEMENT_CREATED',
        tenant_id: tenant_id,
        entity_id: move.id,
        entity_type: 'STOCK_MOVEMENT',
        source_module: 'inventory',
        payload: {
            movementId: move.id,
            tenant_id: tenant_id,
            product_id: data.product_id,
            fromLocationId: data.fromLocationId,
            toLocationId: data.toLocationId,
            quantity: -data.quantity,
            type: 'TRANSFER_OUT',
            referenceId: data.referenceId,
            referenceType: data.referenceType,
            transferGroupId: groupId,
            status: 'IN_TRANSIT',
            timestamp: new Date().toISOString(),
        },
        user_id,
        correlation_id
    });
    return { move, transferGroupId: groupId };
  }

  async completeTransfer(
    tenant_id: string,
    data: { product_id: string; fromLocationId: string; toLocationId: string; quantity: number; referenceId: string; referenceType: string, transferGroupId?: string },
    user_id: string,
    correlation_id?: string
  ) {
    const move = await this.repository.transferIn(
        tenant_id, 
        data.product_id, 
        data.fromLocationId, 
        data.toLocationId, 
        data.quantity, 
        data.referenceId, 
        data.referenceType,
        data.transferGroupId
    );
    
    await this.eventBus.publish({
        event_type: 'STOCK_MOVEMENT_CREATED',
        tenant_id: tenant_id,
        entity_id: move.id,
        entity_type: 'STOCK_MOVEMENT',
        source_module: 'inventory',
        payload: {
            movementId: move.id,
            tenant_id: tenant_id,
            product_id: data.product_id,
            location_id: data.toLocationId,
            quantity: data.quantity,
            type: 'TRANSFER_IN',
            referenceId: data.referenceId,
            referenceType: data.referenceType,
            transferGroupId: data.transferGroupId,
            status: 'COMPLETED',
            timestamp: new Date().toISOString(),
        },
        user_id,
        correlation_id
    });
    return move;
  }

  async runStockSnapshot(tenant_id: string, location_id: string) {
    await this.repository.takeSnapshot(tenant_id, location_id);
  }

  async initializeStock(tenant_id: string, data: any, user_id?: string, correlation_id?: string) {
    // Manual Creation flow initializer
    await this.eventBus.publish({
        event_type: 'INVENTORY_STOCK_INITIALIZED',
        tenant_id: tenant_id,
        entity_id: data.sku,
        entity_type: 'ITEM',
        source_module: 'inventory',
        payload: {
            tenant_id: tenant_id,
            sku: data.sku,
            location_id: data.location_id,
            quantity: data.quantity,
            unitCost: data.unitCost,
            timestamp: new Date().toISOString(),
        },
        user_id,
        correlation_id
    });
  }

  async transferStock(
    tenant_id: string,
    data: TransferStockDto,
    user_id?: string,
    correlation_id?: string,
  ) {
    // Phase 3: Multi-branch transfer with in-transit support
    // Option A: Immediate transfer (legacy)
    // Option B: Two-step transfer (Departed -> InTransit -> Arrived)
    
    // For Phase 3, we implement the two-step logic if it's a 'shipment' 
    // but for simple 'transfer' we'll stick to standardized emission.

    const result = await (this.repository as any).transferStock(tenant_id, data);
    
    // Emit standardized events (One for OUT, one for IN if immediate)
    for (const move of result) {
        await this.eventBus.publish({
            event_type: 'STOCK_MOVEMENT_CREATED',
            tenant_id: tenant_id,
            entity_id: move.id,
            entity_type: 'STOCK_MOVEMENT',
            source_module: 'inventory',
            payload: {
                movementId: move.id,
                tenant_id: tenant_id,
                product_id: data.item_id,
                location_id: move.movementType === 'transfer_out' ? data.fromLocationId : data.toLocationId,
                quantity: move.movementType === 'transfer_out' ? -data.quantity : data.quantity,
                type: move.movementType === 'transfer_out' ? 'transfer_out' : 'transfer_in',
                referenceId: move.referenceId,
                referenceType: 'TRANSFER',
                timestamp: new Date().toISOString(),
            },
            user_id,
            correlation_id,
        });
    }

    if (user_id) {
      await this.auditService.log({
        tenant_id: tenant_id,
        user_id,
        module: "inventory",
        action: "TRANSFER",
        entity_type: "STOCK",
        entity_id: data.item_id,
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
    user_id?: string,
    tx?: any,
    correlation_id?: string
  ) {
    const adjustment = await this.repository.createAdjustment(tenant_id, data, tx);
    if (user_id) {
      await this.auditService.log({
        tenant_id: tenant_id,
        user_id,
        module: "inventory",
        action: "ADJUST_CREATE",
        entity_type: "ADJUSTMENT",
        entity_id: (adjustment as any).id,
        metadata: {
          item_id: data.item_id,
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
    const result = await this.repository.approveAdjustment(
      tenant_id,
      adjustmentId,
      approvedBy,
    );

    // Emit standardized event
    await this.eventBus.publish({
      event_type: 'STOCK_MOVEMENT_CREATED',
      tenant_id: tenant_id,
      entity_id: adjustmentId,
      entity_type: 'STOCK_MOVEMENT',
      source_module: 'inventory',
      payload: {
        movementId: adjustmentId,
        tenant_id: tenant_id,
        product_id: result.item_id,
        location_id: result.location_id,
        quantity: result.requestedDelta,
        type: result.requestedDelta > 0 ? 'adjustment_plus' : 'adjustment_minus',
        referenceId: `ADJ-${adjustmentId}`,
        referenceType: 'INVENTORY_ADJUSTMENT',
        timestamp: new Date().toISOString(),
      },
      user_id: approvedBy,
    });

    return result;
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
    const all = await this.prisma.stock_levels.findMany({
      where: { tenant_id: tenant_id },
    });
    const low = all.filter((s: any) => Number(s.on_hand) <= Number(s.min_buffer));

    // Create/upsert InventoryAlert for each low stock level found
    let created = 0;
    for (const level of low) {
      const existing = await this.prisma.inventory_alerts.findFirst({
        where: {
          tenant_id: tenant_id,
          entity_id: level.product_id,
          type: "LOW_STOCK",
          status: "OPEN",
        },
      });
      if (!existing) {
        await this.prisma.inventory_alerts.create({
          data: {
        id: uuidv4(),
        updated_at: new Date(),
            tenant_id: tenant_id,
            type: "LOW_STOCK",
            severity: Number(level.on_hand) === 0 ? "HIGH" : "MEDIUM",
            status: "OPEN",
            entity_id: level.product_id,
            message: `Stock level for product ${level.product_id} at location ${level.location_id} is at ${level.on_hand} (threshold: ${level.min_buffer})`,
          },
        });

        // Emit standardized LOW_STOCK_ALERT event
        await this.eventBus.publish({
            event_type: 'LOW_STOCK_ALERT',
            tenant_id: tenant_id,
            entity_id: level.product_id,
            entity_type: 'PRODUCT',
            source_module: 'inventory',
            payload: {
                tenant_id: tenant_id,
                product_id: level.product_id,
                location_id: level.location_id,
                currentLevel: Number(level.on_hand),
                threshold: Number(level.min_buffer),
                timestamp: new Date().toISOString(),
            },
            user_id: 'system',
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
    const openExpiryAlerts = await this.prisma.inventory_alerts.count({
      where: {
        tenant_id: tenant_id,
        type: "EXPIRY_WARNING",
        status: "OPEN",
      },
    });
    return { scanned: 0, expiryFound: openExpiryAlerts };
  }

  async deleteItem(tenant_id: string, item_id: string, user_id?: string) {
    const result = await this.repository.deleteItem(tenant_id, item_id);
    if (user_id) {
      await this.auditService.log({
        tenant_id: tenant_id,
        user_id,
        module: "inventory",
        action: "DELETE",
        entity_type: "ITEM",
        entity_id: item_id,
      });
    }
    return result;
  }

  async batchDeleteItems(
    tenant_id: string,
    itemIds: string[],
    user_id?: string,
  ) {
    const result = await this.repository.batchDeleteItems(tenant_id, itemIds);
    if (user_id) {
      await this.auditService.log({
        tenant_id: tenant_id,
        user_id,
        module: "inventory",
        action: "BATCH_DELETE",
        entity_type: "ITEM",
        entity_id: "batch",
        metadata: { count: itemIds.length },
      });
    }
    return result;
  }

  async batchIntakeStock(
    tenant_id: string,
    data: StockIntakeDto[],
    user_id?: string,
  ) {
    const result = await this.repository.batchIntakeStock(tenant_id, data);
    if (user_id) {
      await this.auditService.log({
        tenant_id: tenant_id,
        user_id,
        module: "inventory",
        action: "BATCH_INTAKE",
        entity_type: "STOCK",
        entity_id: "batch",
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
    user_id?: string,
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
    if (user_id) {
      await this.auditService.log({
        tenant_id: tenant_id,
        user_id,
        module: "inventory",
        action: "BATCH_CREATE_PENDING",
        entity_type: "ITEM",
        entity_id: "batch",
        metadata: { count: data.length },
      });
    }
    return items;
  }

  async getPendingItems(tenant_id: string) {
    return this.repository.getPendingItems(tenant_id);
  }

  async approveItem(tenant_id: string, item_id: string, user_id: string) {
    const item = await this.repository.updateItemStatus(
      tenant_id,
      item_id,
      "active",
    );
    await this.auditService.log({
      tenant_id: tenant_id,
      user_id,
      module: "inventory",
      action: "APPROVE",
      entity_type: "ITEM",
      entity_id: item_id,
      metadata: { sku: item.sku },
    });
    return item;
  }

  async rejectItem(tenant_id: string, item_id: string, user_id: string) {
    const item = await this.repository.updateItemStatus(
      tenant_id,
      item_id,
      "rejected",
    );
    await this.auditService.log({
      tenant_id: tenant_id,
      user_id,
      module: "inventory",
      action: "REJECT",
      entity_type: "ITEM",
      entity_id: item_id,
      metadata: { sku: item.sku },
    });
    return item;
  }

  async createMovementRequest(
    tenant_id: string,
    data: CreateMovementRequestDto,
    user_id?: string,
  ) {
    const request = await this.repository.createMovementRequest(
      tenant_id,
      data,
    );
    if (user_id) {
      await this.auditService.log({
        tenant_id: tenant_id,
        user_id,
        module: "inventory",
        action: "REQUEST_MOVEMENT",
        entity_type: "MOVEMENT_REQUEST",
        entity_id: request.id,
        metadata: { product_id: data.product_id, quantity: data.quantity },
      });
    }
    return request;
  }


  // --- Agentic Layer ---
  async createAgenticEvent(tenant_id: string, data: CreateAgenticEventDto) {
    return this.repository.createAgenticEvent(tenant_id, data);
  }
}
