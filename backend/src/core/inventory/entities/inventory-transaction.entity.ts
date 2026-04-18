export class InventoryTransaction {
  id: string;
  tenant_id: string;
  location_id: string;
  skuId: string;
  type: 'RECEIPT' | 'ISSUE' | 'ADJUSTMENT' | 'RETURN' | 'TRANSFER';
  qty: number;
  uom: string;
  status: 'PENDING' | 'COMPLETED' | 'CANCELLED';
  sourceId: string; // Operational source (PO Receipt ID, Order ID)
  created_at: Date;
  updated_at: Date;
}
