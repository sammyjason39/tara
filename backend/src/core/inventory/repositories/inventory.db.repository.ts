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
  product_categories as ProductCategory,
  locations as Location,
  departments as Department,
  stock_levels as StockLevel,
  inventory_adjustments as PrismaInventoryAdjustment,
  inventory_alerts as PrismaInventoryAlert,
  stock_movements as PrismaStockMovement,
  agentic_events as PrismaAgenticEvent,
  item_masters as ItemMaster,
} from "@prisma/client";

@Injectable()
export class InventoryDbRepository implements IInventoryRepository {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboard(tenant_id: string): Promise<InventoryDashboard> {
    const totalItems = await this.prisma.item_masters.count({
      where: { tenant_id: tenant_id },
    });
    const totalLocations = await this.prisma.locations.count({
      where: { tenant_id: tenant_id },
    });
    const totalDepartments = await this.prisma.departments.count({
      where: { tenant_id: tenant_id },
    });

    const stockLevels = await this.prisma.stock_levels.findMany({
      where: { tenant_id: tenant_id },
    });
    const totalOnHandQty = stockLevels.reduce(
      (sum: number, level: StockLevel) => sum + Number(level.on_hand),
      0,
    );

    // Valuation logic would need product cost, using base_price for now
    const products = await this.prisma.item_masters.findMany({
      where: {
        tenant_id: tenant_id,
        id: { in: stockLevels.map((s: StockLevel) => s.product_id) },
      },
    });
    const productMap = new Map(products.map((p: ItemMaster) => [p.id, p]));
    const totalValuation = stockLevels.reduce(
      (sum: number, level: StockLevel) => {
        const product = productMap.get(level.product_id);
        return sum + Number(level.on_hand) * (Number(product?.base_price) || 0);
      },
      0,
    );

    const pendingAdjustments = await this.prisma.inventory_adjustments.count({
      where: { tenant_id: tenant_id, status: "PENDING_APPROVAL" },
    });

    // Placeholder checks for now
    const lowStockCount = await this.prisma.inventory_alerts.count({
      where: { tenant_id: tenant_id, type: "LOW_STOCK", status: "OPEN" },
    });
    const expiryWarningCount = await this.prisma.inventory_alerts.count({
      where: { tenant_id: tenant_id, type: "EXPIRY_WARNING", status: "OPEN" },
    });

