export class MarketingLead {
  id: string;
  tenantId: string;
  campaignId?: string;
  source:
    | 'landing_page'
    | 'embedded_form'
    | 'chatbot'
    | 'webinar'
    | 'meta_lead_ads'
    | 'google_ads'
    | 'partner_api';
  companyName: string;
  contactName: string;
  email?: string;
  phone?: string;
  country?: string;
  industry?: string;
  employeeBand?: string;
  dedupKey: string;
  score: number;
  intent: 'low' | 'medium' | 'high';
  status: 'captured' | 'enriched' | 'scored' | 'qualified' | 'handoff_ready' | 'handoff_sent';
  qualificationReason: string;
  salesHandoffId?: string;
  createdAt: Date;
  updatedAt: Date;
}

