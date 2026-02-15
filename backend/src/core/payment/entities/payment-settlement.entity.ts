export class PaymentSettlement {
  id: string;
  tenantId: string;
  paymentId: string;
  providerReference: string;
  status: 'pending' | 'confirmed' | 'failed';
  confirmedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export class PaymentEvidencePack {
  id: string;
  tenantId: string;
  paymentId: string;
  providerProof: string;
  approvalSignatures: string[];
  checksum: string;
  payload: string;
  createdAt: Date;
}

export class PaymentAuditEvent {
  id: string;
  tenantId: string;
  actorId: string;
  action: string;
  entityType:
    | 'transaction'
    | 'refund'
    | 'dispute'
    | 'chargeback'
    | 'settlement'
    | 'routing'
    | 'device'
    | 'evidence';
  entityId: string;
  detail: string;
  createdAt: Date;
}

