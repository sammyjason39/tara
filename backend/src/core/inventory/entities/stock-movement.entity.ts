export class StockMovement {
  id: string;
  tenantId: string;
  itemId: string;
  movementType:
    | 'intake'
    | 'deduction'
    | 'transfer_out'
    | 'transfer_in'
    | 'adjustment_plus'
    | 'adjustment_minus';
  quantity: number;
  unitCost: number;
  reason: string;
  sourceLocationId?: string;
  sourceDepartmentId?: string;
  destinationLocationId?: string;
  destinationDepartmentId?: string;
  referenceType?: string;
  referenceId?: string;
  createdBy: string;
  createdAt: Date;
}

