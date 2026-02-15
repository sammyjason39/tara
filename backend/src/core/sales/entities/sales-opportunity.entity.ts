export class SalesOpportunity {
  id: string;
  tenantId: string;
  leadId?: string;
  accountName: string;
  ownerId: string;
  ownerName: string;
  stage:
    | 'new'
    | 'contacted'
    | 'qualified'
    | 'proposal'
    | 'negotiation'
    | 'closed_won'
    | 'closed_lost';
  probability: number;
  amount: number;
  currency: 'IDR' | 'USD';
  expectedCloseDate: Date;
  health: 'low_risk' | 'medium_risk' | 'high_risk';
  nextAction: string;
  lastActivityAt: Date;
  createdAt: Date;
  updatedAt: Date;
}
