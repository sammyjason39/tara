export class PurchaseOrder {
  id: string;
  tenantId: string;
  requisitionId: string;
  supplierId: string;
  branchCode: string;
  totalAmount: number;
  status: 'released' | 'delivering' | 'received' | 'closed';
  issuedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

