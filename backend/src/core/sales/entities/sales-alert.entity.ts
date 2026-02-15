export class SalesAlert {
  id: string;
  tenantId: string;
  type:
    | 'lead_sla_breach'
    | 'follow_up_overdue'
    | 'deal_risk'
    | 'quote_approval_delay';
  severity: 'low' | 'medium' | 'high';
  entityType: 'lead' | 'opportunity' | 'quote' | 'task';
  entityId: string;
  message: string;
  acknowledged: boolean;
  createdAt: Date;
  updatedAt: Date;
}
