export class PaymentRetryAttempt {
  attempt: number;
  attemptedAt: Date;
  providerId: string;
  result: "success" | "failed";
  reason?: string;
}

export class PaymentTransaction {
  id: string;
  tenant_id: string;
  externalReference?: string;
  type:
    | "vendor_payout"
    | "customer_collection"
    | "treasury_transfer"
    | "pos_payment"
    | "payroll_payout"
    | "refund_payout";
  amount: number;
  currency: "IDR" | "USD";
  destination: string;
  source?: string;
  channel: "bank_transfer" | "card_online" | "card_pos" | "wallet" | "qr";
  providerId?: string;
  idempotency_key: string;
  status:
    | "request_created"
    | "approval_pending"
    | "approved"
    | "provider_selected"
    | "executing"
    | "settlement_pending"
    | "settled"
    | "failed"
    | "rejected"
    | "cancelled"
    | "refunded";
  
  // Unified Gateway Fields
  method?: "CASH" | "EDC" | "GATEWAY";
  provider?: "STRIPE" | "XENDIT" | "MIDTRANS" | "MANUAL";
  paymentStatus?: "PENDING" | "PAID" | "FAILED" | "SETTLED" | "REFUNDED";
  externalRef?: string;
  platformFee?: number;
  platformFeePending?: number;
  platformFeeRealized?: number;
  gatewayFee?: number;
  netAmount?: number;
  feeAbsorbedBy?: "MERCHANT" | "CUSTOMER";
  retryCount?: number;
  lastCheckedAt?: Date;

  retryAttempts: PaymentRetryAttempt[];
  settlementId?: string;
  ledgerSyncTriggeredAt?: Date;
  evidencePackId?: string;
  expiresAt?: Date;
  createdBy: string;
  approvedBy?: string;
  approvedAt?: Date;
  created_at: Date;
  updated_at: Date;
}
