export interface MarketingCreativeAsset {
  id: string;
  tenant_id: string;
  company_id: string;
  name: string;
  type: string;
  url: string;
  tags: string[];
  metadata?: any;
  created_at: Date;
  updated_at: Date;
  branch_id?: string;
  ecommerce_id?: string;
}


