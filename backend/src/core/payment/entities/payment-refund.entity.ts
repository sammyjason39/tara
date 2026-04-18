export class PaymentRefund {
  id: string;
  tenant_id: string;
  paymentId: string;
  type: "full" | "partial" | "scheduled";
  amount: number;
  reason: string;
  status:
    | "requested"
    | "approved"
    | "executing"
    | "settled"
    | "failed"
    | "rejected";
  requested_by: string;
  approvedBy?: string;
  scheduledAt?: Date;
  providerReference?: string;
  created_at: Date;
  updated_at: Date;
}
