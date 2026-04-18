export class StockBalance {
  id: string;
  tenant_id: string;
  item_id: string;
  location_id: string;
  departmentId?: string;
  quantity: number;
  reservedQuantity: number;
  inTransitQuantity: number;
  avgUnitCost: number;
  reorderPoint: number;
  safetyStock: number;
  updated_at: Date;
}
