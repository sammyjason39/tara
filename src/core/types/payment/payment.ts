export type PaymentTransactionType =
  | "VENDOR_PAYOUT"
  | "CUSTOMER_COLLECTION"
  | "TREASURY_TRANSFER"
  | "POS_PAYMENT"
  | "PAYROLL_PAYOUT"
  | "REFUND_PAYOUT";

export type PaymentExecutionStatus =
  | "REQUEST_CREATED"
  | "APPROVAL_PENDING"
  | "APPROVED"
  | "PROVIDER_SELECTED"
  | "EXECUTING"
  | "SETTLEMENT_PENDING"
  | "SETTLED"
  | "FAILED"
  | "REJECTED"
  | "CANCELLED";

export type PaymentProviderId =
  | "BANK_BCA"
  | "BANK_MANDIRI"
  | "STRIPE"
  | "ADYEN"
  | "BANK_BNI"
  | "BANK_BRI";

export type PaymentChannel =
  | "BANK_TRANSFER"
  | "CARD_ONLINE"
  | "CARD_POS"
  | "WALLET"
  | "QR";

export type ProviderStatus = "HEALTHY" | "DEGRADED" | "DOWN";

export type PaymentProvider = {
  id: PaymentProviderId;
  tenantId: string;
  name: string;
  channels: PaymentChannel[];
  status: ProviderStatus;
  maxAmountPerTxn: number;
  settlementSlaHours: number;
  priority: number;
  lastHeartbeatAt: string;
};

export type RoutingPolicy = {
  id: string;
  tenantId: string;
  name: string;
  enabled: boolean;
  priorities: PaymentProviderId[];
  fallbackProviders: PaymentProviderId[];
  maxRetries: number;
  exponentialBackoffSeconds: number;
  createdAt: string;
  updatedAt: string;
};

export type DeviceStatus = "ONLINE" | "OFFLINE" | "MAINTENANCE";

export type PosDevice = {
  id: string;
  tenantId: string;
  location: string;
  deviceCode: string;
  approved: boolean;
  status: DeviceStatus;
  providerId: PaymentProviderId;
  lastUsedAt?: string;
};

export type DevicePool = {
  id: string;
  tenantId: string;
  location: string;
  primaryDeviceId: string;
  fallbackDeviceIds: string[];
  createdAt: string;
  updatedAt: string;
};

export type RetryAttempt = {
  attempt: number;
  attemptedAt: string;
  providerId: PaymentProviderId;
  result: "SUCCESS" | "FAILED";
  reason?: string;
};

export type SettlementRecord = {
  id: string;
  tenantId: string;
  paymentId: string;
  providerReference: string;
  status: "PENDING" | "CONFIRMED" | "FAILED";
  confirmedAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type PaymentTransaction = {
  id: string;
  tenantId: string;
  externalReference?: string;
  type: PaymentTransactionType;
  amount: number;
  currency: "IDR" | "USD";
  destination: string;
  source?: string;
  channel: PaymentChannel;
  providerId?: PaymentProviderId;
  idempotencyKey: string;
  status: PaymentExecutionStatus;
  retryAttempts: RetryAttempt[];
  settlementId?: string;
  ledgerSyncTriggeredAt?: string;
  evidencePackId?: string;
  createdBy: string;
  approvedBy?: string;
  approvedAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type RefundType = "FULL" | "PARTIAL" | "SCHEDULED";
export type RefundStatus =
  | "REQUESTED"
  | "APPROVED"
  | "EXECUTING"
  | "SETTLED"
  | "FAILED"
  | "REJECTED";

export type PaymentRefund = {
  id: string;
  tenantId: string;
  paymentId: string;
  type: RefundType;
  amount: number;
  reason: string;
  status: RefundStatus;
  requestedBy: string;
  approvedBy?: string;
  scheduledAt?: string;
  providerReference?: string;
  createdAt: string;
  updatedAt: string;
};

export type DisputeStatus =
  | "OPENED"
  | "EVIDENCE_ATTACHED"
  | "FINANCE_REVIEW"
  | "PROVIDER_SUBMITTED"
  | "RESOLVED"
  | "REJECTED";

export type PaymentDispute = {
  id: string;
  tenantId: string;
  paymentId: string;
  reason: string;
  amount: number;
  status: DisputeStatus;
  openedBy: string;
  evidence: string[];
  providerCaseId?: string;
  resolution?: "WON" | "LOST" | "SETTLED";
  createdAt: string;
  updatedAt: string;
};

export type ChargebackStatus = "OPEN" | "SUBMITTED" | "WON" | "LOST";

export type PaymentChargeback = {
  id: string;
  tenantId: string;
  paymentId: string;
  disputeId: string;
  amount: number;
  status: ChargebackStatus;
  createdAt: string;
  updatedAt: string;
};

export type EvidencePack = {
  id: string;
  tenantId: string;
  paymentId: string;
  providerProof: string;
  approvalSignatures: string[];
  checksum: string;
  payload: string;
  createdAt: string;
};

export type PaymentAuditEntity =
  | "TRANSACTION"
  | "REFUND"
  | "DISPUTE"
  | "CHARGEBACK"
  | "SETTLEMENT"
  | "ROUTING"
  | "DEVICE"
  | "EVIDENCE";

export type PaymentAuditEvent = {
  id: string;
  tenantId: string;
  actorId: string;
  action: string;
  entityType: PaymentAuditEntity;
  entityId: string;
  detail: string;
  createdAt: string;
};

export type PaymentDashboardMetrics = {
  pendingApprovals: number;
  executingPayments: number;
  settlementPending: number;
  settledToday: number;
  failedTransactions: number;
  openDisputes: number;
  openChargebacks: number;
  refundPending: number;
};

