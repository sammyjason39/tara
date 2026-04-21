import { apiRequest } from "@/core/api/apiClient";
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

const mapMethodToChannel = (method: string): PaymentTransaction["channel"] => {
  const normalized = method.toUpperCase();
  if (normalized.includes("CARD")) return "CARD_ONLINE";
  if (normalized.includes("QR")) return "QR";
  if (["GOPAY", "OVO", "DANA", "SHOPEEPAY"].includes(normalized))
    return "WALLET";
  return "BANK_TRANSFER";
};

export const paymentService = {
  listTransactions: async (tenantId: string, session: SessionContext) =>
    apiRequest<PaymentTransaction[]>("/v1/payment/transactions", "GET", session),

  listProviders: async (tenantId: string, session: SessionContext) =>
    apiRequest<PaymentProvider[]>("/v1/payment/providers", "GET", session),

  listRoutingPolicies: async (tenantId: string, session: SessionContext) =>
    apiRequest<RoutingPolicy[]>("/v1/payment/routing-policies", "GET", session),

  listDevices: async (tenantId: string, session: SessionContext) =>
    apiRequest<PosDevice[]>("/v1/payment/devices", "GET", session),

  listDevicePools: async (tenantId: string, session: SessionContext) =>
    apiRequest<DevicePool[]>("/v1/payment/device-pools", "GET", session),

  listSettlements: async (tenantId: string, session: SessionContext) =>
    apiRequest<SettlementRecord[]>("/v1/payment/settlements", "GET", session),

  listRefunds: async (tenantId: string, session: SessionContext) =>
    apiRequest<PaymentRefund[]>("/v1/payment/refunds", "GET", session),

  listDisputes: async (tenantId: string, session: SessionContext) =>
    apiRequest<PaymentDispute[]>("/v1/payment/disputes", "GET", session),

  listChargebacks: async (tenantId: string, session: SessionContext) =>
    apiRequest<PaymentChargeback[]>("/v1/payment/chargebacks", "GET", session),

  listEvidencePacks: async (tenantId: string, session: SessionContext) =>
    apiRequest<EvidencePack[]>("/v1/payment/evidence-packs", "GET", session),

  listAuditEvents: async (tenantId: string, session: SessionContext) =>
    apiRequest<PaymentAuditEvent[]>("/v1/payment/audit-events", "GET", session),

  async getDashboard(
    tenantId: string,
    session: SessionContext,
  ): Promise<PaymentDashboardMetrics> {
    return apiRequest<PaymentDashboardMetrics>(
      "/payment/dashboard",
      "GET",
      session,
    );
  },

  async createExecutionRequest(
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
  ): Promise<PaymentTransaction> {
    return apiRequest<PaymentTransaction>(
      "/payment/transactions",
      "POST",
      session,
      payload,
    );
  },

  async approveRequest(
    tenantId: string,
    session: SessionContext,
    paymentId: string,
  ) {
    return apiRequest<PaymentTransaction>(
      `/payment/transactions/${paymentId}/approve`,
      "PUT",
      session,
    );
  },

  async rejectRequest(
    tenantId: string,
    session: SessionContext,
    paymentId: string,
    reason?: string,
  ) {
    // Backend controller doesn't accept reason in body for reject?
    // Controller: @Put('transactions/:id/reject') async rejectTransaction(...)
    // It doesn't seem to take a body. The mock implementation didn't utilize reason except for audit detail.
    // I'll check if I need to send reason. Controller doesn't have @Body() for reject.
    // I'll ignore reason for now or pass it if I update controller.
    // For now, match controller signature.
    return apiRequest<PaymentTransaction>(
      `/payment/transactions/${paymentId}/reject`,
      "PUT",
      session,
    );
  },

  async selectProvider(
    tenantId: string,
    session: SessionContext,
    paymentId: string,
    forcedProviderId?: PaymentProviderId,
  ) {
    return apiRequest<PaymentTransaction>(
      `/payment/transactions/${paymentId}/route`,
      "PUT",
      session,
      { providerId: forcedProviderId },
    );
  },

  async executePayment(
    tenantId: string,
    session: SessionContext,
    paymentId: string,
    options?: { forceFail?: boolean },
  ) {
    return apiRequest<PaymentTransaction>(
      `/payment/transactions/${paymentId}/execute`,
      "PUT",
      session,
      options,
    );
  },

  async confirmSettlement(
    tenantId: string,
    session: SessionContext,
    paymentId: string,
  ) {
    return apiRequest<PaymentTransaction>(
      `/payment/transactions/${paymentId}/settle`,
      "PUT",
      session,
    );
  },

  async createRefund(
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
    return apiRequest<PaymentRefund>(
      "/payment/refunds",
      "POST",
      session,
      payload,
    );
  },

  async approveRefund(
    tenantId: string,
    session: SessionContext,
    refundId: string,
  ) {
    return apiRequest<PaymentRefund>(
      `/payment/refunds/${refundId}/approve`,
      "PUT",
      session,
    );
  },

  async executeRefund(
    tenantId: string,
    session: SessionContext,
    refundId: string,
  ) {
    return apiRequest<PaymentRefund>(
      `/payment/refunds/${refundId}/execute`,
      "PUT",
      session,
    );
  },

  async openDispute(
    tenantId: string,
    session: SessionContext,
    payload: { paymentId: string; amount: number; reason: string },
  ) {
    return apiRequest<PaymentDispute>(
      "/payment/disputes",
      "POST",
      session,
      payload,
    );
  },

  async attachDisputeEvidence(
    tenantId: string,
    session: SessionContext,
    disputeId: string,
    evidenceItem: string,
  ) {
    return apiRequest<PaymentDispute>(
      `/payment/disputes/${disputeId}/evidence`,
      "PUT",
      session,
      { evidence: evidenceItem },
    );
  },

  async progressDispute(
    tenantId: string,
    session: SessionContext,
    disputeId: string,
    status: PaymentDispute["status"],
  ) {
    return apiRequest<PaymentDispute>(
      `/payment/disputes/${disputeId}/progress`,
      "PUT",
      session,
      { status },
    );
  },

  async resolveDispute(
    tenantId: string,
    session: SessionContext,
    disputeId: string,
    resolution: NonNullable<PaymentDispute["resolution"]>,
  ) {
    return apiRequest<PaymentDispute>(
      `/payment/disputes/${disputeId}/resolve`,
      "PUT",
      session,
      { resolution },
    );
  },

  async runProviderHealthCheck(tenantId: string, session: SessionContext) {
    return apiRequest<PaymentProvider[]>(
      "/payment/providers/health-sweep",
      "POST",
      session,
    );
  },

  async setProviderStatus(
    tenantId: string,
    session: SessionContext,
    providerId: PaymentProviderId,
    status: PaymentProvider["status"],
  ) {
    return apiRequest<PaymentProvider>(
      `/payment/providers/${providerId}/status`,
      "PUT",
      session,
      { status },
    );
  },

  async setDeviceStatus(
    tenantId: string,
    session: SessionContext,
    deviceId: string,
    status: PosDevice["status"],
  ) {
    return apiRequest<PosDevice>(
      `/payment/devices/${deviceId}/status`,
      "PUT",
      session,
      { status },
    );
  },

  async resolveDeviceForLocation(
    tenantId: string,
    location: string,
  ): Promise<PosDevice | null> {
    const pools = await this.listDevicePools(tenantId);
    const devices = await this.listDevices(tenantId);

    const pool = pools.find((item) => item.location === location);
    if (!pool) return null;

    const inOrder = [pool.primaryDeviceId, ...pool.fallbackDeviceIds];

    for (const deviceId of inOrder) {
      const device = devices.find((item) => item.id === deviceId);
      if (device && device.approved && device.status === "ONLINE")
        return device;
    }

    return null;
  },

  async createFinancePaymentRequest(
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

  async processFinanceApproval(
    tenantId: string,
    session: SessionContext,
    paymentId: string,
    approved: boolean,
  ) {
    if (!approved)
      return this.rejectRequest(
        tenantId,
        session,
        paymentId,
        "Rejected from Finance.",
      );

    const approvedPayment = await this.approveRequest(
      tenantId,
      session,
      paymentId,
    );

    // Auto-route after approval (matches original logic)
    await this.selectProvider(tenantId, session, approvedPayment.id);

    return approvedPayment;
  },
};

