import { TenantContext } from "../../gateway/tenant-context.interface";
import { Injectable, Logger } from "@nestjs/common";
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

  private readonly logger = new Logger(InventoryService.name);

  async getDashboard(ctx: TenantContext) {
    return this.repository.getDashboard(ctx);
  }

  async getItems(ctx: TenantContext) {
    return this.repository.getItems(ctx);
  }

  async createItem(ctx: TenantContext, data: CreateItemDto, user_id?: string) {
    // Phase 1: Auto-generate SKU if missing or empty
    if (!data.sku || data.sku.trim() === "") {
      data.sku = await this.skuGenerator.generateSku(ctx, data.category);
    }

    // Always ensure a barcode exists (tightly coupled)
    if (!data.barcode || data.barcode.trim() === "") {
      data.barcode = this.skuGenerator.generateBarcode(ctx, data.sku);
    }

    // Default to pending for HOD approval as per user requirement, but allow override if explicitly set
    const itemData = {
      ...data,
      status: data.status || "pending",
    };

    const item = await this.repository.createItem(ctx, itemData);
    if (user_id) {
      await this.auditService.log({
        tenant_id: ctx.tenant_id,
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

  async getBalances(ctx: TenantContext,
    location_id?: string,
    departmentId?: string,
  ) {
    return this.repository.getBalances(ctx, location_id, departmentId);
  }

  async getMovements(ctx: TenantContext, item_id?: string) {
    return this.repository.getMovements(ctx, item_id);
  }

  async intakeStock(ctx: TenantContext, data: StockIntakeDto, user_id?: string, tx?: any, correlation_id?: string) {
    const result = await this.repository.intakeStock(ctx, data, tx);
    
    // Emit standardized event (V1 Schema matching EventRegistry)
    await this.eventBus.publish({
      event_type: 'STOCK_MOVEMENT_CREATED',
      tenant_id: ctx.tenant_id,
      entity_id: result.id,
      entity_type: 'STOCK_MOVEMENT',
      source_module: 'inventory',
      payload: {
        movementId: result.id,
        tenant_id: ctx.tenant_id,
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
        tenant_id: ctx.tenant_id,
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

  async consumeStock(ctx: TenantContext,
    data: any,
    user_id?: string,
    tx?: any,
    correlation_id?: string,
  ) {
    // Phase 4: Hardened consumption with available check (moved to repo)
    const result = await this.repository.consumeStock(ctx, data, tx);

    await this.eventBus.publish({
        event_type: 'STOCK_MOVEMENT_CREATED',
        tenant_id: ctx.tenant_id,
        entity_id: result.id,
        entity_type: 'STOCK_MOVEMENT',
        source_module: 'inventory',
        payload: {
          movementId: result.id,
          tenant_id: ctx.tenant_id,
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
        tenant_id: ctx.tenant_id,
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

  async reserveStock(ctx: TenantContext,
    data: { product_id: string; location_id: string; quantity: number; referenceId: string; referenceType: string },
    user_id: string,
    correlation_id?: string
  ) {
    await this.repository.reserveStock(
        ctx,
        data.product_id, 
        data.location_id, 
        data.quantity, 
        data.referenceId, 
        data.referenceType
    );
    
    await this.eventBus.publish({
        event_type: 'STOCK_RESERVED',
        tenant_id: ctx.tenant_id,
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

  async releaseStock(ctx: TenantContext,
    data: { product_id: string; location_id: string; quantity: number; referenceId: string; referenceType: string },
    user_id: string,
    correlation_id?: string
  ) {
    await this.repository.releaseStock(
        ctx,
        data.product_id, 
        data.location_id, 
        data.quantity, 
        data.referenceId, 
        data.referenceType
    );
    
    await this.eventBus.publish({
        event_type: 'STOCK_RELEASED',
        tenant_id: ctx.tenant_id,
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

  async confirmReservation(ctx: TenantContext,
    data: { product_id: string; location_id: string; quantity: number; referenceId: string; referenceType: string },
    user_id: string,
    correlation_id?: string
  ) {
    await this.repository.consumeFromReservation(
        ctx,
        data.product_id, 
        data.location_id, 
        data.quantity, 
        data.referenceId, 
        data.referenceType
    );

    await this.eventBus.publish({
        event_type: 'STOCK_MOVEMENT_CREATED',
        tenant_id: ctx.tenant_id,
        entity_id: data.referenceId,
        entity_type: 'STOCK_MOVEMENT',
        source_module: 'inventory',
        payload: {
            movementId: data.referenceId,
            tenant_id: ctx.tenant_id,
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

  async initiateTransfer(ctx: TenantContext,
    data: { product_id: string; fromLocationId: string; toLocationId: string; quantity: number; referenceId: string; referenceType: string, transferGroupId?: string },
    user_id: string,
    correlation_id?: string
  ) {
    return this.prisma.$transaction(async (tx) => {
      // 1. Virtual Transit Pool logic
      const transitLocation = await this.getOrCreateTransitLocation(ctx, data.fromLocationId, data.toLocationId);
      const groupId = data.transferGroupId || `TRG-${Date.now()}`;
      
      const move = await this.repository.transferOut(
          ctx,
          data.product_id, 
          data.fromLocationId, 
          transitLocation.id, // Move to transit pool
          data.quantity, 
          data.referenceId, 
          data.referenceType,
          groupId,
          tx
      );

      // 2. Update status to SHIPPED (IN_TRANSIT)
      await tx.inventory_movement_requests.updateMany({
        where: { tenant_id: ctx.tenant_id, id: data.referenceId, status: 'PENDING' },
        data: { status: 'SHIPPED', updated_at: new Date() }
      });
      
      await this.eventBus.publish({
          event_type: 'STOCK_MOVEMENT_CREATED',
          tenant_id: ctx.tenant_id,
          entity_id: move.id,
          entity_type: 'STOCK_MOVEMENT',
          source_module: 'inventory',
          payload: {
              movementId: move.id,
              tenant_id: ctx.tenant_id,
              product_id: data.product_id,
              fromLocationId: data.fromLocationId,
              transitLocationId: transitLocation.id,
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

      return { move, transferGroupId: groupId, transitLocationId: transitLocation.id };
    });
  }

  async completeTransfer(ctx: TenantContext,
    data: { product_id: string; fromLocationId: string; toLocationId: string; quantity: number; referenceId: string; referenceType: string, transferGroupId?: string, transitLocationId?: string },
    user_id: string,
    correlation_id?: string
  ) {
    return this.prisma.$transaction(async (tx) => {
      // If transitLocationId not provided, recover it
      const transitLocationId = data.transitLocationId || (await this.getOrCreateTransitLocation(ctx, data.fromLocationId, data.toLocationId)).id;
      
      const move = await this.repository.transferIn(
          ctx,
          data.product_id, 
          transitLocationId, // Move FROM transit pool
          data.toLocationId, 
          data.quantity, 
          data.referenceId, 
          data.referenceType,
          data.transferGroupId,
          tx
      );

      // 2. Update status to COMPLETED (RECEIVED)
      await tx.inventory_movement_requests.updateMany({
        where: { tenant_id: ctx.tenant_id, id: data.referenceId, status: 'SHIPPED' },
        data: { status: 'COMPLETED', updated_at: new Date() }
      });
      
      await this.eventBus.publish({
          event_type: 'STOCK_MOVEMENT_CREATED',
          tenant_id: ctx.tenant_id,
          entity_id: move.id,
          entity_type: 'STOCK_MOVEMENT',
          source_module: 'inventory',
          payload: {
              movementId: move.id,
              tenant_id: ctx.tenant_id,
              product_id: data.product_id,
              fromLocationId: transitLocationId,
              toLocationId: data.toLocationId,
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
    });
  }

  private async getOrCreateTransitLocation(ctx: TenantContext, fromId: string, toId: string) {
    const transitName = `Transit Pool (${fromId.substring(0,4)} to ${toId.substring(0,4)})`;
    const transitCode = `TR-${fromId.substring(0,4)}-${toId.substring(0,4)}`;

    let location = await this.prisma.locations.findFirst({
        where: { tenant_id: ctx.tenant_id, type: 'TRANSIT', code: transitCode }
    });

    if (!location) {
        location = await this.prisma.locations.create({
            data: {
                id: uuidv4(),
                tenant_id: ctx.tenant_id,
                name: transitName,
                code: transitCode,
                type: 'TRANSIT',
                address: 'Virtual Transit Zone',
                updated_at: new Date(),
            }
        });
    }

    return location;
  }

  // --- NEW Stock Transfer Lifecycle (Grading to Production) ---

  async getAllTransfers(ctx: TenantContext) {
    return this.repository.getTransfers(ctx);
  }

  async createTransfer(ctx: TenantContext, data: any, user_id: string) {
    const transfer = await this.repository.createStockTransfer(ctx, {
      ...data,
      status: 'REQUESTED',
      requested_by: user_id,
      requested_at: new Date(),
    });

    await this.auditService.log({
      tenant_id: ctx.tenant_id,
      user_id,
      module: 'inventory',
      action: 'TRANSFER_REQUESTED',
      entity_type: 'STOCK_TRANSFER',
      entity_id: transfer.id,
      metadata: { item_id: data.item_id, quantity: data.quantity }
    });

    return transfer;
  }

  async pickTransfer(ctx: TenantContext, id: string, user_id: string) {
    return this.prisma.$transaction(async (tx) => {
      const transfer = await this.repository.getTransferById(ctx, id);
      if (!transfer || transfer.status !== 'REQUESTED') {
        throw new Error('Transfer not found or not in REQUESTED status');
      }

      // Reserve stock at source
      await this.repository.reserveStock(
        ctx,
        transfer.item_id,
        transfer.from_location_id,
        transfer.quantity,
        transfer.id,
        'STOCK_TRANSFER',
        tx
      );

      const updated = await this.repository.updateStockTransfer(ctx, id, {
        status: 'PICKED',
        picked_by: user_id,
        picked_at: new Date(),
      }, tx);

      await this.auditService.log({
        tenant_id: ctx.tenant_id,
        user_id,
        module: 'inventory',
        action: 'TRANSFER_PICKED',
        entity_type: 'STOCK_TRANSFER',
        entity_id: id,
      }, tx);

      return updated;
    });
  }

  async shipTransfer(ctx: TenantContext, id: string, tracking_number: string, user_id: string) {
    return this.prisma.$transaction(async (tx) => {
      const transfer = await this.repository.getTransferById(ctx, id);
      if (!transfer || (transfer.status !== 'REQUESTED' && transfer.status !== 'PICKED')) {
        throw new Error('Transfer not found or cannot be shipped');
      }

      const transitLocation = await this.getOrCreateTransitLocation(ctx, transfer.from_location_id, transfer.to_location_id);
      
      // If was PICKED, release reservation and then transfer out. 
      // If was REQUESTED, just transfer out (which checks available).
      if (transfer.status === 'PICKED') {
        await this.repository.releaseStock(
            ctx,
            transfer.item_id,
            transfer.from_location_id,
            transfer.quantity,
            transfer.id,
            'STOCK_TRANSFER',
            tx
        );
      }

      // Atomic movement to Transit Pool
      await this.repository.transferOut(
        ctx,
        transfer.item_id,
        transfer.from_location_id,
        transitLocation.id,
        transfer.quantity,
        transfer.id,
        'STOCK_TRANSFER',
        transfer.transfer_group_id || undefined,
        tx
      );

      const updated = await this.repository.updateStockTransfer(ctx, id, {
        status: 'IN_TRANSIT',
        shipped_by: user_id,
        shipped_at: new Date(),
        tracking_number,
      }, tx);

      await this.auditService.log({
        tenant_id: ctx.tenant_id,
        user_id,
        module: 'inventory',
        action: 'TRANSFER_SHIPPED',
        entity_type: 'STOCK_TRANSFER',
        entity_id: id,
        metadata: { tracking_number }
      }, tx);

      return updated;
    });
  }

  async receiveTransfer(ctx: TenantContext, id: string, user_id: string) {
    return this.prisma.$transaction(async (tx) => {
      const transfer = await this.repository.getTransferById(ctx, id);
      if (!transfer || transfer.status !== 'IN_TRANSIT') {
        throw new Error('Transfer not found or not in IN_TRANSIT status');
      }

      const transitLocation = await this.getOrCreateTransitLocation(ctx, transfer.from_location_id, transfer.to_location_id);

      // Move FROM transit pool to Destination
      await this.repository.transferIn(
        ctx,
        transfer.item_id,
        transitLocation.id,
        transfer.to_location_id,
        transfer.quantity,
        transfer.id,
        'STOCK_TRANSFER',
        transfer.transfer_group_id || undefined,
        tx
      );

      const updated = await this.repository.updateStockTransfer(ctx, id, {
        status: 'RECEIVED',
        received_by: user_id,
        received_at: new Date(),
      }, tx);

      await this.auditService.log({
        tenant_id: ctx.tenant_id,
        user_id,
        module: 'inventory',
        action: 'TRANSFER_RECEIVED',
        entity_type: 'STOCK_TRANSFER',
        entity_id: id,
      }, tx);

      return updated;
    });
  }

  async cleanupExpiredReservations(ctx?: TenantContext) {
    const ttlMinutes = 30;
    const expiryTime = new Date(Date.now() - ttlMinutes * 60 * 1000);

    const where: any = {
        status: 'PENDING',
        created_at: { lt: expiryTime }
    };
    if (ctx) where.tenant_id = ctx.tenant_id;

    const expired = await this.prisma.stock_reservations.findMany({ where });

    for (const res of expired) {
        if (!res.tenant_id) continue;
        try {
            await this.repository.releaseStock(
                { tenant_id: res.tenant_id } as TenantContext,
                res.product_id,
                res.location_id,
                Number(res.quantity),
                res.reference_id || 'EXPIRED_RESERVATION',
                res.reference_type || 'SYSTEM'
            );
            this.logger.log(`Released expired reservation ${res.id} for tenant ${res.tenant_id}`);
        } catch (error) {
            this.logger.error(`Failed to release reservation ${res.id}: ${error.message}`);
        }
    }

    return expired.length;
  }

  async runStockSnapshot(ctx: TenantContext, location_id: string) {
    await this.repository.takeSnapshot(ctx, location_id);
  }

  async initializeStock(ctx: TenantContext, data: any, user_id?: string, correlation_id?: string) {
    // Manual Creation flow initializer
    await this.eventBus.publish({
        event_type: 'INVENTORY_STOCK_INITIALIZED',
        tenant_id: ctx.tenant_id,
        entity_id: data.sku,
        entity_type: 'ITEM',
        source_module: 'inventory',
        payload: {
            tenant_id: ctx.tenant_id,
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

  async transferStock(ctx: TenantContext,
    data: TransferStockDto,
    user_id?: string,
    correlation_id?: string,
  ) {
    // Phase 3: Multi-branch transfer with in-transit support
    // Option A: Immediate transfer (legacy)
    // Option B: Two-step transfer (Departed -> InTransit -> Arrived)
    
    // For Phase 3, we implement the two-step logic if it's a 'shipment' 
    // but for simple 'transfer' we'll stick to standardized emission.

    const result = await (this.repository as any).transferStock(ctx, data);
    
    // Emit standardized events (One for OUT, one for IN if immediate)
    for (const move of result) {
        await this.eventBus.publish({
            event_type: 'STOCK_MOVEMENT_CREATED',
            tenant_id: ctx.tenant_id,
            entity_id: move.id,
            entity_type: 'STOCK_MOVEMENT',
            source_module: 'inventory',
            payload: {
                movementId: move.id,
                tenant_id: ctx.tenant_id,
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
        tenant_id: ctx.tenant_id,
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

  async getAdjustments(ctx: TenantContext) {
    return this.repository.getAdjustments(ctx);
  }

  async createAdjustment(ctx: TenantContext,
    data: CreateAdjustmentDto,
    user_id?: string,
    tx?: any,
    correlation_id?: string
  ) {
    const adjustment = await this.repository.createAdjustment(ctx, data, tx);
    if (user_id) {
      await this.auditService.log({
        tenant_id: ctx.tenant_id,
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

  async approveAdjustment(ctx: TenantContext,
    adjustmentId: string,
    approvedBy: string,
  ) {
    const result = await this.repository.approveAdjustment(
      ctx,
      adjustmentId,
      approvedBy,
    );

    // Emit standardized event
    await this.eventBus.publish({
      event_type: 'STOCK_MOVEMENT_CREATED',
      tenant_id: ctx.tenant_id,
      entity_id: adjustmentId,
      entity_type: 'STOCK_MOVEMENT',
      source_module: 'inventory',
      payload: {
        movementId: adjustmentId,
        tenant_id: ctx.tenant_id,
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

  async getAlerts(ctx: TenantContext) {
    return this.repository.getAlerts(ctx);
  }

  async setAlertStatus(ctx: TenantContext,
    alertId: string,
    status: "open" | "acknowledged" | "resolved",
  ) {
    return this.repository.setAlertStatus(ctx, alertId, status);
  }

  async getAuditCycles(ctx: TenantContext) {
    return this.repository.getAuditCycles(ctx);
  }

  async createAuditCycle(ctx: TenantContext, data: any) {
    return this.repository.createAuditCycle(ctx, data);
  }

  async updateAuditCycle(ctx: TenantContext, id: string, data: any) {
    return this.repository.updateAuditCycle(ctx, id, data);
  }

  async getIntegrationEvents(ctx: TenantContext) {
    return this.repository.getIntegrationEvents(ctx);
  }

  async createIntegrationEvent(ctx: TenantContext, data: any) {
    return this.repository.createIntegrationEvent(ctx, data);
  }

  async runLowStockScan(ctx: TenantContext) {
    // Query all stock levels and flag those at/below their minBuffer threshold
    const all = await this.prisma.stock_levels.findMany({
      where: { tenant_id: ctx.tenant_id },
    });
    const low = all.filter((s: any) => Number(s.on_hand) <= Number(s.min_buffer));

    // Create/upsert InventoryAlert for each low stock level found
    let created = 0;
    for (const level of low) {
      const existing = await this.prisma.inventory_alerts.findFirst({
        where: {
          tenant_id: ctx.tenant_id,
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
            tenant_id: ctx.tenant_id,
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
            tenant_id: ctx.tenant_id,
            entity_id: level.product_id,
            entity_type: 'PRODUCT',
            source_module: 'inventory',
            payload: {
                tenant_id: ctx.tenant_id,
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

  async runExpiryScan(ctx: TenantContext) {
    // Return count of currently open expiry-related alerts from DB
    const openExpiryAlerts = await this.prisma.inventory_alerts.count({
      where: {
        tenant_id: ctx.tenant_id,
        type: "EXPIRY_WARNING",
        status: "OPEN",
      },
    });
    return { scanned: 0, expiryFound: openExpiryAlerts };
  }

  async deleteItem(ctx: TenantContext, item_id: string, user_id?: string) {
    const result = await this.repository.deleteItem(ctx, item_id);
    if (user_id) {
      await this.auditService.log({
        tenant_id: ctx.tenant_id,
        user_id,
        module: "inventory",
        action: "DELETE",
        entity_type: "ITEM",
        entity_id: item_id,
      });
    }
    return result;
  }

  async batchDeleteItems(ctx: TenantContext,
    itemIds: string[],
    user_id?: string,
  ) {
    const result = await this.repository.batchDeleteItems(ctx, itemIds);
    if (user_id) {
      await this.auditService.log({
        tenant_id: ctx.tenant_id,
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

  async batchIntakeStock(ctx: TenantContext,
    data: StockIntakeDto[],
    user_id?: string,
  ) {
    const result = await this.repository.batchIntakeStock(ctx, data);
    if (user_id) {
      await this.auditService.log({
        tenant_id: ctx.tenant_id,
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

  async requestProcurement(ctx: TenantContext, data: any) {
    return this.repository.requestProcurement(ctx, data);
  }

  async batchCreateItems(ctx: TenantContext,
    data: CreateItemDto[],
    user_id?: string,
  ) {
    // Phase 1: Process each item for auto-generation
    for (const itemData of data) {
      if (!itemData.sku || itemData.sku.trim() === "") {
        itemData.sku = await this.skuGenerator.generateSku(
          ctx,
          itemData.category,
        );
      }
      if (!itemData.barcode || itemData.barcode.trim() === "") {
        itemData.barcode = this.skuGenerator.generateBarcode(
          ctx,
          itemData.sku,
        );
      }
    }

    const items = await this.repository.batchCreateItems(
      ctx,
      data.map((d) => ({ ...d, status: "pending" })),
    );
    if (user_id) {
      await this.auditService.log({
        tenant_id: ctx.tenant_id,
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

  async getPendingItems(ctx: TenantContext) {
    return this.repository.getPendingItems(ctx);
  }

  async approveItem(ctx: TenantContext, item_id: string, user_id: string) {
    const item = await this.repository.updateItemStatus(
      ctx,
      item_id,
      "active",
    );
    await this.auditService.log({
      tenant_id: ctx.tenant_id,
      user_id,
      module: "inventory",
      action: "APPROVE",
      entity_type: "ITEM",
      entity_id: item_id,
      metadata: { sku: item.sku },
    });
    return item;
  }

  async rejectItem(ctx: TenantContext, item_id: string, user_id: string) {
    const item = await this.repository.updateItemStatus(
      ctx,
      item_id,
      "rejected",
    );
    await this.auditService.log({
      tenant_id: ctx.tenant_id,
      user_id,
      module: "inventory",
      action: "REJECT",
      entity_type: "ITEM",
      entity_id: item_id,
      metadata: { sku: item.sku },
    });
    return item;
  }

  async createMovementRequest(ctx: TenantContext,
    data: CreateMovementRequestDto,
    user_id?: string,
  ) {
    const request = await this.repository.createMovementRequest(
      ctx,
      data,
    );
    if (user_id) {
      await this.auditService.log({
        tenant_id: ctx.tenant_id,
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
  async getAgenticEvents(ctx: TenantContext) {
    return this.repository.getAgenticEvents(ctx);
  }

  async createAgenticEvent(ctx: TenantContext, data: CreateAgenticEventDto) {
    return this.repository.createAgenticEvent(ctx, data);
  }

  async processScan(ctx: TenantContext,
    params: { barcode: string; location_id: string; delta: number },
    user_id: string,
    correlation_id?: string
  ) {
    this.logger.log(`Processing Edge Scan: ${params.barcode} for tenant ${ctx.tenant_id}`);
    
    // 1. Efficient Lookup
    const item = await this.repository.lookupByBarcode(ctx, params.barcode);
    if (!item) {
        throw new Error(`Item not found for barcode: ${params.barcode}`);
    }

    // 2. Atomic Adjustment
    const result = await this.repository.quickAdjust(
        ctx,
        item.id,
        params.location_id,
        params.delta,
        user_id
    );

    // 3. Emit Event for downstream logic (e.g. Real-time dashboards, IoT alerts)
    await this.eventBus.publish({
        event_type: 'INVENTORY_SCAN_PROCESSED',
        tenant_id: ctx.tenant_id,
        entity_id: item.id,
        entity_type: 'ITEM',
        source_module: 'inventory',
        payload: {
            ...params,
            item_id: item.id,
            sku: item.sku,
            newQuantity: result.on_hand,
            timestamp: new Date().toISOString(),
        },
        user_id,
        correlation_id
    });

    return {
        item,
        adjustment: result,
        status: 'SUCCESS'
    };
  }
}
