export class MarketingLead {
  id: string;
  tenant_id: string;
  campaignId?: string;
  source:
    | "landing_page"
    | "embedded_form"
    | "chatbot"
    | "webinar"
    | "meta_lead_ads"
    | "google_ads"
    | "partner_api";
  company_name: string;
  contact_name: string;
  email?: string;
  phone?: string;
  country?: string;
  industry?: string;
  employeeBand?: string;
  dedupKey: string;
  score: number;
  intent: "low" | "medium" | "high";
  status:
    | "captured"
    | "enriched"
    | "scored"
    | "qualified"
    | "handoff_ready"
    | "handoff_sent";
  qualificationReason: string;
  salesHandoffId?: string;
  created_at: Date;
  updated_at: Date;
  branch_id?: string;
  ecommerce_id?: string;

}



