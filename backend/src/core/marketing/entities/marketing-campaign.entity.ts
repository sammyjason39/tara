export class MarketingCampaign {
  id: string;
  tenant_id: string;
  name: string;
  objective: "lead_generation" | "awareness" | "nurture" | "remarketing";
  channel_mix: Array<
    | "meta_ads"
    | "google_ads"
    | "email"
    | "whatsapp"
    | "webinar"
    | "landing_page"
    | "event"
  >;
  owner_id: string;
  owner_name: string;
  budget: number;
  currency: "IDR" | "USD";
  status: "draft" | "scheduled" | "active" | "paused" | "completed" | "failed";
  start_date: string;
  end_date: string;
  audience: string;
  aiRecommendation?: string;
  created_at: Date;
  updated_at: Date;
  branch_id?: string;
  ecommerce_id?: string;

}



