import type {
  InventoryAdjustmentRequest,
  InventoryAlert,
  InventoryAuditCycle,
  InventoryIntegrationEvent,
  InventoryItemMaster,
  InventoryMovement,
  InventoryStockBalance,
} from "@/core/types/inventory/inventory";

export interface InventoryRepository {
  listItems: (tenantId: string) => InventoryItemMaster[];
  createItem: (tenantId: string, payload: InventoryItemMaster) => InventoryItemMaster;
  updateItem: (
    tenantId: string,
    id: string,
    patch: Partial<InventoryItemMaster>,
  ) => InventoryItemMaster | null;

  listBalances: (tenantId: string) => InventoryStockBalance[];
  createBalance: (tenantId: string, payload: InventoryStockBalance) => InventoryStockBalance;
  updateBalance: (
    tenantId: string,
    id: string,
    patch: Partial<InventoryStockBalance>,
  ) => InventoryStockBalance | null;

  listMovements: (tenantId: string) => InventoryMovement[];
  createMovement: (tenantId: string, payload: InventoryMovement) => InventoryMovement;

  listAdjustments: (tenantId: string) => InventoryAdjustmentRequest[];
  createAdjustment: (
    tenantId: string,
    payload: InventoryAdjustmentRequest,
  ) => InventoryAdjustmentRequest;
  updateAdjustment: (
    tenantId: string,
    id: string,
    patch: Partial<InventoryAdjustmentRequest>,
  ) => InventoryAdjustmentRequest | null;

  listAuditCycles: (tenantId: string) => InventoryAuditCycle[];
  createAuditCycle: (tenantId: string, payload: InventoryAuditCycle) => InventoryAuditCycle;
  updateAuditCycle: (
    tenantId: string,
    id: string,
    patch: Partial<InventoryAuditCycle>,
  ) => InventoryAuditCycle | null;

  listAlerts: (tenantId: string) => InventoryAlert[];
  createAlert: (tenantId: string, payload: InventoryAlert) => InventoryAlert;
  updateAlert: (
    tenantId: string,
    id: string,
    patch: Partial<InventoryAlert>,
  ) => InventoryAlert | null;

  listIntegrationEvents: (tenantId: string) => InventoryIntegrationEvent[];
  createIntegrationEvent: (
    tenantId: string,
    payload: InventoryIntegrationEvent,
  ) => InventoryIntegrationEvent;
  updateIntegrationEvent: (
    tenantId: string,
    id: string,
    patch: Partial<InventoryIntegrationEvent>,
  ) => InventoryIntegrationEvent | null;
}

