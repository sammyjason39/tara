export class MarketingExecution {
  id: string;
  tenant_id: string;
  campaignId: string;
  channel:
    | "meta_ads"
    | "google_ads"
    | "email"
    | "whatsapp"
    | "webinar"
    | "landing_page"
    | "event";
  scheduledAt: Date;
  status: "scheduled" | "running" | "completed" | "failed";
  leadsGenerated: number;
  spend: number;
  notes?: string;
  created_at: Date;
  updated_at: Date;
  branch_id?: string;
  ecommerce_id?: string;

}



