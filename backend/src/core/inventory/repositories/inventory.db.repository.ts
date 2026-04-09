import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../persistence/prisma.service";
import {
  IInventoryRepository,
  InventoryDashboard,
  InventoryItem,
  StockBalance,
  StockMovement,
  InventoryAdjustment,
  CreateItemDto,
  StockIntakeDto,
  TransferStockDto,
  CreateAdjustmentDto,
  InventoryAlert,
  CreateMovementRequestDto,
  MovementRequest,
  CreateAgenticEventDto,
  AgenticEvent,
} from "./inventory.repository.interface";
import { v4 as uuidv4 } from "uuid";
import {
  ProductCategory,
  Location,
  Department,
  StockLevel,
  InventoryAdjustment as PrismaInventoryAdjustment,
  InventoryAlert as PrismaInventoryAlert,
  StockMovement as PrismaStockMovement,
  AgenticEvent as PrismaAgenticEvent,
  ItemMaster,
} from "@prisma/client";

@Injectable()
export class InventoryDbRepository implements IInventoryRepository {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboard(tenantId: string): Promise<InventoryDashboard> {
    const totalItems = await this.prisma.itemMaster.count({
      where: { tenantId: tenantId },
    });
    const totalLocations = await this.prisma.location.count({
      where: { tenantId: tenantId },
    });
    const totalDepartments = await this.prisma.department.count({
      where: { tenantId: tenantId },
    });

    const stockLevels = await this.prisma.stockLevel.findMany({
      where: { tenantId: tenantId },
    });
    const totalOnHandQty = stockLevels.reduce(
      (sum: number, level: StockLevel) => sum + level.onHand,
      0,
    );

    // Valuation logic would need product cost, using basePrice for now
    const products = await this.prisma.itemMaster.findMany({
      where: {
        tenantId: tenantId,
        id: { in: stockLevels.map((s: StockLevel) => s.productId) },
      },
    });
    const productMap = new Map(products.map((p: ItemMaster) => [p.id, p]));
    const totalValuation = stockLevels.reduce(
      (sum: number, level: StockLevel) => {
        const product = productMap.get(level.productId);
        return sum + level.onHand * (Number(product?.basePrice) || 0);
      },
      0,
    );

    const pendingAdjustments = await this.prisma.inventoryAdjustment.count({
      where: { tenantId: tenantId, status: "PENDING_APPROVAL" },
    });

    // Placeholder checks for now
    const lowStockCount = await this.prisma.inventoryAlert.count({
      where: { tenantId: tenantId, type: "LOW_STOCK", status: "OPEN" },
    });
    const expiryWarningCount = await this.prisma.inventoryAlert.count({
      where: { tenantId: tenantId, type: "EXPIRY_WARNING", status: "OPEN" },
    });

    const pendingReceiptSyncs = await this.prisma.procurementFinalPo.count({
      where: {
        tenantId: tenantId,
        status: { in: ["RELEASED", "APPROVED", "DELIVERED"] },
      },
    });

    return {
      totalItems,
      totalLocations,
      totalDepartments,
      totalOnHandQty,
      totalValuation,
      pendingAdjustments,
      pendingReceiptSyncs,
      lowStockCount,
      expiryWarningCount,
    };
  }

  async getItems(tenantId: string): Promise<InventoryItem[]> {
    const products = await this.prisma.itemMaster.findMany({
      where: { tenantId: tenantId, status: { not: "deleted" } },
      include: { productCategory: true },
      orderBy: { createdAt: "desc" },
    });

    return (products as any[]).map((p) => ({
      id: p.id,
      tenant_id: p.tenantId,
      sku: p.sku,
      name: p.name,
      category: p.productCategory.name as any,
      uom: p.unit,
      barcode: p.barcode,
      qrCode: p.barcode,
      moduleTags: (p as any).moduleTags || [],
      departmentId: p.departmentId || undefined,
      active: p.status === "active",
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    }));
  }

  async createItem(
    tenantId: string,
    data: CreateItemDto,
  ): Promise<InventoryItem> {
    // Find or create category
    let category = await this.prisma.productCategory.findFirst({
      where: { tenantId: tenantId, name: data.category },
    });

    if (!category) {
      category = await this.prisma.productCategory.create({
        data: {
          id: uuidv4(),
          updatedAt: new Date(),
          tenantId: tenantId,
          name: data.category 
        },
      });
    }

    const product = await this.prisma.itemMaster.create({
      data: {
        id: uuidv4(),
        updatedAt: new Date(),
        tenantId: tenantId,
        categoryId: category.id,
        name: data.name,
        sku: data.sku,
        barcode: data.sku,
        description: data.description ?? null,
        unit: data.uom ?? "unit",
        basePrice: data.basePrice ?? 0,
        taxRate: data.taxRate ?? 0,
        moduleTags: data.moduleTags ?? [],
        status: data.status || "active",
        departmentId: data.departmentId || null,
      },
      include: { productCategory: true },
    });

    return {
      id: product.id,
      tenant_id: product.tenantId,
      sku: product.sku,
      name: product.name,
      category: (product as any).productCategory.name as any,
      uom: product.unit,
      barcode: product.barcode,
      qrCode: product.barcode,
      moduleTags: (product as any).moduleTags || [],
      active: product.status === "active",
      departmentId: product.departmentId || undefined,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
    };
  }

