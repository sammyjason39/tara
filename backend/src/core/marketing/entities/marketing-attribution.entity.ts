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
  model: string;
  created_at: Date;
  branch_id?: string;
  ecommerce_id?: string;
}


