export interface MarketingContact {
  id: string;
  tenant_id: string;
  company_id: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  tags: string[];
  score: number;
  status: string;
  behavioral_data?: any;
  last_interaction_at?: Date;
  created_at: Date;
  updated_at: Date;
  branch_id?: string;
  ecommerce_id?: string;
  lead_id?: string;
  customer_id?: string;
}


