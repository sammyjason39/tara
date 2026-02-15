export class PaymentRetryAttempt {
  attempt: number;
  attemptedAt: Date;
  providerId: string;
  result: 'success' | 'failed';
  reason?: string;
}

export class PaymentTransaction {
  id: string;
  tenantId: string;
  externalReference?: string;
  type:
    | 'vendor_payout'
    | 'customer_collection'
    | 'treasury_transfer'
    | 'pos_payment'
    | 'payroll_payout'
    | 'refund_payout';
  amount: number;
  currency: 'IDR' | 'USD';
  destination: string;
  source?: string;
  channel: 'bank_transfer' | 'card_online' | 'card_pos' | 'wallet' | 'qr';
  providerId?: string;
  idempotencyKey: string;
  status:
    | 'request_created'
    | 'approval_pending'
    | 'approved'
    | 'provider_selected'
    | 'executing'
    | 'settlement_pending'
    | 'settled'
    | 'failed'
    | 'rejected'
    | 'cancelled';
  retryAttempts: PaymentRetryAttempt[];
  settlementId?: string;
  ledgerSyncTriggeredAt?: Date;
  evidencePackId?: string;
  createdBy: string;
  approvedBy?: string;
  approvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