    const pendingReceiptSyncs = await this.prisma.procurement_final_pos.count({
      where: {
        tenant_id: tenant_id,
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

  async getItems(tenant_id: string): Promise<InventoryItem[]> {
    const products = await this.prisma.item_masters.findMany({
      where: { tenant_id: tenant_id, status: { not: "deleted" } },
      include: { product_categories: true },
      orderBy: { created_at: "desc" },
    });

    return (products as any[]).map((p) => ({
      id: p.id,
      tenant_id: p.tenant_id,
      sku: p.sku,
      name: p.name,
      category: p.productCategory?.name as any,
      uom: p.unit,
      barcode: p.barcode,
      qrCode: p.barcode,
      moduleTags: (p as any).module_tags || [],
      departmentId: p.department_id || undefined,
      active: p.status === "active",
      created_at: p.created_at,
      updated_at: p.updated_at,
    }));
  }

  async createItem(
    tenant_id: string,
    data: CreateItemDto,
  ): Promise<InventoryItem> {
    // Find or create category
    let category = await this.prisma.product_categories.findFirst({
      where: { tenant_id: tenant_id, name: data.category },
    });

    if (!category) {
      category = await this.prisma.product_categories.create({
        data: {
          id: uuidv4(),
          updated_at: new Date(),
          tenant_id: tenant_id,
          name: data.category 
        },
      });
    }

    const product = await this.prisma.item_masters.create({
      data: {
        id: uuidv4(),
        updated_at: new Date(),
        tenant_id: tenant_id,
        category_id: category.id,
        name: data.name,
        sku: data.sku,
        barcode: data.sku,
        description: data.description ?? null,
        unit: data.uom ?? "unit",
        base_price: data.base_price ?? 0,
        tax_rate: data.taxRate ?? 0,
        module_tags: data.moduleTags ?? [],
        status: data.status || "active",
        department_id: data.departmentId || null,
      },
      include: { product_categories: true },
    });

    return {
      id: product.id,
      tenant_id: product.tenant_id,
      sku: product.sku,
      name: product.name,
      category: (product as any).product_categories.name as any,
      uom: product.unit,
      barcode: product.barcode,
      qrCode: product.barcode,
      moduleTags: (product as any).moduleTags || [],
      active: product.status === "active",
      departmentId: product.department_id || undefined,
      created_at: product.created_at,
      updated_at: product.updated_at,
    };
  }

  async getBalances(
    tenant_id: string,
    location_id?: string,
    departmentId?: string,
  ): Promise<StockBalance[]> {
    const where: any = { tenant_id: tenant_id };
    if (location_id) where.location_id = location_id;
    if (departmentId) where.department_id = departmentId;

    const levels = await this.prisma.stock_levels.findMany({
      where,
      include: { item_masters: true, locations: true, departments: true },
    });

    return levels.map(
      (
        l: any
      ) => ({
        id: l.id,
        tenant_id: l.tenant_id,
        item_id: l.product_id,
        location_id: l.location_id,
        departmentId: l.department_id || undefined,
        quantity: l.on_hand,
        reservedQuantity: l.reserved,
        inTransitQuantity: l.in_transit,
        avgUnitCost: Number(l.base_price || 0),
        reorderPoint: l.min_buffer,
        safetyStock: l.min_buffer,
        updated_at: l.updated_at,
      }),
    );
  }

  async getMovements(
    tenant_id: string,
    item_id?: string,
  ): Promise<StockMovement[]> {
    const where: any = { tenant_id: tenant_id };
    if (item_id) where.product_id = item_id;

    const movements = await this.prisma.stock_movements.findMany({
      where,
      orderBy: { created_at: "desc" },
      take: 100, // Limit for safety
    });

    return movements.map((m: any) => ({
      id: m.id,
      tenant_id: m.tenant_id,
      item_id: m.product_id,
      movementType: m.type.toLowerCase() as any,
      quantity: m.quantity,
      unitCost: 0,
      reason: "Movement",
      sourceLocationId: m.from_location_id || undefined,
      destinationLocationId: m.to_location_id || undefined,
      referenceId: m.reference_id,
      createdBy: m.performed_by,
      created_at: m.created_at,
    }));
  }

  async intakeStock(
    tenant_id: string,
    data: StockIntakeDto,
    providedTx?: any
  ): Promise<StockMovement> {
    const execute = async (tx: any) => {
      // 1. Lock Row (or create if missing)
      let level = await this.getLock(tx, tenant_id, data.item_id, data.location_id);
      
      if (!level) {
        level = await tx.stock_levels.create({
          data: {
            id: uuidv4(),
            updated_at: new Date(),
            tenant_id: tenant_id,
            location_id: data.location_id,
            department_id: data.departmentId || null,
            product_id: data.item_id,
            on_hand: data.quantity,
            available: data.quantity,
          },
        });
      } else {
        await tx.stock_levels.update({
          where: { id: level.id },
          data: {
            on_hand: { increment: data.quantity },
            available: { increment: data.quantity },
          },
        });
      }

      // 2. Create movement
      const movement = await tx.stock_movements.create({
        data: {
          id: uuidv4(),
          updated_at: new Date(),
          tenant_id: tenant_id,
          product_id: data.item_id,
          location_id: data.location_id, 
          to_location_id: data.location_id,
          to_department_id: data.departmentId || null,
          quantity: data.quantity,
          unit_cost: data.unitCost,
          type: "INTAKE",
          reference_id: data.referenceId || `INTAKE-${Date.now()}`,
          reference_type: data.referenceType || 'MANUAL',
          performed_by: data.createdBy || "system",
        },
      });

      return {
        id: movement.id,
        tenant_id: movement.tenant_id,
        item_id: movement.product_id,
        movementType: "intake" as any,
        quantity: movement.quantity,
        unitCost: Number(movement.unitCost),
        reason: "Intake",
        destinationLocationId: movement.toLocationId!,
        destinationDepartmentId: movement.toDepartmentId || undefined,
        referenceId: movement.referenceId,
        createdBy: movement.performedBy,
        created_at: movement.created_at,
      };
    };

    return providedTx ? execute(providedTx) : this.prisma.$transaction(execute);
  }

  async consumeStock(tenant_id: string, data: any, providedTx?: any): Promise<any> {
    const execute = async (tx: any) => {
      // 1. Lock and check
      const level = await this.getLock(tx, tenant_id, data.item_id, data.location_id);
      if (!level) throw new Error(`StockLevel not found for consumption`);
      if (level.available < data.quantity) throw new Error(`Insufficient available stock (Available: ${level.available}, Requested: ${data.quantity})`);

      // 2. Decrement stock level
      await tx.stock_levels.update({
        where: { id: level.id },
        data: {
          on_hand: { decrement: data.quantity },
          available: { decrement: data.quantity },
        },
      });

      // 3. Create movement
      const movement = await tx.stock_movements.create({
        data: {
          id: uuidv4(),
          updated_at: new Date(),
          tenant_id: tenant_id,
          product_id: data.item_id,
          location_id: data.location_id, 
          from_location_id: data.location_id,
          quantity: -data.quantity,
          type: "OUT",
          reference_id: data.referenceId || `CONSUME-${Date.now()}`,
          reference_type: data.referenceType || 'MANUAL',
          performed_by: data.performedBy || "system",
        },
      });

      return movement;
    };

    return providedTx ? execute(providedTx) : this.prisma.$transaction(execute);
  }

  async transferStock(
    tenant_id: string,
    data: TransferStockDto,
  ): Promise<StockMovement[]> {
    // For legacy immediate transfer, we use a single transaction but lock both rows
    return this.prisma.$transaction(async (tx): Promise<StockMovement[]> => {
      const source = await this.getLock(tx, tenant_id, data.item_id, data.fromLocationId);
      if (!source || source.available < data.quantity) throw new Error(`Insufficient source stock for transfer`);

      // 1. Decrement source
      await tx.stock_levels.update({
        where: { id: source.id },
        data: {
          on_hand: { decrement: data.quantity },
          available: { decrement: data.quantity },
        },
      });

      // 2. Increment dest (standard immediate logic)
      const dest = await tx.stock_levels.upsert({
        where: {
          location_id_product_id_department_id: {
            location_id: data.toLocationId,
            product_id: data.item_id,
            department_id: data.toDepartmentId ?? (null as any),
          },
        },
        create: {
          tenant_id: tenant_id,
          location_id: data.toLocationId,
          department_id: data.toDepartmentId || null,
          product_id: data.item_id,
          on_hand: data.quantity,
          available: data.quantity,
        },
        update: {
          on_hand: { increment: data.quantity },
          available: { increment: data.quantity },
        },
      });

      // 3. Create movement records
      const outMove = await tx.stock_movements.create({
        data: {
          id: uuidv4(),
          tenant_id: tenant_id,
          product_id: data.item_id,
          location_id: data.fromLocationId, // Mandatory location_id
          from_location_id: data.fromLocationId,
          from_department_id: data.fromDepartmentId || null,
          to_location_id: data.toLocationId,
          to_department_id: data.toDepartmentId || null,
          quantity: -data.quantity,
          type: "TRANSFER_OUT",
          reference_id: data.referenceId || `TR-${Date.now()}`,
          reference_type: data.referenceType || 'INTERNAL',
          performed_by: data.createdBy || "system",
        },
      });

      const inMove = await tx.stock_movements.create({
        data: {
          id: uuidv4(),
          tenant_id: tenant_id,
          product_id: data.item_id,
          location_id: data.toLocationId, // Mandatory location_id
          from_location_id: data.fromLocationId,
          from_department_id: data.fromDepartmentId || null,
          to_location_id: data.toLocationId,
          to_department_id: data.toDepartmentId || null,
          quantity: data.quantity,
          type: "TRANSFER_IN",
          reference_id: data.referenceId || `TR-${Date.now()}`,
          reference_type: data.referenceType || 'INTERNAL',
          performed_by: data.createdBy || "system",
        },
      });

      return [outMove as any, inMove as any];
    });
  }

  async getAdjustments(tenant_id: string): Promise<InventoryAdjustment[]> {
    const adjs = await this.prisma.inventory_adjustments.findMany({
      where: { tenant_id: tenant_id },
      orderBy: { created_at: "desc" },
    });

    return adjs.map((a: any) => ({
      id: a.id,
      tenant_id: a.tenant_id,
      item_id: a.item_id,
      location_id: a.location_id,
      departmentId: a.department_id || undefined,
      requestedDelta: Number(a.requested_delta),
      reason: a.reason,
      status: a.status.toLowerCase() as any,
      requested_by: a.requested_by,
      approvedBy: a.approved_by || undefined,
      approvedAt: a.approved_at || undefined,
      created_at: a.created_at,
      updated_at: a.updated_at,
    }));
  }

  async createAdjustment(
    tenant_id: string,
    data: CreateAdjustmentDto,
    providedTx?: any
  ): Promise<InventoryAdjustment> {
    const db = providedTx || this.prisma;
    const adj = await db.inventory_adjustments.create({
      data: {
        id: uuidv4(),
        updated_at: new Date(),
        tenant_id: tenant_id,
        item_id: data.item_id,
        location_id: data.location_id,
        department_id: data.departmentId || null,
        requested_delta: data.requestedDelta,
        reason: data.reason,
        status: "PENDING_APPROVAL",
        requested_by: data.requested_by || "system",
      },
    });

    return {
      id: adj.id,
      tenant_id: adj.tenant_id,
      item_id: adj.item_id,
      location_id: adj.location_id,
      departmentId: adj.department_id || undefined,
      requestedDelta: Number(adj.requested_delta),
      reason: adj.reason,
      status: "pending" as const,
      requested_by: adj.requested_by,
      created_at: adj.created_at,
      updated_at: adj.updated_at,
    };
  }

  async approveAdjustment(
    tenant_id: string,
    adjustmentId: string,
    approvedBy: string,
  ): Promise<InventoryAdjustment> {
    return this.prisma.$transaction(async (tx) => {
      const adj = await tx.inventory_adjustments.update({
        where: { id: adjustmentId, tenant_id: tenant_id },
        data: {
          status: "APPROVED",
          approved_by: approvedBy,
          approved_at: new Date(),
        },
      });

      const level = await tx.stock_levels.upsert({
        where: {
          location_id_product_id_department_id: {
            location_id: adj.location_id,
            product_id: adj.item_id,
            department_id: adj.department_id ?? (null as any),
          },
        },
        create: {
          tenant_id: tenant_id,
          location_id: adj.location_id,
          department_id: adj.department_id || null,
          product_id: adj.item_id,
          on_hand: adj.requested_delta,
          available: adj.requested_delta,
        },
        update: {
          on_hand: { increment: adj.requested_delta },
          available: { increment: adj.requested_delta },
        },
      });

      // Add movement log for adjustment
      await tx.stock_movements.create({
        data: {
          id: uuidv4(),
          tenant_id: tenant_id,
          product_id: adj.item_id,
          location_id: adj.location_id,
          to_location_id: adj.location_id,
          to_department_id: adj.department_id || null,
          quantity: Math.abs(Number(adj.requested_delta)),
          type: Number(adj.requested_delta) > 0 ? "ADJUSTMENT_PLUS" : "ADJUSTMENT_MINUS",
          reference_id: `ADJ-${adj.id}`,
          reference_type: "ADJUSTMENT",
          performed_by: approvedBy,
        },
      });

      return {
        id: adj.id,
        tenant_id: adj.tenant_id,
        item_id: adj.item_id,
        location_id: adj.location_id,
        departmentId: adj.department_id || undefined,
        requestedDelta: Number(adj.requested_delta),
        reason: adj.reason,
        status: "approved" as const,
        requested_by: adj.requested_by,
        approvedBy: adj.approved_by || undefined,
        approvedAt: adj.approved_at || undefined,
        created_at: adj.created_at,
        updated_at: adj.updated_at,
      };
    });
  }

  async getAlerts(tenant_id: string): Promise<InventoryAlert[]> {
    const alerts = await this.prisma.inventory_alerts.findMany({
      where: { tenant_id: tenant_id },
      orderBy: { created_at: "desc" },
    });

    return alerts.map((a: any) => ({
      id: a.id,
      tenant_id: a.tenant_id,
      alertType: a.type.toLowerCase() as any,
      severity: a.severity.toLowerCase() as any,
      status: a.status.toLowerCase() as any,
      entity_id: a.entity_id,
      message: a.message,
      created_at: a.created_at,
      updated_at: a.updated_at,
    }));
  }

  async setAlertStatus(
    tenant_id: string,
    alertId: string,
    status: InventoryAlert["status"],
  ): Promise<InventoryAlert> {
    const alert = await this.prisma.inventory_alerts.update({
      where: { id: alertId, tenant_id: tenant_id },
      data: { status },
    });
    return {
      id: alert.id,
      tenant_id: alert.tenant_id,
      alertType: alert.type.toLowerCase() as any,
      severity: alert.severity.toLowerCase() as any,
      status: alert.status.toLowerCase() as any,
      entity_id: alert.entity_id,
      message: alert.message,
      created_at: alert.created_at,
      updated_at: alert.updated_at,
    };
  }

  async getAuditCycles(tenant_id: string): Promise<any[]> {
    return this.prisma.inventory_audit_cycles.findMany({
      where: { tenant_id: tenant_id },
    });
  }

  async createAuditCycle(tenant_id: string, data: any): Promise<any> {
    return this.prisma.inventory_audit_cycles.create({
      data: {
        id: uuidv4(),
        updated_at: new Date(),
        tenant_id: tenant_id,
        ...data,
      },
    });
  }

  async updateAuditCycle(
    tenant_id: string,
    id: string,
    data: any,
  ): Promise<any> {
    return this.prisma.inventory_audit_cycles.update({
      where: { id, tenant_id: tenant_id },
      data,
    });
  }

  async getIntegrationEvents(tenant_id: string): Promise<any[]> {
    return this.prisma.inventory_integration_events.findMany({
      where: { tenant_id: tenant_id },
    });
  }

  async createIntegrationEvent(tenant_id: string, data: any): Promise<any> {
    return this.prisma.inventory_integration_events.create({
      data: {
        id: uuidv4(),
        updated_at: new Date(),
        tenant_id: tenant_id,
        ...data,
      },
    });
  }

  async deleteItem(tenant_id: string, item_id: string): Promise<void> {
    await this.prisma.item_masters.update({
      where: { id: item_id, tenant_id: tenant_id },
      data: { status: "deleted" },
    });
  }

  async batchDeleteItems(tenant_id: string, itemIds: string[]): Promise<void> {
    await this.prisma.item_masters.updateMany({
      where: { id: { in: itemIds }, tenant_id: tenant_id },
      data: { status: "deleted" },
    });
  }

  async itemExistsBySku(tenant_id: string, sku: string): Promise<boolean> {
    const count = await this.prisma.item_masters.count({
      where: { tenant_id: tenant_id, sku: sku },
    });
    return count > 0;
  }

  async batchIntakeStock(
    tenant_id: string,
    data: StockIntakeDto[],
  ): Promise<StockMovement[]> {
    return this.prisma.$transaction(async (tx) => {
      const movements: StockMovement[] = [];
      for (const intake of data) {
        const move = await this.intakeStock(tenant_id, intake);
        movements.push(move);
      }
      return movements;
    });
  }

  async requestProcurement(tenant_id: string, data: any): Promise<any> {
    // Creates a procurement requisition triggered by inventory low-stock
    // Uses a system user/employee; data should include: departmentId, reason, items[]
    const departmentId = data.departmentId || null;
    const requesterId = data.requested_by || data.requesterId || null;

    // If we don't have departmentId or requesterId, just log and return placeholder
    if (!departmentId || !requesterId) {
      console.warn(
        "[InventoryService] requestProcurement: Missing departmentId or requesterId — skipping PR creation",
      );
      return { skipped: true, reason: "Missing departmentId or requesterId" };
    }

    const total_amount = (data.items || []).reduce(
      (sum: number, item: any) =>
        sum + (item.quantity || 0) * (item.unit_price || 0),
      0,
    );

    return this.prisma.procurement_requisitions.create({
      data: {
        id: uuidv4(),
        updated_at: new Date(),
        tenant_id: tenant_id,
        department_id: departmentId,
        requester_id: requesterId,
        branch_code: data.branchCode || "HQ",
        title: data.title || "Auto-Restock from Inventory",
        description: data.reason || "Low-stock auto-generated procurement request",
        category: data.category || "GENERAL",
        budget_class: data.budgetClass || "OPEX",
        amount: total_amount || 0,
        currency: data.currency || "IDR",
        status: "DRAFT",
      },
    });
  }

  async batchCreateItems(
    tenant_id: string,
    data: CreateItemDto[],
  ): Promise<InventoryItem[]> {
    return this.prisma.$transaction(async (tx) => {
      const results: InventoryItem[] = [];
      for (const itemData of data) {
        // Find or create category
        let category = await tx.product_categories.findFirst({
          where: { tenant_id: tenant_id, name: itemData.category },
        });

        if (!category) {
          category = await tx.product_categories.create({
            data: {
              id: uuidv4(),
              updated_at: new Date(),
              tenant_id: tenant_id,
              name: itemData.category 
            },
          });
        }

        const product = await tx.item_masters.create({
          data: {
            id: uuidv4(),
            updated_at: new Date(),
            tenant_id: tenant_id,
            category_id: category.id,
            name: itemData.name,
            sku: itemData.sku,
            barcode: itemData.sku,
            description: itemData.description ?? null,
            unit: itemData.uom ?? "unit",
            base_price: itemData.base_price ?? 0,
            tax_rate: itemData.taxRate ?? 0,
            module_tags: itemData.moduleTags ?? [],
            status: itemData.status || "active",
            department_id: itemData.departmentId || null,
          },
          include: { product_categories: true },
        });

        results.push({
          id: product.id,
          tenant_id: product.tenant_id,
          sku: product.sku,
          name: product.name,
          category: (product as any).product_categories.name as any,
          uom: product.unit,
          barcode: product.barcode,
          qrCode: product.barcode,
          moduleTags: (product as any).moduleTags || [],
          departmentId: product.department_id || undefined,
          active: product.status === "active",
          created_at: product.created_at,
          updated_at: product.updated_at,
        });
      }
      return results;
    });
  }

  async getNextSequence(tenant_id: string, category: string): Promise<number> {
        const count = await this.prisma.item_masters.count({
          where: {
            tenant_id: tenant_id,
            product_categories: { name: category },
          },
        });
    return count + 1;
  }

  async updateItemStatus(
    tenant_id: string,
    item_id: string,
    status: string,
  ): Promise<InventoryItem> {
    const product = await this.prisma.item_masters.update({
      where: { id: item_id, tenant_id: tenant_id },
      data: { status },
      include: { product_categories: true },
    });

    return {
      id: product.id,
      tenant_id: product.tenant_id,
      sku: product.sku,
      name: product.name,
      category: (product as any).productCategory.name as any,
      uom: product.unit,
      barcode: product.barcode,
      qrCode: product.barcode,
      moduleTags: (product as any).moduleTags || [],
      active: product.status === "active",
      created_at: product.created_at,
      updated_at: product.updated_at,
    };
  }

  async getPendingItems(tenant_id: string): Promise<InventoryItem[]> {
    const products = await this.prisma.item_masters.findMany({
      where: { tenant_id: tenant_id, status: "pending" },
      include: { product_categories: true },
    });

    return (products as any[]).map((p) => ({
      id: p.id,
      tenant_id: p.tenant_id,
      sku: p.sku,
      name: p.name,
      category: p.productCategory.name as any,
      uom: p.unit,
      barcode: p.barcode,
      qrCode: p.barcode,
      moduleTags: (p as any).moduleTags || [],
      active: false,
      created_at: p.created_at,
      updated_at: p.updated_at,
    }));
  }

  async createMovementRequest(
    tenant_id: string,
    data: CreateMovementRequestDto,
  ): Promise<MovementRequest> {
    const request = await this.prisma.inventory_movement_requests.create({
      data: {
        id: uuidv4(),
        updated_at: new Date(),
        tenant_id: tenant_id,
        product_id: data.product_id,
        from_location_id: data.fromLocationId,
        to_location_id: data.toLocationId,
        quantity: data.quantity,
        status: "PENDING",
        priority: data.priority || "MEDIUM",
      },
    });

    return {
      id: request.id,
      tenant_id: request.tenant_id,
      product_id: request.product_id,
      fromLocationId: request.from_location_id,
      toLocationId: request.to_location_id,
      quantity: request.quantity,
      priority: request.priority as any,
      status: request.status.toLowerCase() as any,
      requested_by: (request as any).requestedBy,
      created_at: request.created_at,
      updated_at: request.updated_at,
    };
  }

  async findHighestSkuByCategory(
    tenant_id: string,
    category: string,
  ): Promise<string | null> {
    const product = await this.prisma.item_masters.findFirst({
      where: {
        tenant_id: tenant_id,
        product_categories: { name: category },
      },
      orderBy: { sku: "desc" },
    });
    return product?.sku || null;
  }




  // --- Financial-Grade Hardening ---

  private async getLock(tx: any, tenant_id: string, product_id: string, location_id: string) {
    const rows: any[] = await tx.$queryRaw`
      SELECT id, on_hand AS "onHand", reserved, available, in_transit AS "inTransit"
      FROM stock_levels 
      WHERE tenant_id = ${tenant_id} 
        AND product_id = ${product_id} 
        AND location_id = ${location_id}
      FOR UPDATE
    `;
    return rows[0] || null;
  }

  async reserveStock(
    tenant_id: string,
    product_id: string,
    location_id: string,
    quantity: number,
    referenceId: string,
    referenceType: string,
    tx?: any
  ): Promise<void> {
    const execute = async (t: any) => {
      const level = await this.getLock(t, tenant_id, product_id, location_id);
      if (!level) throw new Error(`StockLevel not found for reservation`);
      
      // Strict Invariant: available >= quantity
      if (level.available < quantity) {
        throw new Error(`Insufficient available stock for reservation (Available: ${level.available}, Requested: ${quantity})`);
      }

      await t.stock_levels.update({
        where: { id: level.id },
        data: {
          reserved: { increment: quantity },
          available: { decrement: quantity },
        },
      });

      await t.stock_reservations.create({
        data: {
          id: uuidv4(),
          updated_at: new Date(),
          tenant_id: tenant_id,
          product_id: product_id,
          location_id: location_id,
          quantity,
          status: 'PENDING',
          reference_id: referenceId,
          reference_type: referenceType,
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000), // Default 24h
        },
      });

      await t.stock_movements.create({
        data: {
          id: uuidv4(),
          updated_at: new Date(),
          tenant_id: tenant_id,
          product_id: product_id,
          location_id: location_id,
          to_location_id: location_id,
          quantity,
          type: 'RESERVE',
          reference_id: referenceId,
          reference_type: referenceType,
          reservation_id: referenceId, // Linking for audit
          performed_by: 'system',
        },
      });
    };
    return tx ? execute(tx) : this.prisma.$transaction(execute);
  }

  async releaseStock(
    tenant_id: string,
    product_id: string,
    location_id: string,
    quantity: number,
    referenceId: string,
    referenceType: string,
    tx?: any
  ): Promise<void> {
    const execute = async (t: any) => {
      const level = await this.getLock(t, tenant_id, product_id, location_id);
      if (!level) throw new Error(`StockLevel not found for release`);
      
      // Strict Invariant: reserved >= quantity
      if (level.reserved < quantity) {
        throw new Error(`Insufficient reserved stock for release (Reserved: ${level.reserved}, Requested: ${quantity})`);
      }

      await t.stock_levels.update({
        where: { id: level.id },
        data: {
          reserved: { decrement: quantity },
          available: { increment: quantity },
        },
      });

      // Update Reservation Record
      await t.stock_reservations.updateMany({
        where: { 
          tenant_id: tenant_id, 
          reference_id: referenceId, 
          product_id: product_id, 
          status: 'PENDING' 
        },
        data: { status: 'RELEASED' },
      });

      await t.stock_movements.create({
        data: {
          id: uuidv4(),
          updated_at: new Date(),
          tenant_id: tenant_id,
          product_id: product_id,
          location_id: location_id,
          from_location_id: location_id,
          quantity: -quantity,
          type: 'RELEASE',
          reference_id: referenceId,
          reference_type: referenceType,
          reservation_id: referenceId,
          performed_by: 'system',
        },
      });
    };
    return tx ? execute(tx) : this.prisma.$transaction(execute);
  }

  async consumeFromReservation(
    tenant_id: string,
    product_id: string,
    location_id: string,
    quantity: number,
    referenceId: string,
    referenceType: string,
    tx?: any
  ): Promise<void> {
    const execute = async (t: any) => {
      const level = await this.getLock(t, tenant_id, product_id, location_id);
      if (!level) throw new Error(`StockLevel not found for consumption`);
      
      // Strict Invariants
      if (level.reserved < quantity) throw new Error(`Insufficient reserved stock (Reserved: ${level.reserved}, Requested: ${quantity})`);
      if (level.on_hand < quantity) throw new Error(`Insufficient on-hand stock (OnHand: ${level.onHand}, Requested: ${quantity})`);

      await t.stock_levels.update({
        where: { id: level.id },
        data: {
          on_hand: { decrement: quantity },
          reserved: { decrement: quantity },
          // available remains the same since both onHand and reserved drop by same amount
        },
      });

      // Update Reservation Record
      await t.stock_reservations.updateMany({
        where: { 
          tenant_id: tenant_id, 
          reference_id: referenceId, 
          product_id: product_id, 
          status: 'PENDING' 
        },
        data: { status: 'CONSUMED' },
      });

      await t.stock_movements.create({
        data: {
          id: uuidv4(),
          updated_at: new Date(),
          tenant_id: tenant_id,
          product_id: product_id,
          location_id: location_id,
          from_location_id: location_id,
          quantity: -quantity,
          type: 'CONSUME_RESERVED',
          reference_id: referenceId,
          reference_type: referenceType,
          reservation_id: referenceId,
          performed_by: 'system',
        },
      });
    };
    return tx ? execute(tx) : this.prisma.$transaction(execute);
  }

  async transferOut(
    tenant_id: string,
    product_id: string,
    fromLocationId: string,
    toLocationId: string,
    quantity: number,
    referenceId: string,
    referenceType: string,
    transferGroupId?: string,
    tx?: any
  ): Promise<StockMovement> {
    const execute = async (t: any) => {
      const sourceLevel = await this.getLock(t, tenant_id, product_id, fromLocationId);
      if (!sourceLevel || sourceLevel.on_hand < quantity) throw new Error(`Insufficient stock for transfer out`);

      // 1. Source: Decrement on_hand and available
      await t.stock_levels.update({
        where: { id: sourceLevel.id },
        data: {
          on_hand: { decrement: quantity },
          available: { decrement: quantity },
        },
      });

      // 2. Destination: Increment in_transit
      await t.stock_levels.upsert({
        where: {
          location_id_product_id_department_id: {
            location_id: toLocationId,
            product_id: product_id,
            department_id: (null as any),
          },
        },
        create: {
          id: uuidv4(),
          updated_at: new Date(),
          tenant_id: tenant_id,
          location_id: toLocationId,
          product_id: product_id,
          on_hand: 0,
          in_transit: quantity,
          available: 0,
        },
        update: {
          in_transit: { increment: quantity },
        },
      });

      return t.stock_movements.create({
        data: {
          id: uuidv4(),
          updated_at: new Date(),
          tenant_id: tenant_id,
          product_id: product_id,
          location_id: fromLocationId,
          from_location_id: fromLocationId,
          to_location_id: toLocationId,
          quantity: -quantity,
          type: 'TRANSFER_OUT',
          reference_id: referenceId,
          reference_type: referenceType,
          transfer_group_id: transferGroupId,
          performed_by: 'system',
        },
      });
    };
    return tx ? execute(tx) : this.prisma.$transaction(execute);
  }

  async transferIn(
    tenant_id: string,
    product_id: string,
    fromLocationId: string,
    toLocationId: string,
    quantity: number,
    referenceId: string,
    referenceType: string,
    transferGroupId?: string,
    tx?: any
  ): Promise<StockMovement> {
    const execute = async (t: any) => {
      const destLevel = await this.getLock(t, tenant_id, product_id, toLocationId);
      if (!destLevel || destLevel.inTransit < quantity) throw new Error(`Insufficient in-transit stock for transfer in (InTransit: ${destLevel.inTransit}, Requested: ${quantity})`);

      // 1. Decrement in_transit, increment on_hand and available
      await t.stock_levels.update({
        where: { id: destLevel.id },
        data: {
          in_transit: { decrement: quantity },
          on_hand: { increment: quantity },
          available: { increment: quantity },
        },
      });

      return t.stock_movements.create({
        data: {
          id: uuidv4(),
          updated_at: new Date(),
          tenant_id: tenant_id,
          product_id: product_id,
          location_id: toLocationId,
          from_location_id: fromLocationId,
          to_location_id: toLocationId,
          quantity: quantity,
          type: 'TRANSFER_IN',
          reference_id: referenceId,
          reference_type: referenceType,
          transfer_group_id: transferGroupId,
          performed_by: 'system',
        },
      });
    };
    return tx ? execute(tx) : this.prisma.$transaction(execute);
  }

  async takeSnapshot(tenant_id: string, location_id: string): Promise<void> {
    const levels = await this.prisma.stock_levels.findMany({
        where: { tenant_id: tenant_id, location_id: location_id }
    });

    await this.prisma.stock_snapshots.createMany({
        data: (levels as any[]).map(l => ({
            id: uuidv4(),
            tenant_id: tenant_id,
            location_id: l.location_id,
            product_id: l.product_id,
            onHand: l.on_hand,
            reserved: l.reserved,
            available: l.available,
            inTransit: l.in_transit,
            snapshot_at: new Date(),
        }))
    });
  }

  // --- Stock State Upgrades (Helpers) ---
  async updateStockReserved(
    tenant_id: string,
    product_id: string,
    location_id: string,
    quantity: number,
    type: 'increment' | 'decrement',
    providedTx?: any
  ): Promise<void> {
    // Legacy helper - redirect to new formal methods if possible or keep logic
    return this.reserveStock(tenant_id, product_id, location_id, quantity, `UP-RES-${Date.now()}`, 'ADJUSTMENT', providedTx);
  }

  async updateStockInTransit(
    tenant_id: string,
    product_id: string,
    fromLocationId: string,
    toLocationId: string,
    quantity: number,
    type: 'increment' | 'decrement',
    providedTx?: any
  ): Promise<void> {
    // Helper used by service
    const execute = async (tx: any) => {
        if (type === 'increment') {
            await this.transferOut(tenant_id, product_id, fromLocationId, toLocationId, quantity, `TR-OUT-${Date.now()}`, 'TRANSFER', tx);
        } else {
            await this.transferIn(tenant_id, product_id, fromLocationId, toLocationId, quantity, `TR-IN-${Date.now()}`, 'TRANSFER', tx);
        }
    };
    return providedTx ? execute(providedTx) : this.prisma.$transaction(execute);
  }

  async findProductByCode(tenant_id: string, code: string): Promise<any | null> {
    return this.prisma.item_masters.findFirst({
      where: {
        tenant_id: tenant_id,
        OR: [{ barcode: code }, { sku: code }],
      },
    });
  }

  // --- Agentic Layer ---
  async createAgenticEvent(
    tenant_id: string,
    data: CreateAgenticEventDto,
  ): Promise<AgenticEvent> {
    const event = await this.prisma.agentic_events.create({
      data: {
        id: uuidv4(),
        tenant_id: tenant_id,
        event_type: data.event_type,
        entity_id: data.entity_id,
        entity_type: data.entity_type,
        payload: data.payload as any,
        source_event_id: (data as any).sourceEventId || null,
        correlation_id: (data as any).correlation_id || null,
        status: "PENDING",
      },
    });
    return {
      id: event.id,
      tenant_id: event.tenant_id,
      event_type: event.event_type,
      entity_id: event.entity_id,
      entity_type: event.entity_type,
      payload: event.payload as any,
      status: event.status,
      processedAt: event.processed_at || undefined,
      errorMsg: event.error_msg || undefined,
      created_at: event.created_at,
    };
  }
}
