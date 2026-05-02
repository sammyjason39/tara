import { prisma } from "@/core/persistence/database/client";
import type { InventoryRepository } from "@/core/repositories/inventory/inventoryRepository";
import type {
  InventoryAdjustmentRequest,
  InventoryAlert,
  InventoryAuditCycle,
  InventoryIntegrationEvent,
  InventoryItemMaster,
  InventoryMovement,
  InventoryStockBalance,
} from "@/core/types/inventory/inventory";

// Mapping functions
const mapItem = (db: any): InventoryItemMaster => ({
  id: db.id,
  tenantId: db.tenantId,
  sku: db.sku,
  name: db.name,
  category: db.category?.name as any,
  uom: db.unit,
  barcode: db.barcode,
  qrCode: db.barcode, 
  moduleTags: [], 
  active: db.status === "active",
  retailPrice: Number(db.basePrice),
  createdAt: db.createdAt.toISOString(),
  updatedAt: db.updatedAt.toISOString(),
});

const mapBalance = (db: any): InventoryStockBalance => ({
  id: db.id,
  tenantId: db.tenantId,
  itemId: db.productId,
  locationCode: db.location?.code || db.locationId,
  quantity: db.onHand,
  reservedQuantity: db.reserved,
  avgUnitCost: 0, 
  currency: "IDR",
  reorderPoint: db.minBuffer,
  safetyStock: db.minBuffer * 0.5,
  updatedAt: db.updatedAt.toISOString(),
});

const mapMovement = (db: any): InventoryMovement => ({
  id: db.id,
  tenantId: db.tenantId,
  itemId: db.productId,
  type: db.type as any,
  quantity: db.quantity,
  unitCost: 0,
  reason: db.type,
  performedBy: db.performedBy,
  createdAt: db.createdAt.toISOString(),
});

const mapAdjustment = (db: any): InventoryAdjustmentRequest => ({
  id: db.id,
  tenantId: db.tenantId,
  itemId: db.itemId,
  locationCode: db.locationCode,
  departmentCode: db.departmentCode || undefined,
  requestedDelta: db.requestedDelta,
  reason: db.reason,
  status: db.status as any,
  requestedBy: db.requestedBy,
  approvedBy: db.approvedBy || undefined,
  approvedAt: db.approvedAt?.toISOString(),
  createdAt: db.createdAt.toISOString(),
  updatedAt: db.updatedAt.toISOString(),
});

const mapAuditCycle = (db: any): InventoryAuditCycle => ({
  id: db.id,
  tenantId: db.tenantId,
  locationCode: db.locationCode,
  departmentCode: db.departmentCode || undefined,
  scope: db.scope as any,
  status: db.status as any,
  openedBy: db.openedBy,
  closedBy: db.closedBy || undefined,
  expectedValue: db.expectedValue ?? undefined,
  countedValue: db.countedValue ?? undefined,
  varianceValue: db.varianceValue ?? undefined,
  createdAt: db.createdAt.toISOString(),
  updatedAt: db.updatedAt.toISOString(),
});

const mapAlert = (db: any): InventoryAlert => ({
  id: db.id,
  tenantId: db.tenantId,
  type: db.type as any,
  severity: db.severity as any,
  status: db.status as any,
  entityId: db.entityId,
  message: db.message,
  createdAt: db.createdAt.toISOString(),
  updatedAt: db.updatedAt.toISOString(),
});

const mapIntegrationEvent = (db: any): InventoryIntegrationEvent => ({
  id: db.id,
  tenantId: db.tenantId,
  target: db.target as any,
  status: db.status as any,
  eventType: db.eventType,
  entityId: db.entityId,
  detail: db.detail,
  createdAt: db.createdAt.toISOString(),
  updatedAt: db.updatedAt.toISOString(),
});

