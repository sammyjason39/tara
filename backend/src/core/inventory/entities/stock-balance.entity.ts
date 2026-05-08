export class StockBalance {
  id: string;
  tenantId: string;
  itemId: string;
  locationId: string;
  locationCode: string;
  departmentCode?: string;
  quantity: number;
  reservedQuantity: number;
  inTransitQuantity: number;
  avgUnitCost: number;
  reorderPoint: number;
  safetyStock: number;
  updatedAt: Date;
}
