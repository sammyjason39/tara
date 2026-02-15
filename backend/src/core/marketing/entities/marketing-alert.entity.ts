export class MarketingAlert {
  id: string;
  tenantId: string;
  type: 'lead_spike' | 'campaign_failure' | 'token_expiry' | 'handoff_delay';
  severity: 'low' | 'medium' | 'high';
  entityType: 'campaign' | 'lead' | 'account' | 'workflow';
  entityId: string;
  message: string;
  acknowledged: boolean;
  createdAt: Date;
  updatedAt: Date;
}