export const inventoryRepo: InventoryRepository = {
  async listItems(tenantId) {
    const items = await prisma.product.findMany({
      where: { tenantId: tenantId },
      include: { category: true },
      orderBy: { name: 'asc' },
    });
    return (Array.isArray(items) ? items : []).map(mapItem);
  },
  async createItem(tenantId, payload) {
    let category = await prisma.productCategory.findFirst({
      where: { tenantId: tenantId, name: payload.category }
    });
    if (!category) {
      category = await prisma.productCategory.create({
        data: {
          tenantId: tenantId,
          name: payload.category,
        }
      });
    }

    const item = await prisma.product.create({
      data: {
        id: payload.id,
        tenantId: tenantId,
        categoryId: category.id,
        sku: payload.sku,
        name: payload.name,
        barcode: payload.barcode,
        unit: payload.uom,
        basePrice: payload.retailPrice || 0,
        status: payload.active ? 'active' : 'inactive',
      },
      include: { category: true },
    });
    return mapItem(item);
  },
  async updateItem(tenantId, id, patch) {
    const item = await prisma.product.update({
      where: { id, tenantId: tenantId },
      data: {
        name: patch.name,
        sku: patch.sku,
        barcode: patch.barcode,
        unit: patch.uom,
        basePrice: patch.retailPrice,
        status: patch.active === undefined ? undefined : (patch.active ? 'active' : 'inactive'),
      },
      include: { category: true },
    });
    return mapItem(item);
  },
  async deleteItem(tenantId, id) {
    await prisma.product.delete({
      where: { id, tenantId: tenantId },
    });
    return true;
  },

  async listBalances(tenantId) {
    const balances = await prisma.stockLevel.findMany({
      where: { tenantId: tenantId },
      include: { location: true },
    });
    return (Array.isArray(balances) ? balances : []).map(mapBalance);
  },
  async createBalance(tenantId, payload) {
    const location = await prisma.location.findFirst({
        where: { tenantId: tenantId, code: payload.locationCode }
    });
    if (!location) throw new Error(`Location ${payload.locationCode} not found`);

    const item = await prisma.stockLevel.create({
      data: {
        id: payload.id,
        tenantId: tenantId,
        locationId: location.id,
        productId: payload.itemId,
        onHand: payload.quantity,
        reserved: payload.reservedQuantity,
        available: payload.quantity - payload.reservedQuantity,
        minBuffer: payload.reorderPoint,
      },
      include: { location: true },
    });
    return mapBalance(item);
  },
  async updateBalance(tenantId, id, patch) {
    const item = await prisma.stockLevel.update({
      where: { id, tenantId: tenantId },
      data: {
        onHand: patch.quantity,
        reserved: patch.reservedQuantity,
        minBuffer: patch.reorderPoint,
        available: patch.quantity !== undefined ? (patch.quantity - (patch.reservedQuantity || 0)) : undefined,
      },
      include: { location: true },
    });
    return mapBalance(item);
  },

  async listMovements(tenantId) {
    const items = await prisma.stockMovement.findMany({
      where: { tenantId: tenantId },
      orderBy: { createdAt: 'desc' },
    });
    return (Array.isArray(items) ? items : []).map(mapMovement);
  },
  async createMovement(tenantId, payload) {
    const item = await prisma.stockMovement.create({
      data: {
        id: payload.id,
        tenantId: tenantId,
        productId: payload.itemId,
        quantity: payload.quantity,
        type: payload.type,
        referenceId: payload.referenceId || "manual",
        performedBy: payload.performedBy,
        fromLocationId: payload.sourceLocationCode,
        toLocationId: payload.destinationLocationCode,
      },
    });
    return mapMovement(item);
  },

  async listAdjustments(tenantId) {
    const items = await prisma.inventoryAdjustment.findMany({
      where: { tenantId: tenantId },
      orderBy: { createdAt: 'desc' },
    });
    return (Array.isArray(items) ? items : []).map(mapAdjustment);
  },
  async createAdjustment(tenantId, payload) {
    const item = await prisma.inventoryAdjustment.create({
      data: {
        id: payload.id,
        tenantId: tenantId,
        itemId: payload.itemId,
        locationCode: payload.locationCode,
        departmentCode: payload.departmentCode,
        requestedDelta: payload.requestedDelta,
        reason: payload.reason,
        status: payload.status,
        requestedBy: payload.requestedBy,
      },
    });
    return mapAdjustment(item);
  },
  async updateAdjustment(tenantId, id, patch) {
    const item = await prisma.inventoryAdjustment.update({
      where: { id, tenantId: tenantId },
      data: {
        status: patch.status,
        approvedBy: patch.approvedBy,
        approvedAt: patch.approvedAt ? new Date(patch.approvedAt) : undefined,
      },
    });
    return mapAdjustment(item);
  },

  async listAuditCycles(tenantId) {
    const items = await prisma.inventoryAuditCycle.findMany({
      where: { tenantId: tenantId },
      orderBy: { createdAt: 'desc' },
    });
    return (Array.isArray(items) ? items : []).map(mapAuditCycle);
  },
  async createAuditCycle(tenantId, payload) {
    const item = await prisma.inventoryAuditCycle.create({
      data: {
        id: payload.id,
        tenantId: tenantId,
        locationCode: payload.locationCode,
        departmentCode: payload.departmentCode,
        scope: payload.scope,
        status: payload.status,
        openedBy: payload.openedBy,
      },
    });
    return mapAuditCycle(item);
  },
  async updateAuditCycle(tenantId, id, patch) {
    const item = await prisma.inventoryAuditCycle.update({
      where: { id, tenantId: tenantId },
      data: {
        status: patch.status,
        closedBy: patch.closedBy,
        expectedValue: patch.expectedValue,
        countedValue: patch.countedValue,
        varianceValue: patch.varianceValue,
      },
    });
    return mapAuditCycle(item);
  },

  async listAlerts(tenantId) {
    const items = await prisma.inventoryAlert.findMany({
      where: { tenantId: tenantId },
      orderBy: { createdAt: 'desc' },
    });
    return (Array.isArray(items) ? items : []).map(mapAlert);
  },
  async createAlert(tenantId, payload) {
    const item = await prisma.inventoryAlert.create({
      data: {
        id: payload.id,
        tenantId: tenantId,
        type: payload.type,
        severity: payload.severity,
        status: payload.status,
        entityId: payload.entityId,
        message: payload.message,
      },
    });
    return mapAlert(item);
  },
  async updateAlert(tenantId, id, patch) {
    const item = await prisma.inventoryAlert.update({
      where: { id, tenantId: tenantId },
      data: {
        status: patch.status,
        acknowledged: patch.status === 'ACKNOWLEDGED',
      },
    });
    return mapAlert(item);
  },

  async listIntegrationEvents(tenantId) {
    const items = await prisma.inventoryIntegrationEvent.findMany({
      where: { tenantId: tenantId },
      orderBy: { createdAt: 'desc' },
    });
    return (Array.isArray(items) ? items : []).map(mapIntegrationEvent);
  },
  async createIntegrationEvent(tenantId, payload) {
    const item = await prisma.inventoryIntegrationEvent.create({
      data: {
        id: payload.id,
        tenantId: tenantId,
        target: payload.target,
        status: payload.status,
        eventType: payload.eventType,
        entityId: payload.entityId,
        detail: payload.detail,
      },
    });
    return mapIntegrationEvent(item);
  },
  async updateIntegrationEvent(tenantId, id, patch) {
    const item = await prisma.inventoryIntegrationEvent.update({
      where: { id, tenantId: tenantId },
      data: {
        status: patch.status,
      },
    });
    return mapIntegrationEvent(item);
  },
};
