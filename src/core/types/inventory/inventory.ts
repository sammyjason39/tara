export type InventoryCategory =
  | "ITEM"
  | "SERVICE"
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

export type InventoryAdjustmentStatus =
  | "PENDING_APPROVAL"
  | "APPROVED"
  | "REJECTED";

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
  tenant_id: string;
  sku: string;
  name: string;
  category: InventoryCategory;
  uom: string;
  barcode: string;
  qr_code?: string;
  module_tags: string[];
  active: boolean;
  description?: string;
  retail_price?: number;
  created_at: string;
  updated_at: string;
};

export type InventoryStockBalance = {
  id: string;
  tenant_id: string;
  item_id: string;
  location_id: string;
  department_id?: string;
  quantity: number;
  reserved_quantity: number;
  avg_unit_cost: number;
  currency: "IDR" | "USD";
  reorder_point: number;
  safety_stock: number;
  expiry_date?: string;
  last_counted_at?: string;
  updated_at: string;
  item?: InventoryItemMaster;
};

export type InventoryMovement = {
  id: string;
  tenant_id: string;
  item_id: string;
  type: InventoryMovementType;
  quantity: number;
  unit_cost: number;
  reason: string;
  source_location_id?: string;
  source_department_id?: string;
  destination_location_id?: string;
  destination_department_id?: string;
  reference_type?: string;
  reference_id?: string;
  performed_by: string;
  device_id?: string;
  created_at: string;
};

export type InventoryAdjustmentRequest = {
  id: string;
  tenant_id: string;
  item_id: string;
  location_id: string;
  department_id?: string;
  requested_delta: number;
  reason: string;
  status: InventoryAdjustmentStatus;
  requested_by: string;
  approved_by?: string;
  approved_at?: string;
  created_at: string;
  updated_at: string;
};

export type InventoryAuditCycle = {
  id: string;
  tenant_id: string;
  location_id: string;
  department_id?: string;
  scope: "LOCATION" | "DEPARTMENT" | "ITEM";
  status: InventoryAuditCycleStatus;
  opened_by: string;
  closed_by?: string;
  expected_value?: number;
  counted_value?: number;
  variance_value?: number;
  created_at: string;
  updated_at: string;
};

export type InventoryAlert = {
  id: string;
  tenant_id: string;
  type: InventoryAlertType;
  severity: "LOW" | "MEDIUM" | "HIGH";
  status: InventoryAlertStatus;
  entity_id: string;
  message: string;
  created_at: string;
  updated_at: string;
};

export type InventoryIntegrationEvent = {
  id: string;
  tenant_id: string;
  target: InventoryIntegrationTarget;
  status: InventoryIntegrationStatus;
  event_type: string;
  entity_id: string;
  detail: string;
  created_at: string;
  updated_at: string;
};

export type InventoryDashboardMetrics = {
  total_items: number;
  total_locations: number;
  total_departments: number;
  total_on_hand_qty: number;
  total_valuation: number;
  low_stock_count: number;
  expiry_warning_count: number;
  pending_adjustments: number;
  pending_receipt_syncs: number;
  module_contributions?: {
    retail?: {
      store_inventory_count: number;
      pending_store_transfers: number;
    };
  };
};

export type WarehouseBin = {
  id: string;
  tenant_id: string;
  location_id: string;
  code: string;
  zone?: string;
  aisle?: string;
  rack?: string;
  level?: string;
  capacity: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type BinAssignment = {
  id: string;
  tenant_id: string;
  bin_id: string;
  product_id: string;
  qty: number;
  assigned_at: string;
  updated_at: string;
  product?: InventoryItemMaster;
};

export type IotEventType = "RFID_SCAN" | "BARCODE_SCAN" | "TEMP_ALERT" | "MOTION";

export type InventoryIotEvent = {
  id: string;
  tenant_id: string;
  device_id: string;
  event_type: IotEventType;
  sku?: string;
  location_id?: string;
  bin_id?: string;
  payload: any;
  processed: boolean;
  processed_at?: string;
  created_at: string;
};

export type AgenticEventType = "STOCK_MOVEMENT_CREATED" | "ADJUSTMENT_APPROVED" | "LOW_STOCK_ALERT";

export type AgenticEvent = {
  id: string;
  tenant_id: string;
  event_type: AgenticEventType;
  entity_id: string;
  entity_type: string;
  payload: any;
  status: "PENDING" | "PROCESSED" | "FAILED";
  processed_at?: string;
  error_msg?: string;
  created_at: string;
};

/* ============================================================================ */
/* STOCK OPNAME SESSION                                                         */
/* ============================================================================ */

/**
 * Scan entry representing one SKU's accumulated count during an opname session.
 */
export type ScanEntry = {
  id?: string;
  sku: string;
  name: string;
  systemCount: number;
  actualCount: number;
  timestamp: string;
  serials?: string[];
};

/**
 * Anomaly item created during opname for unregistered barcodes.
 */
export type AnomalyItem = {
  id: string;
  sku: string;
  name: string;
  barcode: string;
  category_id: string;
  is_anomaly: boolean;
  status: "incomplete";
  createdAt: string;
};

/**
 * Opname session state persisted to localStorage to survive page reloads.
 */
export type OpnameSession = {
  cycleId: string;
  locationId: string;
  entries: ScanEntry[];
  unresolvedBarcodes: string[];
  anomalies: string[];
  newItems: any[];
  createdAt: number;
  lastUpdated: number;
};
