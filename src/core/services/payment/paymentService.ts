import { audit } from "@/core/logging/audit";
import { mockPaymentRepo } from "@/core/repositories/payment/mockPaymentRepo";
import type { SessionContext } from "@/core/security/session";
import type {
  DevicePool,
  EvidencePack,
  PaymentAuditEntity,
  PaymentAuditEvent,
  PaymentChargeback,
  PaymentDashboardMetrics,
  PaymentDispute,
  PaymentExecutionStatus,
  PaymentProvider,
  PaymentProviderId,
  PaymentRefund,
  PaymentTransaction,
  PaymentTransactionType,
  PosDevice,
  RoutingPolicy,
  SettlementRecord,
} from "@/core/types/payment/payment";

const repo = mockPaymentRepo;

const nowIso = () => new Date().toISOString();
const createId = (prefix: string) =>
  `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;

const ensureTenant = (tenantId: string, session: SessionContext) => {
  if (session.role === "SUPERADMIN") return;
  if (session.tenantId !== tenantId) throw new Error("Tenant access denied");
};

const hashValue = (input: string) => {
  let hash = 0;
  for (let index = 0; index < input.length; index += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(index);
    hash |= 0;
  }
  return `chk-${Math.abs(hash).toString(16)}`;
};

const buildIdempotencyKey = (payload: {
  tenantId: string;
  type: PaymentTransactionType;
  amount: number;
  destination: string;
  externalReference?: string;
}) =>
  hashValue(
    `${payload.tenantId}|${payload.type}|${payload.amount}|${payload.destination}|${payload.externalReference ?? ""}`,
  );

const writeAudit = (
  tenantId: string,
  actorId: string,
  action: string,
  entityType: PaymentAuditEntity,
  entityId: string,
  detail: string,
) => {
  const event: PaymentAuditEvent = {
    id: createId("pay-audit"),
    tenantId,
    actorId,
    action,
    entityType,
    entityId,
    detail,
    createdAt: nowIso(),
  };
  repo.createAuditEvent(tenantId, event);
  audit.log({
    tenantId,
    actorId,
    action: `payment.${action}`,
    entityType: entityType.toLowerCase(),
    entityId,
    after: JSON.parse(JSON.stringify(event)) as Record<string, unknown>,
  });
};

const isExecutionAllowed = (status: PaymentExecutionStatus) =>
  status === "APPROVED" || status === "PROVIDER_SELECTED";

const resolvePrimaryPolicy = (tenantId: string) =>
  repo.listRoutingPolicies(tenantId).find((item) => item.enabled);

const pickProviderByPolicy = (
  policy: RoutingPolicy,
  providers: PaymentProvider[],
  amount: number,
) => {
  const ordered = [...policy.priorities, ...policy.fallbackProviders];
  for (const providerId of ordered) {
    const provider = providers.find(
      (item) =>
        item.id === providerId &&
        item.status !== "DOWN" &&
        item.maxAmountPerTxn >= amount,
    );
    if (provider) return provider;
  }
  return null;
};

const mapMethodToChannel = (method: string): PaymentTransaction["channel"] => {
  const normalized = method.toUpperCase();
  if (normalized.includes("CARD")) return "CARD_ONLINE";
  if (normalized.includes("QR")) return "QR";
  if (["GOPAY", "OVO", "DANA", "SHOPEEPAY"].includes(normalized)) return "WALLET";
  return "BANK_TRANSFER";
};

export const paymentService = {
  listTransactions: (tenantId: string) => repo.listTransactions(tenantId),
  listProviders: (tenantId: string) => repo.listProviders(tenantId),
  listRoutingPolicies: (tenantId: string) => repo.listRoutingPolicies(tenantId),
  listDevices: (tenantId: string) => repo.listDevices(tenantId),
  listDevicePools: (tenantId: string) => repo.listDevicePools(tenantId),
  listSettlements: (tenantId: string) => repo.listSettlements(tenantId),
  listRefunds: (tenantId: string) => repo.listRefunds(tenantId),
  listDisputes: (tenantId: string) => repo.listDisputes(tenantId),
  listChargebacks: (tenantId: string) => repo.listChargebacks(tenantId),
  listEvidencePacks: (tenantId: string) => repo.listEvidencePacks(tenantId),
  listAuditEvents: (tenantId: string) => repo.listAuditEvents(tenantId),

  getDashboard(tenantId: string): PaymentDashboardMetrics {
    const tx = repo.listTransactions(tenantId);
    const disputes = repo.listDisputes(tenantId);
    const chargebacks = repo.listChargebacks(tenantId);
    const refunds = repo.listRefunds(tenantId);
    const now = new Date();
    const settledToday = tx.filter((item) => {
      if (item.status !== "SETTLED") return false;
      const updated = new Date(item.updatedAt);
      return (
        updated.getFullYear() === now.getFullYear() &&
        updated.getMonth() === now.getMonth() &&
        updated.getDate() === now.getDate()
      );
    }).length;
    return {
      pendingApprovals: tx.filter((item) => item.status === "APPROVAL_PENDING").length,
      executingPayments: tx.filter((item) => item.status === "EXECUTING").length,
      settlementPending: tx.filter((item) => item.status === "SETTLEMENT_PENDING").length,
      settledToday,
      failedTransactions: tx.filter((item) => item.status === "FAILED").length,
      openDisputes: disputes.filter((item) => !["RESOLVED", "REJECTED"].includes(item.status))
        .length,
      openChargebacks: chargebacks.filter((item) => !["WON", "LOST"].includes(item.status))
        .length,
      refundPending: refunds.filter((item) => !["SETTLED", "REJECTED", "FAILED"].includes(item.status))
        .length,
    };
  },

  createExecutionRequest(
    tenantId: string,
    session: SessionContext,
    payload: {
      type: PaymentTransactionType;
      amount: number;
      destination: string;
      currency?: "IDR" | "USD";
      channel?: PaymentTransaction["channel"];
      source?: string;
      externalReference?: string;
      idempotencyKey?: string;
    },
  ): PaymentTransaction {
    ensureTenant(tenantId, session);
    const idempotencyKey =
      payload.idempotencyKey ??
      buildIdempotencyKey({
        tenantId,
        type: payload.type,
        amount: payload.amount,
        destination: payload.destination,
        externalReference: payload.externalReference,
      });
    const existing = repo
      .listTransactions(tenantId)
      .find((item) => item.idempotencyKey === idempotencyKey);
    if (existing) return existing;

    const created: PaymentTransaction = {
      id: createId("pay"),
      tenantId,
      externalReference: payload.externalReference,
      type: payload.type,
      amount: Math.max(0, payload.amount),
      currency: payload.currency ?? "IDR",
      destination: payload.destination,
      source: payload.source,
      channel: payload.channel ?? "BANK_TRANSFER",
      idempotencyKey,
      status: "APPROVAL_PENDING",
      retryAttempts: [],
      createdBy: session.userId,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    repo.createTransaction(tenantId, created);
    writeAudit(
      tenantId,
      session.userId,
      "request.created",
      "TRANSACTION",
      created.id,
      `${created.type} ${created.amount} ${created.currency}`,
    );
    return created;
  },

  approveRequest(tenantId: string, session: SessionContext, paymentId: string) {
    ensureTenant(tenantId, session);
    const updated = repo.updateTransaction(tenantId, paymentId, {
      status: "APPROVED",
      approvedBy: session.userId,
      approvedAt: nowIso(),
      updatedAt: nowIso(),
    });
    if (!updated) throw new Error("Payment request not found.");
    writeAudit(
      tenantId,
      session.userId,
      "request.approved",
      "TRANSACTION",
      paymentId,
      "Approval chain completed.",
    );
    return updated;
  },

  rejectRequest(
    tenantId: string,
    session: SessionContext,
    paymentId: string,
    reason?: string,
  ) {
    ensureTenant(tenantId, session);
    const updated = repo.updateTransaction(tenantId, paymentId, {
      status: "REJECTED",
      approvedBy: session.userId,
      approvedAt: nowIso(),
      updatedAt: nowIso(),
    });
    if (!updated) throw new Error("Payment request not found.");
    writeAudit(
      tenantId,
      session.userId,
      "request.rejected",
      "TRANSACTION",
      paymentId,
      reason ?? "Rejected by approver.",
    );
    return updated;
  },

  selectProvider(
    tenantId: string,
    session: SessionContext,
    paymentId: string,
    forcedProviderId?: PaymentProviderId,
  ) {
    ensureTenant(tenantId, session);
    const payment = repo.listTransactions(tenantId).find((item) => item.id === paymentId);
    if (!payment) throw new Error("Payment request not found.");
    if (payment.status === "REJECTED") throw new Error("Rejected payment cannot be routed.");

    let provider: PaymentProvider | null = null;
    if (forcedProviderId) {
      provider =
        repo.listProviders(tenantId).find((item) => item.id === forcedProviderId) ?? null;
      if (!provider) throw new Error("Selected provider is unavailable.");
    } else {
      const policy = resolvePrimaryPolicy(tenantId);
      if (!policy) throw new Error("No active routing policy.");
      provider = pickProviderByPolicy(policy, repo.listProviders(tenantId), payment.amount);
      if (!provider) throw new Error("No healthy provider satisfies routing policy.");
    }

    const updated = repo.updateTransaction(tenantId, paymentId, {
      providerId: provider.id,
      status: "PROVIDER_SELECTED",
      updatedAt: nowIso(),
    });
    if (!updated) throw new Error("Failed to route payment.");
    writeAudit(
      tenantId,
      session.userId,
      "provider.selected",
      "ROUTING",
      paymentId,
      `Provider selected: ${provider.id}`,
    );
    return updated;
  },

  executePayment(
    tenantId: string,
    session: SessionContext,
    paymentId: string,
    options?: { forceFail?: boolean },
  ) {
    ensureTenant(tenantId, session);
    const payment = repo.listTransactions(tenantId).find((item) => item.id === paymentId);
    if (!payment) throw new Error("Payment request not found.");
    if (!isExecutionAllowed(payment.status)) {
      throw new Error("Payment requires approval and provider selection before execution.");
    }
    const policy = resolvePrimaryPolicy(tenantId);
    if (!policy) throw new Error("No active routing policy.");
    const provider = payment.providerId
      ? repo.listProviders(tenantId).find((item) => item.id === payment.providerId)
      : null;
    if (!provider) throw new Error("Provider is not configured.");

    repo.updateTransaction(tenantId, paymentId, { status: "EXECUTING", updatedAt: nowIso() });

    const attempts = [...payment.retryAttempts];
    let success = false;
    for (let attempt = 1; attempt <= policy.maxRetries; attempt += 1) {
      const failedByHealth = provider.status === "DOWN";
      const failedByForce = options?.forceFail === true;
      const result = !failedByHealth && !failedByForce && attempt === 1 ? "SUCCESS" : "FAILED";
      attempts.push({
        attempt,
        attemptedAt: nowIso(),
        providerId: provider.id,
        result,
        reason: result === "FAILED" ? "Provider/network failure" : undefined,
      });
      if (result === "SUCCESS") {
        success = true;
        break;
      }
    }

    if (!success) {
      const failed = repo.updateTransaction(tenantId, paymentId, {
        status: "FAILED",
        retryAttempts: attempts,
        updatedAt: nowIso(),
      });
      if (!failed) throw new Error("Failed to mark payment failure.");
      writeAudit(
        tenantId,
        session.userId,
        "execution.failed",
        "TRANSACTION",
        paymentId,
        `Retries exhausted (${policy.maxRetries}).`,
      );
      return failed;
    }

    const settlement: SettlementRecord = {
      id: createId("settlement"),
      tenantId,
      paymentId,
      providerReference: `${provider.id}-${Date.now()}`,
      status: "PENDING",
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    repo.createSettlement(tenantId, settlement);

    const updated = repo.updateTransaction(tenantId, paymentId, {
      status: "SETTLEMENT_PENDING",
      settlementId: settlement.id,
      retryAttempts: attempts,
      updatedAt: nowIso(),
    });
    if (!updated) throw new Error("Failed to update payment state.");
    writeAudit(
      tenantId,
      session.userId,
      "execution.sent",
      "TRANSACTION",
      paymentId,
      `Execution sent to ${provider.id}, awaiting settlement.`,
    );
    return updated;
  },

  confirmSettlement(tenantId: string, session: SessionContext, paymentId: string) {
    ensureTenant(tenantId, session);
    const payment = repo.listTransactions(tenantId).find((item) => item.id === paymentId);
    if (!payment) throw new Error("Payment request not found.");
    if (!payment.settlementId) throw new Error("Payment has no settlement record.");
    if (payment.status !== "SETTLEMENT_PENDING") {
      throw new Error("Settlement confirmation allowed only from settlement-pending state.");
    }
    const settlement = repo.updateSettlement(tenantId, payment.settlementId, {
      status: "CONFIRMED",
      confirmedAt: nowIso(),
      updatedAt: nowIso(),
    });
    if (!settlement) throw new Error("Settlement record not found.");

    const payload = JSON.stringify({
      paymentId: payment.id,
      providerReference: settlement.providerReference,
      amount: payment.amount,
      destination: payment.destination,
      approvedBy: payment.approvedBy,
      approvedAt: payment.approvedAt,
    });
    const evidence: EvidencePack = {
      id: createId("evidence"),
      tenantId,
      paymentId: payment.id,
      providerProof: settlement.providerReference,
      approvalSignatures: [payment.createdBy, payment.approvedBy ?? session.userId],
      checksum: hashValue(payload),
      payload,
      createdAt: nowIso(),
    };
    repo.createEvidencePack(tenantId, evidence);

    const updated = repo.updateTransaction(tenantId, paymentId, {
      status: "SETTLED",
      evidencePackId: evidence.id,
      ledgerSyncTriggeredAt: nowIso(),
      updatedAt: nowIso(),
    });
    if (!updated) throw new Error("Failed to complete settlement.");
    writeAudit(
      tenantId,
      session.userId,
      "settlement.confirmed",
      "SETTLEMENT",
      settlement.id,
      "Settlement confirmed. Ledger sync trigger emitted.",
    );
    return updated;
  },

  createRefund(
    tenantId: string,
    session: SessionContext,
    payload: {
      paymentId: string;
      type: PaymentRefund["type"];
      amount: number;
      reason: string;
      scheduledAt?: string;
    },
  ) {
    ensureTenant(tenantId, session);
    const payment = repo.listTransactions(tenantId).find((item) => item.id === payload.paymentId);
    if (!payment) throw new Error("Original payment not found.");
    if (payment.status !== "SETTLED") {
      throw new Error("Refund allowed only for settled payments.");
    }
    const created: PaymentRefund = {
      id: createId("refund"),
      tenantId,
      paymentId: payload.paymentId,
      type: payload.type,
      amount: payload.amount,
      reason: payload.reason,
      status: "REQUESTED",
      requestedBy: session.userId,
      scheduledAt: payload.scheduledAt,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    repo.createRefund(tenantId, created);
    writeAudit(
      tenantId,
      session.userId,
      "refund.requested",
      "REFUND",
      created.id,
      `${created.type} refund requested.`,
    );
    return created;
  },

  approveRefund(tenantId: string, session: SessionContext, refundId: string) {
    ensureTenant(tenantId, session);
    const updated = repo.updateRefund(tenantId, refundId, {
      status: "APPROVED",
      approvedBy: session.userId,
      updatedAt: nowIso(),
    });
    if (!updated) throw new Error("Refund not found.");
    writeAudit(
      tenantId,
      session.userId,
      "refund.approved",
      "REFUND",
      refundId,
      "Refund approved.",
    );
    return updated;
  },

  executeRefund(tenantId: string, session: SessionContext, refundId: string) {
    ensureTenant(tenantId, session);
    const refund = repo.listRefunds(tenantId).find((item) => item.id === refundId);
    if (!refund) throw new Error("Refund not found.");
    if (refund.status !== "APPROVED") throw new Error("Refund must be approved first.");
    const providerReference = `RFD-${Date.now()}`;
    const updated = repo.updateRefund(tenantId, refundId, {
      status: "SETTLED",
      providerReference,
      updatedAt: nowIso(),
    });
    if (!updated) throw new Error("Failed to execute refund.");
    writeAudit(
      tenantId,
      session.userId,
      "refund.settled",
      "REFUND",
      refundId,
      `Refund settled with reference ${providerReference}.`,
    );
    return updated;
  },

  openDispute(
    tenantId: string,
    session: SessionContext,
    payload: { paymentId: string; amount: number; reason: string },
  ) {
    ensureTenant(tenantId, session);
    const payment = repo.listTransactions(tenantId).find((item) => item.id === payload.paymentId);
    if (!payment) throw new Error("Payment not found for dispute.");
    const created: PaymentDispute = {
      id: createId("dispute"),
      tenantId,
      paymentId: payload.paymentId,
      reason: payload.reason,
      amount: payload.amount,
      status: "OPENED",
      openedBy: session.userId,
      evidence: [],
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    repo.createDispute(tenantId, created);
    writeAudit(
      tenantId,
      session.userId,
      "dispute.opened",
      "DISPUTE",
      created.id,
      created.reason,
    );
    return created;
  },

  attachDisputeEvidence(
    tenantId: string,
    session: SessionContext,
    disputeId: string,
    evidenceItem: string,
  ) {
    ensureTenant(tenantId, session);
    const dispute = repo.listDisputes(tenantId).find((item) => item.id === disputeId);
    if (!dispute) throw new Error("Dispute not found.");
    const updated = repo.updateDispute(tenantId, disputeId, {
      status: "EVIDENCE_ATTACHED",
      evidence: [...dispute.evidence, evidenceItem],
      updatedAt: nowIso(),
    });
    if (!updated) throw new Error("Failed to attach evidence.");
    writeAudit(
      tenantId,
      session.userId,
      "dispute.evidence_attached",
      "DISPUTE",
      disputeId,
      evidenceItem,
    );
    return updated;
  },

  progressDispute(
    tenantId: string,
    session: SessionContext,
    disputeId: string,
    status: PaymentDispute["status"],
  ) {
    ensureTenant(tenantId, session);
    const dispute = repo.updateDispute(tenantId, disputeId, {
      status,
      updatedAt: nowIso(),
      providerCaseId: status === "PROVIDER_SUBMITTED" ? `CASE-${Date.now()}` : undefined,
    });
    if (!dispute) throw new Error("Dispute not found.");
    writeAudit(
      tenantId,
      session.userId,
      "dispute.status_changed",
      "DISPUTE",
      disputeId,
      status,
    );
    return dispute;
  },

  resolveDispute(
    tenantId: string,
    session: SessionContext,
    disputeId: string,
    resolution: NonNullable<PaymentDispute["resolution"]>,
  ) {
    ensureTenant(tenantId, session);
    const dispute = repo.updateDispute(tenantId, disputeId, {
      status: "RESOLVED",
      resolution,
      updatedAt: nowIso(),
    });
    if (!dispute) throw new Error("Dispute not found.");

    const chargeback: PaymentChargeback = {
      id: createId("chargeback"),
      tenantId,
      paymentId: dispute.paymentId,
      disputeId: dispute.id,
      amount: dispute.amount,
      status: resolution === "LOST" ? "LOST" : "WON",
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    repo.createChargeback(tenantId, chargeback);
    writeAudit(
      tenantId,
      session.userId,
      "dispute.resolved",
      "CHARGEBACK",
      chargeback.id,
      `Resolution: ${resolution}`,
    );
    return dispute;
  },

  runProviderHealthCheck(tenantId: string, session: SessionContext) {
    ensureTenant(tenantId, session);
    const providers = repo.listProviders(tenantId);
    const updated = providers.map((provider) => {
      const nextStatus = provider.status === "DOWN" ? "DEGRADED" : provider.status;
      const saved = repo.updateProvider(tenantId, provider.id, {
        status: nextStatus,
        lastHeartbeatAt: nowIso(),
      });
      return saved ?? provider;
    });
    writeAudit(
      tenantId,
      session.userId,
      "provider.health_checked",
      "ROUTING",
      "health-sweep",
      "Provider health status refreshed.",
    );
    return updated;
  },

  setProviderStatus(
    tenantId: string,
    session: SessionContext,
    providerId: PaymentProviderId,
    status: PaymentProvider["status"],
  ) {
    ensureTenant(tenantId, session);
    const updated = repo.updateProvider(tenantId, providerId, {
      status,
      lastHeartbeatAt: nowIso(),
    });
    if (!updated) throw new Error("Provider not found.");
    writeAudit(
      tenantId,
      session.userId,
      "provider.status_changed",
      "ROUTING",
      providerId,
      status,
    );
    return updated;
  },

  setDeviceStatus(
    tenantId: string,
    session: SessionContext,
    deviceId: string,
    status: PosDevice["status"],
  ) {
    ensureTenant(tenantId, session);
    const updated = repo.updateDevice(tenantId, deviceId, { status });
    if (!updated) throw new Error("Device not found.");
    writeAudit(
      tenantId,
      session.userId,
      "device.status_changed",
      "DEVICE",
      deviceId,
      status,
    );
    return updated;
  },

  resolveDeviceForLocation(tenantId: string, location: string): PosDevice | null {
    const pools = repo.listDevicePools(tenantId);
    const devices = repo.listDevices(tenantId);
    const pool = pools.find((item) => item.location === location);
    if (!pool) return null;
    const inOrder = [pool.primaryDeviceId, ...pool.fallbackDeviceIds];
    for (const deviceId of inOrder) {
      const device = devices.find((item) => item.id === deviceId);
      if (device && device.approved && device.status === "ONLINE") return device;
    }
    return null;
  },

  createFinancePaymentRequest(
    tenantId: string,
    session: SessionContext,
    payload: {
      destination: string;
      amount: number;
      method: string;
      purpose: string;
      externalReference?: string;
    },
  ) {
    return this.createExecutionRequest(tenantId, session, {
      type: "VENDOR_PAYOUT",
      amount: payload.amount,
      destination: payload.destination,
      source: "Finance",
      channel: mapMethodToChannel(payload.method),
      externalReference: payload.externalReference,
    });
  },

  processFinanceApproval(
    tenantId: string,
    session: SessionContext,
    paymentId: string,
    approved: boolean,
  ) {
    if (!approved) return this.rejectRequest(tenantId, session, paymentId, "Rejected from Finance.");
    const approvedPayment = this.approveRequest(tenantId, session, paymentId);
    this.selectProvider(tenantId, session, approvedPayment.id);
    return approvedPayment;
  },
};

