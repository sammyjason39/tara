export class InventoryReservation {
  id: string;
  tenant_id: string;
  location_id: string;
  skuId: string;
  qty: number;
  status: 'RESERVED' | 'COMMITTED' | 'EXPIRED' | 'RELEASED';
  expiryAt: Date;
  estCost?: number;
  priceSnapshot?: any; // JSON containing rule and price at time of reservation
  created_at: Date;
  updated_at: Date;
}
