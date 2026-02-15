export class PaymentRefund {
  id: string;
  tenantId: string;
  paymentId: string;
  type: 'full' | 'partial' | 'scheduled';
  amount: number;
  reason: string;
  status: 'requested' | 'approved' | 'executing' | 'settled' | 'failed' | 'rejected';
  requestedBy: string;
  approvedBy?: string;
  scheduledAt?: Date;
  providerReference?: string;
  createdAt: Date;
  updatedAt: Date;
}