  async getBalances(
    tenantId: string,
    locationId?: string,
    departmentId?: string,
  ): Promise<StockBalance[]> {
    const where: any = { tenantId: tenantId };
    if (locationId) where.locationId = locationId;
    if (departmentId) where.departmentId = departmentId;

    const levels = await this.prisma.stockLevel.findMany({
      where,
      include: { itemMaster: true, location: true, department: true },
    });

    return levels.map(
      (
        l: StockLevel & {
          itemMaster: any;
          location: Location;
          department: Department | null;
        },
      ) => ({
        id: l.id,
        tenant_id: l.tenantId,
        itemId: l.productId,
        locationId: l.locationId,
        departmentId: l.departmentId || undefined,
        quantity: l.onHand,
        reservedQuantity: l.reserved,
        inTransitQuantity: l.inTransit,
        avgUnitCost: Number(l.itemMaster.basePrice || 0),
        reorderPoint: l.minBuffer,
        safetyStock: l.minBuffer,
        updatedAt: l.updatedAt,
      }),
    );
  }

  async getMovements(
    tenantId: string,
    itemId?: string,
  ): Promise<StockMovement[]> {
    const where: any = { tenantId: tenantId };
    if (itemId) where.productId = itemId;

    const movements = await this.prisma.stockMovement.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 100, // Limit for safety
    });

    return movements.map((m: PrismaStockMovement) => ({
      id: m.id,
      tenant_id: m.tenantId,
      itemId: m.productId,
      movementType: m.type.toLowerCase() as any,
      quantity: m.quantity,
      unitCost: 0,
      reason: "Movement",
      sourceLocationId: m.fromLocationId || undefined,
      destinationLocationId: m.toLocationId || undefined,
      referenceId: m.referenceId,
      createdBy: m.performedBy,
      createdAt: m.createdAt,
    }));
  }

  async intakeStock(
    tenantId: string,
    data: StockIntakeDto,
    providedTx?: any
  ): Promise<StockMovement> {
    const execute = async (tx: any) => {
      // 1. Lock Row (or create if missing)
      let level = await this.getLock(tx, tenantId, data.itemId, data.locationId);
      
      if (!level) {
        level = await tx.stockLevel.create({
          data: {
            id: uuidv4(),
            updatedAt: new Date(),
            tenantId: tenantId,
            locationId: data.locationId,
            departmentId: data.departmentId || null,
            productId: data.itemId,
            onHand: data.quantity,
            available: data.quantity,
          },
        });
      } else {
        await tx.stockLevel.update({
          where: { id: level.id },
          data: {
            onHand: { increment: data.quantity },
            available: { increment: data.quantity },
          },
        });
      }

      // 2. Create movement
      const movement = await tx.stockMovement.create({
        data: {
          id: uuidv4(),
          updatedAt: new Date(),
          tenantId: tenantId,
          productId: data.itemId,
          locationId: data.locationId, 
          toLocationId: data.locationId,
          toDepartmentId: data.departmentId || null,
          quantity: data.quantity,
          unitCost: data.unitCost,
          type: "INTAKE",
          referenceId: data.referenceId || `INTAKE-${Date.now()}`,
          referenceType: data.referenceType || 'MANUAL',
          performedBy: data.createdBy || "system",
        },
      });

      return {
        id: movement.id,
        tenant_id: movement.tenantId,
        itemId: movement.productId,
        movementType: "intake" as any,
        quantity: movement.quantity,
        unitCost: Number(movement.unitCost),
        reason: "Intake",
        destinationLocationId: movement.toLocationId!,
        destinationDepartmentId: movement.toDepartmentId || undefined,
        referenceId: movement.referenceId,
        createdBy: movement.performedBy,
        createdAt: movement.createdAt,
      };
    };

    return providedTx ? execute(providedTx) : this.prisma.$transaction(execute);
  }

  async consumeStock(tenantId: string, data: any, providedTx?: any): Promise<any> {
    const execute = async (tx: any) => {
      // 1. Lock and check
      const level = await this.getLock(tx, tenantId, data.itemId, data.locationId);
      if (!level) throw new Error(`StockLevel not found for consumption`);
      if (level.available < data.quantity) throw new Error(`Insufficient available stock (Available: ${level.available}, Requested: ${data.quantity})`);

      // 2. Decrement stock level
      await tx.stockLevel.update({
        where: { id: level.id },
        data: {
          onHand: { decrement: data.quantity },
          available: { decrement: data.quantity },
        },
      });

      // 3. Create movement
      const movement = await tx.stockMovement.create({
        data: {
        id: uuidv4(),
          updatedAt: new Date(),
          tenantId: tenantId,
          productId: data.itemId,
          locationId: data.locationId, // Mandatory locationId
          fromLocationId: data.locationId,
          quantity: -data.quantity,
          type: "OUT",
          referenceId: data.referenceId || `CONSUME-${Date.now()}`,
          referenceType: data.referenceType || 'MANUAL',
          performedBy: data.performedBy || "system",
        },
      });

      return movement;
    };

    return providedTx ? execute(providedTx) : this.prisma.$transaction(execute);
  }

  async transferStock(
    tenantId: string,
    data: TransferStockDto,
  ): Promise<StockMovement[]> {
    // For legacy immediate transfer, we use a single transaction but lock both rows
    return this.prisma.$transaction(async (tx): Promise<StockMovement[]> => {
      const source = await this.getLock(tx, tenantId, data.itemId, data.fromLocationId);
      if (!source || source.available < data.quantity) throw new Error(`Insufficient source stock for transfer`);

      // 1. Decrement source
      await tx.stockLevel.update({
        where: { id: source.id },
        data: {
          onHand: { decrement: data.quantity },
          available: { decrement: data.quantity },
        },
      });

      // 2. Increment dest (standard immediate logic)
      const dest = await tx.stockLevel.upsert({
        where: {
          locationId_productId_departmentId: {
            locationId: data.toLocationId,
            productId: data.itemId,
            departmentId: data.toDepartmentId ?? (null as any),
          },
        },
        create: {
          tenantId: tenantId,
          locationId: data.toLocationId,
          departmentId: data.toDepartmentId || null,
          productId: data.itemId,
          onHand: data.quantity,
          available: data.quantity,
        },
        update: {
          onHand: { increment: data.quantity },
          available: { increment: data.quantity },
        },
      });

      // 3. Create movement records
      const outMove = await tx.stockMovement.create({
        data: {
          id: uuidv4(),
          tenantId: tenantId,
          productId: data.itemId,
          locationId: data.fromLocationId, // Mandatory locationId
          fromLocationId: data.fromLocationId,
          fromDepartmentId: data.fromDepartmentId || null,
          toLocationId: data.toLocationId,
          toDepartmentId: data.toDepartmentId || null,
          quantity: -data.quantity,
          type: "TRANSFER_OUT",
          referenceId: data.referenceId || `TR-${Date.now()}`,
          referenceType: data.referenceType || 'INTERNAL',
          performedBy: data.createdBy || "system",
        },
      });

      const inMove = await tx.stockMovement.create({
        data: {
          id: uuidv4(),
          tenantId: tenantId,
          productId: data.itemId,
          locationId: data.toLocationId, // Mandatory locationId
          fromLocationId: data.fromLocationId,
          fromDepartmentId: data.fromDepartmentId || null,
          toLocationId: data.toLocationId,
          toDepartmentId: data.toDepartmentId || null,
          quantity: data.quantity,
          type: "TRANSFER_IN",
          referenceId: data.referenceId || `TR-${Date.now()}`,
          referenceType: data.referenceType || 'INTERNAL',
          performedBy: data.createdBy || "system",
        },
      });

      return [outMove as any, inMove as any];
    });
  }

  async getAdjustments(tenantId: string): Promise<InventoryAdjustment[]> {
    const adjs = await this.prisma.inventoryAdjustment.findMany({
      where: { tenantId: tenantId },
      orderBy: { createdAt: "desc" },
    });

    return adjs.map((a: PrismaInventoryAdjustment) => ({
      id: a.id,
      tenant_id: a.tenantId,
      itemId: a.itemId,
      locationId: a.locationId,
      departmentId: a.departmentId || undefined,
      requestedDelta: a.requestedDelta,
      reason: a.reason,
      status: a.status.toLowerCase() as any,
      requestedBy: a.requestedBy,
      approvedBy: a.approvedBy || undefined,
      approvedAt: a.approvedAt || undefined,
      createdAt: a.createdAt,
      updatedAt: a.updatedAt,
    }));
  }

  async createAdjustment(
    tenantId: string,
    data: CreateAdjustmentDto,
    providedTx?: any
  ): Promise<InventoryAdjustment> {
    const db = providedTx || this.prisma;
    const adj = await db.inventoryAdjustment.create({
      data: {
        id: uuidv4(),
        updatedAt: new Date(),
        tenantId: tenantId,
        itemId: data.itemId,
        locationId: data.locationId,
        departmentId: data.departmentId || null,
        requestedDelta: data.requestedDelta,
        reason: data.reason,
        status: "PENDING_APPROVAL",
        requestedBy: data.requestedBy || "system",
      },
    });

    return {
      id: adj.id,
      tenant_id: adj.tenantId,
      itemId: adj.itemId,
      locationId: adj.locationId,
      departmentId: adj.departmentId || undefined,
      requestedDelta: adj.requestedDelta,
      reason: adj.reason,
      status: "pending" as const,
      requestedBy: adj.requestedBy,
      createdAt: adj.createdAt,
      updatedAt: adj.updatedAt,
    };
  }

  async approveAdjustment(
    tenantId: string,
    adjustmentId: string,
    approvedBy: string,
  ): Promise<InventoryAdjustment> {
    return this.prisma.$transaction(async (tx) => {
      const adj = await tx.inventoryAdjustment.update({
        where: { id: adjustmentId, tenantId: tenantId },
        data: {
          status: "APPROVED",
          approvedBy,
          approvedAt: new Date(),
        },
      });

      const level = await tx.stockLevel.upsert({
        where: {
          locationId_productId_departmentId: {
            locationId: adj.locationId,
            productId: adj.itemId,
            departmentId: adj.departmentId ?? (null as any),
          },
        },
        create: {
          tenantId: tenantId,
          locationId: adj.locationId,
          departmentId: adj.departmentId || null,
          productId: adj.itemId,
          onHand: adj.requestedDelta,
          available: adj.requestedDelta,
        },
        update: {
          onHand: { increment: adj.requestedDelta },
          available: { increment: adj.requestedDelta },
        },
      });

      // Add movement log for adjustment
      await tx.stockMovement.create({
        data: {
          id: uuidv4(),
          tenantId: tenantId,
          productId: adj.itemId,
          locationId: adj.locationId,
          toLocationId: adj.locationId,
          toDepartmentId: adj.departmentId || null,
          quantity: Math.abs(adj.requestedDelta),
          type: adj.requestedDelta > 0 ? "ADJUSTMENT_PLUS" : "ADJUSTMENT_MINUS",
          referenceId: `ADJ-${adj.id}`,
          referenceType: "ADJUSTMENT",
          performedBy: approvedBy,
        },
      });

      return {
        id: adj.id,
        tenant_id: adj.tenantId,
        itemId: adj.itemId,
        locationId: adj.locationId,
        departmentId: adj.departmentId || undefined,
        requestedDelta: adj.requestedDelta,
        reason: adj.reason,
        status: "approved" as const,
        requestedBy: adj.requestedBy,
        approvedBy: adj.approvedBy || undefined,
        approvedAt: adj.approvedAt || undefined,
        createdAt: adj.createdAt,
        updatedAt: adj.updatedAt,
      };
    });
  }

  async getAlerts(tenantId: string): Promise<InventoryAlert[]> {
    const alerts = await this.prisma.inventoryAlert.findMany({
      where: { tenantId: tenantId },
      orderBy: { createdAt: "desc" },
    });

    return alerts.map((a: any) => ({
      id: a.id,
      tenant_id: a.tenantId,
      alertType: a.type.toLowerCase() as any,
      severity: a.severity.toLowerCase() as any,
      status: a.status.toLowerCase() as any,
      entityId: a.entityId,
      message: a.message,
      createdAt: a.createdAt,
      updatedAt: a.updatedAt,
    }));
  }

  async setAlertStatus(
    tenantId: string,
    alertId: string,
    status: InventoryAlert["status"],
  ): Promise<InventoryAlert> {
    const alert = await this.prisma.inventoryAlert.update({
      where: { id: alertId, tenantId: tenantId },
      data: { status },
    });
    return {
      id: alert.id,
      tenant_id: alert.tenantId,
      alertType: alert.type.toLowerCase() as any,
      severity: alert.severity.toLowerCase() as any,
      status: alert.status.toLowerCase() as any,
      entityId: alert.entityId,
      message: alert.message,
      createdAt: alert.createdAt,
      updatedAt: alert.updatedAt,
    };
  }

  async getAuditCycles(tenantId: string): Promise<any[]> {
    return this.prisma.inventoryAuditCycle.findMany({
      where: { tenantId: tenantId },
    });
  }

  async createAuditCycle(tenantId: string, data: any): Promise<any> {
    return this.prisma.inventoryAuditCycle.create({
      data: {
        id: uuidv4(),
        updatedAt: new Date(),
        tenantId: tenantId,
        ...data,
      },
    });
  }

  async updateAuditCycle(
    tenantId: string,
    id: string,
    data: any,
  ): Promise<any> {
    return this.prisma.inventoryAuditCycle.update({
      where: { id, tenantId: tenantId },
      data,
    });
  }

  async getIntegrationEvents(tenantId: string): Promise<any[]> {
    return this.prisma.inventoryIntegrationEvent.findMany({
      where: { tenantId: tenantId },
    });
  }

  async createIntegrationEvent(tenantId: string, data: any): Promise<any> {
    return this.prisma.inventoryIntegrationEvent.create({
      data: {
        id: uuidv4(),
        updatedAt: new Date(),
        tenantId: tenantId,
        ...data,
      },
    });
  }

  async deleteItem(tenantId: string, itemId: string): Promise<void> {
    await this.prisma.itemMaster.update({
      where: { id: itemId, tenantId: tenantId },
      data: { status: "deleted" },
    });
  }

  async batchDeleteItems(tenantId: string, itemIds: string[]): Promise<void> {
    await this.prisma.itemMaster.updateMany({
      where: { id: { in: itemIds }, tenantId: tenantId },
      data: { status: "deleted" },
    });
  }

  async itemExistsBySku(tenantId: string, sku: string): Promise<boolean> {
    const count = await this.prisma.itemMaster.count({
      where: { tenantId: tenantId, sku: sku },
    });
    return count > 0;
  }

  async batchIntakeStock(
    tenantId: string,
    data: StockIntakeDto[],
  ): Promise<StockMovement[]> {
    return this.prisma.$transaction(async (tx) => {
      const movements: StockMovement[] = [];
      for (const intake of data) {
        const move = await this.intakeStock(tenantId, intake);
        movements.push(move);
      }
      return movements;
    });
  }

  async requestProcurement(tenantId: string, data: any): Promise<any> {
    // Creates a procurement requisition triggered by inventory low-stock
    // Uses a system user/employee; data should include: departmentId, reason, items[]
    const departmentId = data.departmentId || null;
    const requesterId = data.requestedBy || data.requesterId || null;

    // If we don't have departmentId or requesterId, just log and return placeholder
    if (!departmentId || !requesterId) {
      console.warn(
        "[InventoryService] requestProcurement: Missing departmentId or requesterId — skipping PR creation",
      );
      return { skipped: true, reason: "Missing departmentId or requesterId" };
    }

    const totalAmount = (data.items || []).reduce(
      (sum: number, item: any) =>
        sum + (item.quantity || 0) * (item.unitPrice || 0),
      0,
    );

    return this.prisma.procurementRequisition.create({
      data: {
        id: uuidv4(),
        updatedAt: new Date(),
        tenantId: tenantId,
        departmentId,
        requesterId,
        branchCode: data.branchCode || "HQ",
        title: data.title || "Auto-Restock from Inventory",
        description: data.reason || "Low-stock auto-generated procurement request",
        category: data.category || "GENERAL",
        budgetClass: data.budgetClass || "OPEX",
        amount: totalAmount || 0,
        currency: data.currency || "IDR",
        status: "DRAFT",
      },
    });
  }

  async batchCreateItems(
    tenantId: string,
    data: CreateItemDto[],
  ): Promise<InventoryItem[]> {
    return this.prisma.$transaction(async (tx) => {
      const results: InventoryItem[] = [];
      for (const itemData of data) {
        // Find or create category
        let category = await tx.productCategory.findFirst({
          where: { tenantId: tenantId, name: itemData.category },
        });

        if (!category) {
          category = await tx.productCategory.create({
            data: {
              id: uuidv4(),
              updatedAt: new Date(),
              tenantId: tenantId,
              name: itemData.category 
            },
          });
        }

        const product = await tx.itemMaster.create({
          data: {
            id: uuidv4(),
            updatedAt: new Date(),
            tenantId: tenantId,
            categoryId: category.id,
            name: itemData.name,
            sku: itemData.sku,
            barcode: itemData.sku,
            description: itemData.description ?? null,
            unit: itemData.uom ?? "unit",
            basePrice: itemData.basePrice ?? 0,
            taxRate: itemData.taxRate ?? 0,
            moduleTags: itemData.moduleTags ?? [],
            status: itemData.status || "active",
            departmentId: itemData.departmentId || null,
          },
          include: { productCategory: true },
        });

        results.push({
          id: product.id,
          tenant_id: product.tenantId,
          sku: product.sku,
          name: product.name,
          category: (product as any).productCategory.name as any,
          uom: product.unit,
          barcode: product.barcode,
          qrCode: product.barcode,
          moduleTags: (product as any).moduleTags || [],
          departmentId: product.departmentId || undefined,
          active: product.status === "active",
          createdAt: product.createdAt,
          updatedAt: product.updatedAt,
        });
      }
      return results;
    });
  }

  async getNextSequence(tenantId: string, category: string): Promise<number> {
        const count = await this.prisma.itemMaster.count({
          where: {
            tenantId,
            productCategory: { name: category },
          },
        });
    return count + 1;
  }

  async updateItemStatus(
    tenantId: string,
    itemId: string,
    status: string,
  ): Promise<InventoryItem> {
    const product = await this.prisma.itemMaster.update({
      where: { id: itemId, tenantId },
      data: { status },
      include: { productCategory: true },
    });

    return {
      id: product.id,
      tenant_id: product.tenantId,
      sku: product.sku,
      name: product.name,
      category: (product as any).productCategory.name as any,
      uom: product.unit,
      barcode: product.barcode,
      qrCode: product.barcode,
      moduleTags: (product as any).moduleTags || [],
      active: product.status === "active",
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
    };
  }

  async getPendingItems(tenantId: string): Promise<InventoryItem[]> {
    const products = await this.prisma.itemMaster.findMany({
      where: { tenantId, status: "pending" },
      include: { productCategory: true },
    });

    return (products as any[]).map((p) => ({
      id: p.id,
      tenant_id: p.tenantId,
      sku: p.sku,
      name: p.name,
      category: p.productCategory.name as any,
      uom: p.unit,
      barcode: p.barcode,
      qrCode: p.barcode,
      moduleTags: (p as any).moduleTags || [],
      active: false,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    }));
  }

  async createMovementRequest(
    tenant_id: string,
    data: CreateMovementRequestDto,
  ): Promise<MovementRequest> {
    const request = await this.prisma.inventoryMovementRequest.create({
      data: {
        id: uuidv4(),
        updatedAt: new Date(),
        tenantId: tenant_id,
        productId: data.productId,
        fromLocationId: data.fromLocationId,
        toLocationId: data.toLocationId,
        quantity: data.quantity,
        status: "PENDING",
        priority: data.priority || "MEDIUM",
      },
    });

    return {
      id: request.id,
      tenant_id: request.tenantId,
      productId: request.productId,
      fromLocationId: request.fromLocationId,
      toLocationId: request.toLocationId,
      quantity: request.quantity,
      priority: request.priority as any,
      status: request.status.toLowerCase() as any,
      requestedBy: request.requestedBy,
      createdAt: request.createdAt,
      updatedAt: request.updatedAt,
    };
  }

  async findHighestSkuByCategory(
    tenant_id: string,
    category: string,
  ): Promise<string | null> {
    const product = await this.prisma.itemMaster.findFirst({
      where: {
        tenantId: tenant_id,
        productCategory: { name: category },
      },
      orderBy: { sku: "desc" },
    });
    return product?.sku || null;
  }




  // --- Financial-Grade Hardening ---

  private async getLock(tx: any, tenantId: string, productId: string, locationId: string) {
    const rows: any[] = await tx.$queryRaw`
      SELECT id, on_hand AS "onHand", reserved, available, in_transit AS "inTransit"
      FROM stock_levels 
      WHERE tenant_id = ${tenantId} 
        AND product_id = ${productId} 
        AND location_id = ${locationId}
      FOR UPDATE
    `;
    return rows[0] || null;
  }

  async reserveStock(
    tenant_id: string,
    productId: string,
    locationId: string,
    quantity: number,
    referenceId: string,
    referenceType: string,
    tx?: any
  ): Promise<void> {
    const execute = async (t: any) => {
      const level = await this.getLock(t, tenant_id, productId, locationId);
      if (!level) throw new Error(`StockLevel not found for reservation`);
      
      // Strict Invariant: available >= quantity
      if (level.available < quantity) {
        throw new Error(`Insufficient available stock for reservation (Available: ${level.available}, Requested: ${quantity})`);
      }

      await t.stockLevel.update({
        where: { id: level.id },
        data: {
          reserved: { increment: quantity },
          available: { decrement: quantity },
        },
      });

      // Formal Reservation Record
      await t.stockReservation.create({
        data: {
          id: uuidv4(),
          updatedAt: new Date(),
          tenantId: tenant_id,
          productId,
          locationId,
          quantity,
          status: 'PENDING',
          referenceId,
          referenceType,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // Default 24h
        },
      });

      await t.stockMovement.create({
        data: {
        id: uuidv4(),
          tenantId: tenant_id,
          productId,
          locationId,
          toLocationId: locationId,
          quantity,
          type: 'RESERVE',
          referenceId,
          referenceType,
          reservationId: referenceId, // Linking for audit
          performedBy: 'system',
        },
      });
    };
    return tx ? execute(tx) : this.prisma.$transaction(execute);
  }

  async releaseStock(
    tenant_id: string,
    productId: string,
    locationId: string,
    quantity: number,
    referenceId: string,
    referenceType: string,
    tx?: any
  ): Promise<void> {
    const execute = async (t: any) => {
      const level = await this.getLock(t, tenant_id, productId, locationId);
      if (!level) throw new Error(`StockLevel not found for release`);
      
      // Strict Invariant: reserved >= quantity
      if (level.reserved < quantity) {
        throw new Error(`Insufficient reserved stock for release (Reserved: ${level.reserved}, Requested: ${quantity})`);
      }

      await t.stockLevel.update({
        where: { id: level.id },
        data: {
          reserved: { decrement: quantity },
          available: { increment: quantity },
        },
      });

      // Update Reservation Record
      await t.stockReservation.updateMany({
        where: { 
          tenantId: tenant_id, 
          referenceId, 
          productId, 
          status: 'PENDING' 
        },
        data: { status: 'RELEASED' },
      });

      await t.stockMovement.create({
        data: {
        id: uuidv4(),
          tenantId: tenant_id,
          productId,
          locationId,
          fromLocationId: locationId,
          quantity: -quantity,
          type: 'RELEASE',
          referenceId,
          referenceType,
          reservationId: referenceId,
          performedBy: 'system',
        },
      });
    };
    return tx ? execute(tx) : this.prisma.$transaction(execute);
  }

  async consumeFromReservation(
    tenant_id: string,
    productId: string,
    locationId: string,
    quantity: number,
    referenceId: string,
    referenceType: string,
    tx?: any
  ): Promise<void> {
    const execute = async (t: any) => {
      const level = await this.getLock(t, tenant_id, productId, locationId);
      if (!level) throw new Error(`StockLevel not found for consumption`);
      
      // Strict Invariants
      if (level.reserved < quantity) throw new Error(`Insufficient reserved stock (Reserved: ${level.reserved}, Requested: ${quantity})`);
      if (level.onHand < quantity) throw new Error(`Insufficient on-hand stock (OnHand: ${level.onHand}, Requested: ${quantity})`);

      await t.stockLevel.update({
        where: { id: level.id },
        data: {
          onHand: { decrement: quantity },
          reserved: { decrement: quantity },
          // available remains the same since both onHand and reserved drop by same amount
        },
      });

      // Update Reservation Record
      await t.stockReservation.updateMany({
        where: { 
          tenantId: tenant_id, 
          referenceId, 
          productId, 
          status: 'PENDING' 
        },
        data: { status: 'CONSUMED' },
      });

      await t.stockMovement.create({
        data: {
        id: uuidv4(),
          tenantId: tenant_id,
          productId,
          locationId,
          fromLocationId: locationId,
          quantity: -quantity,
          type: 'CONSUME_RESERVED',
          referenceId,
          referenceType,
          reservationId: referenceId,
          performedBy: 'system',
        },
      });
    };
    return tx ? execute(tx) : this.prisma.$transaction(execute);
  }

  async transferOut(
    tenant_id: string,
    productId: string,
    fromLocationId: string,
    toLocationId: string,
    quantity: number,
    referenceId: string,
    referenceType: string,
    transferGroupId?: string,
    tx?: any
  ): Promise<StockMovement> {
    const execute = async (t: any) => {
      const sourceLevel = await this.getLock(t, tenant_id, productId, fromLocationId);
      if (!sourceLevel || sourceLevel.available < quantity) throw new Error(`Insufficient stock for transfer out`);

      // 1. Source: Decrement onHand and available
      await t.stockLevel.update({
        where: { id: sourceLevel.id },
        data: {
          onHand: { decrement: quantity },
          available: { decrement: quantity },
        },
      });

      // 2. Destination: Increment inTransit
      await t.stockLevel.upsert({
        where: {
          locationId_productId_departmentId: {
            locationId: toLocationId,
            productId,
            departmentId: null as any,
          },
        },
        create: {
          tenantId: tenant_id,
          locationId: toLocationId,
          productId,
          onHand: 0,
          inTransit: quantity,
          available: 0,
        },
        update: {
          inTransit: { increment: quantity },
        },
      });

      return t.stockMovement.create({
        data: {
        id: uuidv4(),
          tenantId: tenant_id,
          productId,
          locationId: fromLocationId,
          fromLocationId,
          toLocationId,
          quantity: -quantity,
          type: 'TRANSFER_OUT',
          referenceId,
          referenceType,
          transferGroupId,
          performedBy: 'system',
        },
      });
    };
    return tx ? execute(tx) : this.prisma.$transaction(execute);
  }

  async transferIn(
    tenant_id: string,
    productId: string,
    fromLocationId: string,
    toLocationId: string,
    quantity: number,
    referenceId: string,
    referenceType: string,
    transferGroupId?: string,
    tx?: any
  ): Promise<StockMovement> {
    const execute = async (t: any) => {
      const destLevel = await this.getLock(t, tenant_id, productId, toLocationId);
      if (!destLevel || destLevel.inTransit < quantity) throw new Error(`Insufficient in-transit stock for transfer in (InTransit: ${destLevel.inTransit}, Requested: ${quantity})`);

      // 1. Decrement inTransit
      await t.stockLevel.update({
        where: { id: destLevel.id },
        data: {
          inTransit: { decrement: quantity },
          onHand: { increment: quantity },
          available: { increment: quantity },
        },
      });

      return t.stockMovement.create({
        data: {
        id: uuidv4(),
          tenantId: tenant_id,
          productId,
          locationId: toLocationId,
          fromLocationId,
          toLocationId,
          quantity: quantity,
          type: 'TRANSFER_IN',
          referenceId,
          referenceType,
          transferGroupId,
          performedBy: 'system',
        },
      });
    };
    return tx ? execute(tx) : this.prisma.$transaction(execute);
  }

  async takeSnapshot(tenant_id: string, locationId: string): Promise<void> {
    const levels = await this.prisma.stockLevel.findMany({
        where: { tenantId: tenant_id, locationId }
    });

    await this.prisma.stockSnapshot.createMany({
        data: levels.map(l => ({
            tenantId: tenant_id,
            locationId: l.locationId,
            productId: l.productId,
            onHand: l.onHand,
            reserved: l.reserved,
            available: l.available,
            inTransit: l.inTransit,
            snapshotAt: new Date(),
        }))
    });
  }

  // --- Stock State Upgrades (Helpers) ---
  async updateStockReserved(
    tenantId: string,
    productId: string,
    locationId: string,
    quantity: number,
    type: 'increment' | 'decrement',
    providedTx?: any
  ): Promise<void> {
    // Legacy helper - redirect to new formal methods if possible or keep logic
    return this.reserveStock(tenantId, productId, locationId, quantity, `UP-RES-${Date.now()}`, 'ADJUSTMENT', providedTx);
  }

  async updateStockInTransit(
    tenantId: string,
    productId: string,
    fromLocationId: string,
    toLocationId: string,
    quantity: number,
    type: 'increment' | 'decrement',
    providedTx?: any
  ): Promise<void> {
    // Helper used by service
    const execute = async (tx: any) => {
        if (type === 'increment') {
            await this.transferOut(tenantId, productId, fromLocationId, toLocationId, quantity, `TR-OUT-${Date.now()}`, 'TRANSFER', tx);
        } else {
            await this.transferIn(tenantId, productId, fromLocationId, toLocationId, quantity, `TR-IN-${Date.now()}`, 'TRANSFER', tx);
        }
    };
    return providedTx ? execute(providedTx) : this.prisma.$transaction(execute);
  }

  async findProductByCode(tenantId: string, code: string): Promise<any | null> {
    return this.prisma.itemMaster.findFirst({
      where: {
        tenantId,
        OR: [{ barcode: code }, { sku: code }],
      },
    });
  }

  // --- Agentic Layer ---
  async createAgenticEvent(
    tenantId: string,
    data: CreateAgenticEventDto,
  ): Promise<AgenticEvent> {
    const event = await this.prisma.agenticEvent.create({
      data: {
        id: uuidv4(),
        tenantId,
        eventType: data.eventType,
        entityId: data.entityId,
        entityType: data.entityType,
        payload: data.payload as any,
        sourceEventId: (data as any).sourceEventId || null,
        correlationId: (data as any).correlationId || null,
        status: "PENDING",
      },
    });
    return {
      id: event.id,
      tenantId: event.tenantId,
      eventType: event.eventType,
      entityId: event.entityId,
      entityType: event.entityType,
      payload: event.payload as any,
      status: event.status,
      processedAt: event.processedAt || undefined,
      errorMsg: event.errorMsg || undefined,
      createdAt: event.createdAt,
    };
  }
}
