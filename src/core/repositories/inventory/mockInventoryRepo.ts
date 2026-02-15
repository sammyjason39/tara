import {
  ensureSeed,
  loadFromStorage,
  saveToStorage,
} from "@/core/repositories/hr/storage";
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

const now = () => new Date().toISOString();

const itemsKey = (tenantId: string) => `inv:${tenantId}:items`;
const balancesKey = (tenantId: string) => `inv:${tenantId}:balances`;
const movementsKey = (tenantId: string) => `inv:${tenantId}:movements`;
const adjustmentsKey = (tenantId: string) => `inv:${tenantId}:adjustments`;
const auditCyclesKey = (tenantId: string) => `inv:${tenantId}:audit-cycles`;
const alertsKey = (tenantId: string) => `inv:${tenantId}:alerts`;
const integrationEventsKey = (tenantId: string) => `inv:${tenantId}:integration-events`;

const seedItems = (tenantId: string): InventoryItemMaster[] => [
  {
    id: `${tenantId}-itm-001`,
    tenantId,
    sku: "RM-STEEL-001",
    name: "Steel Sheet Grade A",
    category: "RAW_MATERIAL",
    uom: "SHEET",
    barcode: "BC-RM-STEEL-001",
    qrCode: "QR-RM-STEEL-001",
    moduleTags: ["MANUFACTURING", "PROCUREMENT"],
    active: true,
    createdAt: now(),
    updatedAt: now(),
  },
  {
    id: `${tenantId}-itm-002`,
    tenantId,
    sku: "CONS-GLOVE-010",
    name: "Safety Gloves",
    category: "CONSUMABLE",
    uom: "BOX",
    barcode: "BC-CONS-GLOVE-010",
    qrCode: "QR-CONS-GLOVE-010",
    moduleTags: ["HR", "OPERATIONS"],
    active: true,
    createdAt: now(),
    updatedAt: now(),
  },
  {
    id: `${tenantId}-itm-003`,
    tenantId,
    sku: "FG-PACK-101",
    name: "Packaging Kit",
    category: "FINISHED_GOOD",
    uom: "UNIT",
    barcode: "BC-FG-PACK-101",
    qrCode: "QR-FG-PACK-101",
    moduleTags: ["SALES", "FNB", "RETAIL"],
    active: true,
    createdAt: now(),
    updatedAt: now(),
  },
];

const seedBalances = (tenantId: string): InventoryStockBalance[] => [
  {
    id: `${tenantId}-bal-001`,
    tenantId,
    itemId: `${tenantId}-itm-001`,
    locationCode: "JKT-WH",
    departmentCode: "PRODUCTION",
    quantity: 220,
    reservedQuantity: 40,
    avgUnitCost: 850000,
    currency: "IDR",
    reorderPoint: 120,
    safetyStock: 90,
    updatedAt: now(),
  },
  {
    id: `${tenantId}-bal-002`,
    tenantId,
    itemId: `${tenantId}-itm-002`,
    locationCode: "JKT-HQ",
    departmentCode: "HSE",
    quantity: 35,
    reservedQuantity: 2,
    avgUnitCost: 120000,
    currency: "IDR",
    reorderPoint: 50,
    safetyStock: 30,
    expiryDate: "2026-03-10",
    updatedAt: now(),
  },
  {
    id: `${tenantId}-bal-003`,
    tenantId,
    itemId: `${tenantId}-itm-003`,
    locationCode: "SBY-WH",
    departmentCode: "DISTRIBUTION",
    quantity: 410,
    reservedQuantity: 60,
    avgUnitCost: 220000,
    currency: "IDR",
    reorderPoint: 160,
    safetyStock: 120,
    updatedAt: now(),
  },
];

const seedMovements = (tenantId: string): InventoryMovement[] => [
  {
    id: `${tenantId}-mov-001`,
    tenantId,
    itemId: `${tenantId}-itm-001`,
    type: "INTAKE",
    quantity: 50,
    unitCost: 850000,
    reason: "Supplier receipt",
    destinationLocationCode: "JKT-WH",
    destinationDepartmentCode: "PRODUCTION",
    referenceType: "PO",
    referenceId: "po-2026-001",
    performedBy: "user-demo",
    createdAt: now(),
  },
  {
    id: `${tenantId}-mov-002`,
    tenantId,
    itemId: `${tenantId}-itm-003`,
    type: "DEDUCTION",
    quantity: 20,
    unitCost: 220000,
    reason: "Sales shipment",
    sourceLocationCode: "SBY-WH",
    sourceDepartmentCode: "DISTRIBUTION",
    referenceType: "SALES_ORDER",
    referenceId: "so-4491",
    performedBy: "user-demo",
    createdAt: now(),
  },
];

const seedAdjustments = (tenantId: string): InventoryAdjustmentRequest[] => [
  {
    id: `${tenantId}-adj-001`,
    tenantId,
    itemId: `${tenantId}-itm-002`,
    locationCode: "JKT-HQ",
    departmentCode: "HSE",
    requestedDelta: -3,
    reason: "Damaged boxes after audit",
    status: "PENDING_APPROVAL",
    requestedBy: "user-demo",
    createdAt: now(),
    updatedAt: now(),
  },
];

