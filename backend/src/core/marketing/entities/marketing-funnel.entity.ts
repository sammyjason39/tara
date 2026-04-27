export interface MarketingFunnelStep {
  id: string;
  funnel_id: string;
  name: string;
  type: string;
  order: number;
  config?: any;
  stats?: any;
  created_at: Date;
  updated_at: Date;
  branch_id?: string;
  ecommerce_id?: string;
}

export interface MarketingFunnel {
  id: string;
  tenant_id: string;
  company_id: string;
  name: string;
  description?: string;
  status: string;
  steps: MarketingFunnelStep[];
  created_at: Date;
  updated_at: Date;
  branch_id?: string;
  ecommerce_id?: string;
}


