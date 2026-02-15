export type InventoryCategory =
  | "RAW_MATERIAL"
  | "FINISHED_GOOD"
  | "CONSUMABLE"
  | "ASSET"
  | "SPARE_PART";

export type InventoryMovementType =
  | "INTAKE"
  | "DEDUCTION"
  | "TRANSFER_OUT"
  | "TRANSFER_IN"
  | "ADJUSTMENT_PLUS"
  | "ADJUSTMENT_MINUS"
  | "AUDIT_RECONCILIATION";

export type InventoryAdjustmentStatus = "PENDING_APPROVAL" | "APPROVED" | "REJECTED";

export type InventoryAuditCycleStatus = "OPEN" | "COMPLETED";

export type InventoryAlertType =
  | "LOW_STOCK"
  | "EXPIRY_WARNING"
  | "ANOMALY"
  | "ADJUSTMENT_REQUIRES_APPROVAL";

export type InventoryAlertStatus = "OPEN" | "ACKNOWLEDGED" | "RESOLVED";

export type InventoryIntegrationTarget =
  | "FINANCE"
  | "PROCUREMENT"
  | "SALES"
  | "PAYMENT"
  | "HR"
  | "IT";

export type InventoryIntegrationStatus = "PENDING" | "SYNCED" | "FAILED";

export type InventoryItemMaster = {
  id: string;
  tenantId: string;
  sku: string;
  name: string;
  category: InventoryCategory;
  uom: string;
  barcode: string;
  qrCode: string;
  moduleTags: string[];
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type InventoryStockBalance = {
  id: string;
  tenantId: string;
  itemId: string;
  locationCode: string;
  departmentCode?: string;
  quantity: number;
  reservedQuantity: number;
  avgUnitCost: number;
  currency: "IDR" | "USD";
  reorderPoint: number;
  safetyStock: number;
  expiryDate?: string;
  lastCountedAt?: string;
  updatedAt: string;
};

export type InventoryMovement = {
  id: string;
  tenantId: string;
  itemId: string;
  type: InventoryMovementType;
  quantity: number;
  unitCost: number;
  reason: string;
  sourceLocationCode?: string;
  sourceDepartmentCode?: string;
  destinationLocationCode?: string;
  destinationDepartmentCode?: string;
  referenceType?: string;
  referenceId?: string;
  performedBy: string;
  deviceId?: string;
  createdAt: string;
};

export type InventoryAdjustmentRequest = {
  id: string;
  tenantId: string;
  itemId: string;
  locationCode: string;
  departmentCode?: string;
  requestedDelta: number;
  reason: string;
  status: InventoryAdjustmentStatus;
  requestedBy: string;
  approvedBy?: string;
  approvedAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type InventoryAuditCycle = {
  id: string;
  tenantId: string;
  locationCode: string;
  departmentCode?: string;
  scope: "LOCATION" | "DEPARTMENT" | "ITEM";
  status: InventoryAuditCycleStatus;
  openedBy: string;
  closedBy?: string;
  expectedValue?: number;
  countedValue?: number;
  varianceValue?: number;
  createdAt: string;
  updatedAt: string;
};

export type InventoryAlert = {
  id: string;
  tenantId: string;
  type: InventoryAlertType;
  severity: "LOW" | "MEDIUM" | "HIGH";
  status: InventoryAlertStatus;
  entityId: string;
  message: string;
  createdAt: string;
  updatedAt: string;
};

export type InventoryIntegrationEvent = {
  id: string;
  tenantId: string;
  target: InventoryIntegrationTarget;
  status: InventoryIntegrationStatus;
  eventType: string;
  entityId: string;
  detail: string;
  createdAt: string;
  updatedAt: string;
};

export type InventoryDashboardMetrics = {
  totalItems: number;
  totalLocations: number;
  totalDepartments: number;
  totalOnHandQty: number;
  totalValuation: number;
  lowStockCount: number;
  expiryWarningCount: number;
  pendingAdjustments: number;
  pendingReceiptSyncs: number;
};

