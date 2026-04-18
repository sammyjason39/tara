export class PaymentDispute {
  id: string;
  tenant_id: string;
  paymentId: string;
  reason: string;
  amount: number;
  status:
    | "opened"
    | "evidence_attached"
    | "finance_review"
    | "provider_submitted"
    | "resolved"
    | "rejected";
  openedBy: string;
  evidence: string[];
  providerCaseId?: string;
  resolution?: "won" | "lost" | "settled";
  created_at: Date;
  updated_at: Date;
}

export class PaymentChargeback {
  id: string;
  tenant_id: string;
  paymentId: string;
  disputeId: string;
  amount: number;
  status: "open" | "submitted" | "won" | "lost";
  created_at: Date;
  updated_at: Date;
}
