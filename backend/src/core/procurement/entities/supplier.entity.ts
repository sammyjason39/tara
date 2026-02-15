export class Supplier {
  id: string;
  tenantId: string;
  name: string;
  taxId: string;
  category: string;
  branchCode: string;
  complianceStatus: 'pending' | 'verified' | 'expired';
  rating: number;
  createdAt: Date;
  updatedAt: Date;
}

