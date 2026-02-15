export class MarketingAttribution {
  id: string;
  tenantId: string;
  campaignId: string;
  leadId: string;
  opportunityId?: string;
  salesOrderId?: string;
  revenueAttributed: number;
  spend: number;
  roiPercent: number;
  createdAt: Date;
}

