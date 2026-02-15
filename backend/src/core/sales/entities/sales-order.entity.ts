export class SalesOrder {
  id: string;
  tenantId: string;
  opportunityId: string;
  quoteId?: string;
  customerName: string;
  amount: number;
  currency: 'IDR' | 'USD';
  status: 'draft' | 'pending_finance_handoff' | 'invoiced' | 'closed';
  inventoryCheck: 'available' | 'partial' | 'unavailable';
  financeInvoiceId?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}
