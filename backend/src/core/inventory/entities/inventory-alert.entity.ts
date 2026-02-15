export class InventoryAlert {
  id: string;
  tenantId: string;
  alertType: 'low_stock' | 'expiry_warning' | 'anomaly' | 'adjustment_approval';
  severity: 'low' | 'medium' | 'high';
  status: 'open' | 'acknowledged' | 'resolved';
  entityId: string;
  message: string;
  createdAt: Date;
  updatedAt: Date;
}

