export class PaymentSettlement {
  id: string;
  tenant_id: string;
  paymentId: string;
  providerReference: string;
  status: "pending" | "confirmed" | "failed";
  confirmedAt?: Date;
  created_at: Date;
  updated_at: Date;
}

export class PaymentEvidencePack {
  id: string;
  tenant_id: string;
  paymentId: string;
  providerProof: string;
  approvalSignatures: string[];
  checksum: string;
  payload: string;
  created_at: Date;
}

export class PaymentAuditEvent {
  id: string;
  tenant_id: string;
  actor_id: string;
  action: string;
  entity_type:
    | "transaction"
    | "refund"
    | "dispute"
    | "chargeback"
    | "settlement"
    | "routing"
    | "device"
    | "evidence";
  entity_id: string;
  detail: string;
  created_at: Date;
}
