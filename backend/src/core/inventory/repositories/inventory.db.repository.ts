import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../persistence/prisma.service";
import {
  IInventoryRepository,
  InventoryDashboard,
  InventoryItem,
  StockBalance,
  StockMovement,
  StockAdjustment,
  CreateItemDto,
  StockIntakeDto,
  TransferStockDto,
  CreateAdjustmentDto,
  InventoryAlert,
  CreateMovementRequestDto,
  MovementRequest,
} from "./inventory.repository.interface";
import {
  Product,
  Location,
  Department,
  StockLevel,
  InventoryAdjustment,
  InventoryAlert as PrismaInventoryAlert,
  StockMovement as PrismaStockMovement,
  ProductCategory,
} from "@prisma/client";

@Injectable()
export class InventoryDbRepository implements IInventoryRepository {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboard(tenantId: string): Promise<InventoryDashboard> {
    const totalItems = await this.prisma.product.count({
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
    const products = await this.prisma.product.findMany({
      where: {
        tenantId: tenantId,
        id: { in: stockLevels.map((s: StockLevel) => s.productId) },
      },
    });
    const productMap = new Map(products.map((p: Product) => [p.id, p]));
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

    const pendingReceiptSyncs = await this.prisma.procurementFinalPO.count({
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
    const products = await this.prisma.product.findMany({
      where: { tenantId: tenantId, status: { not: "deleted" } },
      include: { category: true },
      orderBy: { createdAt: "desc" },
    });

    return products.map((p: Product & { category: ProductCategory }) => ({
      id: p.id,
      tenant_id: p.tenantId,
      sku: p.sku,
      name: p.name,
      category: p.category.name as any,
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
        data: { tenantId: tenantId, name: data.category },
      });
    }

    const product = await this.prisma.product.create({
      data: {
        tenantId: tenantId,
        categoryId: category.id,
        name: data.name,
        sku: data.sku,
        barcode: data.sku, // Defaulting barcode to sku if not provided
        description: data.description ?? null,
        unit: data.uom ?? "unit",
        basePrice: data.basePrice ?? 0,
        taxRate: data.taxRate ?? 0,
        moduleTags: data.moduleTags ?? [],
        status: data.status || "active",
        departmentId: data.departmentId || null,
      },
      include: { category: true },
    });

    return {
      id: product.id,
      tenant_id: product.tenantId,
      sku: product.sku,
      name: product.name,
      category: product.category.name as any,
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
      include: { product: true, location: true, department: true },
    });

    return levels.map(
      (
        l: StockLevel & {
          product: Product;
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
        avgUnitCost: Number(l.product.basePrice || 0),
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
  ): Promise<StockMovement> {
    return this.prisma.$transaction(async (tx) => {
      // 1. Upsert stock level
      const level = await tx.stockLevel.upsert({
        where: {
          locationId_productId_departmentId: {
            locationId: data.locationId,
            productId: data.itemId,
            departmentId: data.departmentId ?? (null as any),
          },
        },
        create: {
          tenantId: tenantId,
          locationId: data.locationId,
          departmentId: data.departmentId || null,
          productId: data.itemId,
          onHand: data.quantity,
          available: data.quantity,
        },
        update: {
          onHand: { increment: data.quantity },
          available: { increment: data.quantity },
        },
      });

      // 2. Create movement
      const movement = await tx.stockMovement.create({
        data: {
          tenantId: tenantId,
          productId: data.itemId,
          toLocationId: data.locationId,
          toDepartmentId: data.departmentId || null,
          quantity: data.quantity,
          unitCost: data.unitCost,
          type: "INTAKE",
          referenceId: data.referenceId || `INTAKE-${Date.now()}`,
          performedBy: data.createdBy || "system",
        },
      });

      return {
        id: movement.id,
        tenant_id: movement.tenantId,
        itemId: movement.productId,
        movementType: "intake",
        quantity: movement.quantity,
        unitCost: Number(movement.unitCost),
        reason: "Intake",
        destinationLocationId: movement.toLocationId!,
        destinationDepartmentId: movement.toDepartmentId || undefined,
        referenceId: movement.referenceId,
        createdBy: movement.performedBy,
        createdAt: movement.createdAt,
      };
    });
  }

  async consumeStock(tenantId: string, data: any): Promise<any> {
    // 1. Decrement stock level
    const level = await this.prisma.stockLevel.update({
      where: {
        locationId_productId_departmentId: {
          locationId: data.locationId,
          productId: data.itemId,
          departmentId: data.departmentId ?? (null as any),
        },
      },
      data: {
        onHand: { decrement: data.quantity },
        available: { decrement: data.quantity },
      },
    });

    // 2. Create movement
    const movement = await this.prisma.stockMovement.create({
      data: {
        tenantId: tenantId,
        productId: data.itemId,
        fromLocationId: data.locationId,
        quantity: data.quantity,
        type: "OUT",
        referenceId: data.referenceId || `CONSUME-${Date.now()}`,
        performedBy: data.performedBy || "system",
      },
    });

    return movement;
  }

  async transferStock(
    tenantId: string,
    data: TransferStockDto,
  ): Promise<StockMovement[]> {
    return this.prisma.$transaction(async (tx): Promise<StockMovement[]> => {
      // Decrement source
      await tx.stockLevel.update({
        where: {
          locationId_productId_departmentId: {
            locationId: data.fromLocationId,
            productId: data.itemId,
            departmentId: data.fromDepartmentId ?? (null as any),
          },
        },
        data: {
          onHand: { decrement: data.quantity },
          available: { decrement: data.quantity },
        },
      });

      // Increment dest
      await tx.stockLevel.upsert({
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

      // Create movement records
      const outMove = await tx.stockMovement.create({
        data: {
          tenantId: tenantId,
          productId: data.itemId,
          fromLocationId: data.fromLocationId,
          fromDepartmentId: data.fromDepartmentId || null,
          toLocationId: data.toLocationId,
          toDepartmentId: data.toDepartmentId || null,
          quantity: data.quantity,
          type: "TRANSFER",
          referenceId: `TRANSFER-${Date.now()}`,
          performedBy: data.createdBy || "system",
        },
      });

      return [
        {
          id: outMove.id,
          tenant_id: outMove.tenantId,
          itemId: outMove.productId,
          movementType: "transfer_out",
          quantity: outMove.quantity,
          unitCost: 0,
          reason: "Transfer",
          sourceLocationId: outMove.fromLocationId!,
          sourceDepartmentId: outMove.fromDepartmentId || undefined,
          destinationLocationId: outMove.toLocationId!,
          destinationDepartmentId: outMove.toDepartmentId || undefined,
          referenceId: outMove.referenceId,
          createdBy: outMove.performedBy,
          createdAt: outMove.createdAt,
        },
      ];
    });
  }

  async getAdjustments(tenantId: string): Promise<StockAdjustment[]> {
    const adjs = await this.prisma.inventoryAdjustment.findMany({
      where: { tenantId: tenantId },
      orderBy: { createdAt: "desc" },
    });

    return adjs.map((a: InventoryAdjustment) => ({
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
  ): Promise<StockAdjustment> {
    const adj = await this.prisma.inventoryAdjustment.create({
      data: {
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
  ): Promise<StockAdjustment> {
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
          tenantId: tenantId,
          productId: adj.itemId,
          toLocationId: adj.locationId,
          toDepartmentId: adj.departmentId || null,
          quantity: Math.abs(adj.requestedDelta),
          type: adj.requestedDelta > 0 ? "ADJUSTMENT_PLUS" : "ADJUSTMENT_MINUS",
          referenceId: `ADJ-${adj.id}`,
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
        tenantId: tenantId,
        ...data,
      },
    });
  }

  async deleteItem(tenantId: string, itemId: string): Promise<void> {
    await this.prisma.product.update({
      where: { id: itemId, tenantId: tenantId },
      data: { status: "deleted" },
    });
  }

  async batchDeleteItems(tenantId: string, itemIds: string[]): Promise<void> {
    await this.prisma.product.updateMany({
      where: { id: { in: itemIds }, tenantId: tenantId },
      data: { status: "deleted" },
    });
  }

  async itemExistsBySku(tenantId: string, sku: string): Promise<boolean> {
    const count = await this.prisma.product.count({
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
            data: { tenantId: tenantId, name: itemData.category },
          });
        }

        const product = await tx.product.create({
          data: {
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
          include: { category: true },
        });

        results.push({
          id: product.id,
          tenant_id: product.tenantId,
          sku: product.sku,
          name: product.name,
          category: product.category.name as any,
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
    const count = await this.prisma.product.count({
      where: {
        tenantId,
        category: { name: category },
      },
    });
    return count + 1;
  }

  async updateItemStatus(
    tenantId: string,
    itemId: string,
    status: string,
  ): Promise<InventoryItem> {
    const product = await this.prisma.product.update({
      where: { id: itemId, tenantId },
      data: { status },
      include: { category: true },
    });

    return {
      id: product.id,
      tenant_id: product.tenantId,
      sku: product.sku,
      name: product.name,
      category: product.category.name as any,
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
    const products = await this.prisma.product.findMany({
      where: { tenantId, status: "pending" },
      include: { category: true },
    });

    return products.map((p) => ({
      id: p.id,
      tenant_id: p.tenantId,
      sku: p.sku,
      name: p.name,
      category: p.category.name as any,
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
    // Persist each line as a stock movement record with type MOVEMENT_REQUEST
    // This is the audit-safe approach until a dedicated MovementRequest table is added
    const referenceId = `MVR-${Date.now()}`;
    const movements = await this.prisma.$transaction(async (tx) => {
      const results = [];
      for (const line of data.lines) {
        // Try to find the product by SKU
        const product = await tx.product.findFirst({
          where: { tenantId: tenant_id, sku: line.sku },
        });
        if (!product) continue; // Skip lines without a matching product

        const mov = await tx.stockMovement.create({
          data: {
            tenantId: tenant_id,
            productId: product.id,
            fromLocationId: data.sourceLocationId || null,
            toLocationId: data.requestingLocationId,
            quantity: line.quantity,
            type: "MOVEMENT_REQUEST",
            referenceId,
            performedBy: "system",
          },
        });
        results.push(mov);
      }
      return results;
    });

    return {
      id: referenceId,
      tenant_id,
      type: data.type,
      requestingLocationId: data.requestingLocationId,
      sourceType: data.sourceType,
      lines: data.lines,
      reason: data.reason,
      status: "pending",
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any;
  }

  async findHighestSkuByCategory(
    tenantId: string,
    category: string,
  ): Promise<string | null> {
    const product = await this.prisma.product.findFirst({
      where: {
        tenantId,
        category: {
          name: category,
        },
      },
      orderBy: { sku: "desc" },
    });
    return product?.sku || null;
  }
}
