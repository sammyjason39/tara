export class StockBalance {
  id: string;
  tenant_id: string;
  item_id: string;
  location_id: string;
  department_id?: string;
  quantity: number;
  reserved_quantity: number;
  in_transit_quantity: number;
  avg_unit_cost: number;
  reorder_point: number;
  safety_stock: number;
  updated_at: Date;
  item?: any;
}
