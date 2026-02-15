export class SalesQuote {
  id: string;
  tenantId: string;
  opportunityId: string;
  accountName: string;
  version: number;
  amount: number;
  discountPercent: number;
  netAmount: number;
  currency: 'IDR' | 'USD';
  status:
    | 'draft'
    | 'pending_approval'
    | 'approved'
    | 'rejected'
    | 'sent'
    | 'accepted'
    | 'expired';
  validUntil: Date;
  approvalBy?: string;
  approvalAt?: Date;
  notes?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}
