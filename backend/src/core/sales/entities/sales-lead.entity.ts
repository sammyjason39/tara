export class SalesLead {
  id: string;
  tenant_id: string;
  company_name: string;
  contact_name: string;
  contact_email?: string;
  contactPhone?: string;
  source: "marketing" | "referral" | "inbound" | "outbound" | "partner";
  owner_id: string;
  owner_name: string;
  score: number;
  potential_value: number;
  currency: "IDR" | "USD";
  priority: "low" | "medium" | "high" | "urgent";
  status:
    | "new"
    | "assigned"
    | "contacted"
    | "qualified"
    | "disqualified"
    | "converted";
  sla_due_at: Date;
  firstResponseAt?: Date;
  created_at: Date;
  updated_at: Date;
}
