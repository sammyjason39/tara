export class TalentLead {
  id: string;
  tenant_id: string;
  source: string;
  externalProfileUrl?: string;
  name: string;
  email?: string;
  phone?: string;
  headline?: string;
  skills?: any;
  leadScore: number;
  status: string;
  metadata?: any;
  created_at: Date;
  updated_at: Date;
}
