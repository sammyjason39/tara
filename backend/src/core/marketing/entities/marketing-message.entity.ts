export interface MarketingOmnichannelMessage {
  id: string;
  tenant_id: string;
  company_id: string;
  contact_id: string;
  channel: string;
  direction: string;
  content: string;
  status: string;
  sent_at: Date;
  metadata?: any;
}


