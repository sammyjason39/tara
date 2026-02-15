export class MarketingExecution {
  id: string;
  tenantId: string;
  campaignId: string;
  channel: 'meta_ads' | 'google_ads' | 'email' | 'whatsapp' | 'webinar' | 'landing_page' | 'event';
  scheduledAt: Date;
  status: 'scheduled' | 'running' | 'completed' | 'failed';
  leadsGenerated: number;
  spend: number;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

