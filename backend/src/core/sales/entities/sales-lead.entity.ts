export class SalesLead {
  id: string;
  tenantId: string;
  companyName: string;
  contactName: string;
  contactEmail?: string;
  contactPhone?: string;
  source: 'marketing' | 'referral' | 'inbound' | 'outbound' | 'partner';
  ownerId: string;
  ownerName: string;
  score: number;
  potentialValue: number;
  currency: 'IDR' | 'USD';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status:
    | 'new'
    | 'assigned'
    | 'contacted'
    | 'qualified'
    | 'disqualified'
    | 'converted';
  slaDueAt: Date;
  firstResponseAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
