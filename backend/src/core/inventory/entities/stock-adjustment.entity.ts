export class StockAdjustment {
  id: string;
  tenantId: string;
  itemId: string;
  locationId: string;
  departmentId?: string;
  requestedDelta: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  requestedBy: string;
  approvedBy?: string;
  approvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

