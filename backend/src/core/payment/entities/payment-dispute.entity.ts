export class PaymentDispute {
  id: string;
  tenantId: string;
  paymentId: string;
  reason: string;
  amount: number;
  status:
    | 'opened'
    | 'evidence_attached'
    | 'finance_review'
    | 'provider_submitted'
    | 'resolved'
    | 'rejected';
  openedBy: string;
  evidence: string[];
  providerCaseId?: string;
  resolution?: 'won' | 'lost' | 'settled';
  createdAt: Date;
  updatedAt: Date;
}

export class PaymentChargeback {
  id: string;
  tenantId: string;
  paymentId: string;
  disputeId: string;
  amount: number;
  status: 'open' | 'submitted' | 'won' | 'lost';
  createdAt: Date;
  updatedAt: Date;
}

