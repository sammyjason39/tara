export class MarketingAttribution {
  id: string;
  tenant_id: string;
  campaignId: string;
  lead_id: string;
  opportunityId?: string;
  salesOrderId?: string;
  revenueAttributed: number;
  spend: number;
  roiPercent: number;
  created_at: Date;
}