const seedAuditCycles = (tenantId: string): InventoryAuditCycle[] => [
  {
    id: `${tenantId}-cyc-001`,
    tenantId,
    locationCode: "JKT-WH",
    scope: "LOCATION",
    status: "OPEN",
    openedBy: "user-demo",
    createdAt: now(),
    updatedAt: now(),
  },
];

const seedAlerts = (tenantId: string): InventoryAlert[] => [
  {
    id: `${tenantId}-alert-001`,
    tenantId,
    type: "LOW_STOCK",
    severity: "MEDIUM",
    status: "OPEN",
    entityId: `${tenantId}-bal-002`,
    message: "Safety Gloves below reorder point in JKT-HQ/HSE.",
    createdAt: now(),
    updatedAt: now(),
  },
];

const ensureArray = <T>(key: string, seed: T[]) => ensureSeed<T[]>(key, seed);

const updateById = <T extends { id: string }>(
  items: T[],
  id: string,
  patch: Partial<T>,
): { updated: T | null; next: T[] } => {
  let updated: T | null = null;
  const next = items.map((item) => {
    if (item.id !== id) return item;
    updated = { ...item, ...patch };
    return updated;
  });
  return { updated, next };
};

export const mockInventoryRepo: InventoryRepository = {
  listItems(tenantId) {
    return ensureArray(itemsKey(tenantId), seedItems(tenantId));
  },
  createItem(tenantId, payload) {
    const next = [payload, ...this.listItems(tenantId)];
    saveToStorage(itemsKey(tenantId), next);
    return payload;
  },
  updateItem(tenantId, id, patch) {
    const { updated, next } = updateById(this.listItems(tenantId), id, patch);
    if (updated) saveToStorage(itemsKey(tenantId), next);
    return updated;
  },

  listBalances(tenantId) {
    return ensureArray(balancesKey(tenantId), seedBalances(tenantId));
  },
  createBalance(tenantId, payload) {
    const next = [payload, ...this.listBalances(tenantId)];
    saveToStorage(balancesKey(tenantId), next);
    return payload;
  },
  updateBalance(tenantId, id, patch) {
    const { updated, next } = updateById(this.listBalances(tenantId), id, patch);
    if (updated) saveToStorage(balancesKey(tenantId), next);
    return updated;
  },

  listMovements(tenantId) {
    return ensureArray(movementsKey(tenantId), seedMovements(tenantId));
  },
  createMovement(tenantId, payload) {
    const next = [payload, ...this.listMovements(tenantId)];
    saveToStorage(movementsKey(tenantId), next);
    return payload;
  },

  listAdjustments(tenantId) {
    return ensureArray(adjustmentsKey(tenantId), seedAdjustments(tenantId));
  },
  createAdjustment(tenantId, payload) {
    const next = [payload, ...this.listAdjustments(tenantId)];
    saveToStorage(adjustmentsKey(tenantId), next);
    return payload;
  },
  updateAdjustment(tenantId, id, patch) {
    const { updated, next } = updateById(this.listAdjustments(tenantId), id, patch);
    if (updated) saveToStorage(adjustmentsKey(tenantId), next);
    return updated;
  },

  listAuditCycles(tenantId) {
    return ensureArray(auditCyclesKey(tenantId), seedAuditCycles(tenantId));
  },
  createAuditCycle(tenantId, payload) {
    const next = [payload, ...this.listAuditCycles(tenantId)];
    saveToStorage(auditCyclesKey(tenantId), next);
    return payload;
  },
  updateAuditCycle(tenantId, id, patch) {
    const { updated, next } = updateById(this.listAuditCycles(tenantId), id, patch);
    if (updated) saveToStorage(auditCyclesKey(tenantId), next);
    return updated;
  },

  listAlerts(tenantId) {
    return ensureArray(alertsKey(tenantId), seedAlerts(tenantId));
  },
  createAlert(tenantId, payload) {
    const next = [payload, ...this.listAlerts(tenantId)];
    saveToStorage(alertsKey(tenantId), next);
    return payload;
  },
  updateAlert(tenantId, id, patch) {
    const { updated, next } = updateById(this.listAlerts(tenantId), id, patch);
    if (updated) saveToStorage(alertsKey(tenantId), next);
    return updated;
  },

  listIntegrationEvents(tenantId) {
    return loadFromStorage<InventoryIntegrationEvent[]>(integrationEventsKey(tenantId), []);
  },
  createIntegrationEvent(tenantId, payload) {
    const next = [payload, ...this.listIntegrationEvents(tenantId)];
    saveToStorage(integrationEventsKey(tenantId), next);
    return payload;
  },
  updateIntegrationEvent(tenantId, id, patch) {
    const { updated, next } = updateById(this.listIntegrationEvents(tenantId), id, patch);
    if (updated) saveToStorage(integrationEventsKey(tenantId), next);
    return updated;
  },
};

