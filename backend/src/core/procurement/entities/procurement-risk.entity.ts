export class ProcurementRisk {
  id: string;
  tenantId: string;
  code: 'price_spike' | 'approval_bypass' | 'duplicate_invoice' | 'supplier_risk';
  severity: 'low' | 'medium' | 'high';
  status: 'open' | 'acknowledged' | 'resolved';
  entityId: string;
  detail: string;
  createdAt: Date;
  updatedAt: Date;
}

