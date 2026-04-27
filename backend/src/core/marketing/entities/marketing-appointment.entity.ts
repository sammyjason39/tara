export interface MarketingAppointment {
  id: string;
  tenant_id: string;
  company_id: string;
  contact_id: string;
  staff_id?: string;
  scheduled_at: Date;
  duration_mins: number;
  status: string;
  notes?: string;
  created_at: Date;
  updated_at: Date;
  branch_id?: string;
  ecommerce_id?: string;
}


