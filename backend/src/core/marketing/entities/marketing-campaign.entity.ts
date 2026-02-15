export class MarketingCampaign {
  id: string;
  tenantId: string;
  name: string;
  objective: 'lead_generation' | 'awareness' | 'nurture' | 'remarketing';
  channelMix: Array<
    'meta_ads' | 'google_ads' | 'email' | 'whatsapp' | 'webinar' | 'landing_page' | 'event'
  >;
  ownerId: string;
  ownerName: string;
  budget: number;
  currency: 'IDR' | 'USD';
  status: 'draft' | 'scheduled' | 'active' | 'paused' | 'completed' | 'failed';
  startDate: string;
  endDate: string;
  audience: string;
  aiRecommendation?: string;
  createdAt: Date;
  updatedAt: Date;
}

