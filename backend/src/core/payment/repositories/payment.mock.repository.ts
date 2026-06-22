import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { AttachDisputeEvidenceDto } from "../dto/attach-dispute-evidence.dto";
import { CreateDisputeDto } from "../dto/create-dispute.dto";
import { CreatePaymentTransactionDto } from "../dto/create-payment-transaction.dto";
import { CreateRefundDto } from "../dto/create-refund.dto";
import { ExecutePaymentDto } from "../dto/execute-payment.dto";
import { ProgressDisputeDto } from "../dto/progress-dispute.dto";
import { ResolveDisputeDto } from "../dto/resolve-dispute.dto";
import { RoutePaymentDto } from "../dto/route-payment.dto";
import { UpdateDeviceStatusDto } from "../dto/update-device-status.dto";
import { UpdateProviderStatusDto } from "../dto/update-provider-status.dto";
import {
  PaymentDevice,
  PaymentDevicePool,
} from "../entities/payment-device.entity";
import {
  PaymentChargeback,
  PaymentDispute,
} from "../entities/payment-dispute.entity";
import { PaymentProvider } from "../entities/payment-provider.entity";
import { PaymentRefund } from "../entities/payment-refund.entity";
import {
  PaymentAuditEvent,
  PaymentEvidencePack,
  PaymentSettlement,
} from "../entities/payment-settlement.entity";
import { PaymentRoutingPolicy } from "../entities/payment-routing-policy.entity";
import {
  PaymentRetryAttempt,
  PaymentTransaction,
} from "../entities/payment-transaction.entity";
import {
  IPaymentRepository,
  PaymentDashboard,
} from "./payment.repository.interface";
import { TenantContext } from "../../../gateway/tenant-context.interface";
import { ScopeLike } from "../../../shared/utils/multi-tenancy.util";

type TenantPaymentStore = {
  transactions: PaymentTransaction[];
  providers: PaymentProvider[];
  routing: PaymentRoutingPolicy[];
  devices: PaymentDevice[];
  pools: PaymentDevicePool[];
  refunds: PaymentRefund[];
  disputes: PaymentDispute[];
  chargebacks: PaymentChargeback[];
  settlements: PaymentSettlement[];
  evidence: PaymentEvidencePack[];
  audit: PaymentAuditEvent[];
  settings: any;
  gatewayAccounts: Map<string, any>;
};

@Injectable()
export class PaymentMockRepository extends IPaymentRepository {
  private readonly store = new Map<string, TenantPaymentStore>();

  constructor() {
    super();
    this.ensureTenant("tenant-001");
    this.ensureTenant("tenant-002");
  }

  private now() {
    return new Date();
  }

  private id(prefix: string) {
    return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
  }

  private checksum(input: string) {
    let hash = 0;
    for (let i = 0; i < input.length; i += 1) {
      hash = (hash << 5) - hash + input.charCodeAt(i);
      hash |= 0;
    }
    return `chk-${Math.abs(hash).toString(16)}`;
  }

  private addAudit(
    tenant_id: string,
    actor_id: string,
    action: string,
    entity_type: PaymentAuditEvent["entity_type"],
    entity_id: string,
    detail: string,
  ) {
    const store = this.getStore(tenant_id);
    store.audit.unshift({
      id: this.id("payment-audit"),
      tenant_id,
      actor_id,
      action,
      entity_type,
      entity_id,
      detail,
      created_at: this.now(),
    });
  }

  private ensureTenant(tenant_id: string): TenantPaymentStore {
    const existing = this.store.get(tenant_id);
    if (existing) return existing;

    const providers: PaymentProvider[] = [
      {
        id: "BANK_BCA",
        tenant_id,
        name: "Bank BCA",
        channels: ["bank_transfer", "qr"],
        status: "healthy",
        max_amount_per_txn: 1000000000,
        settlement_sla_hours: 6,
        priority: 1,
        lastHeartbeatAt: this.now(),
      },
      {
        id: "BANK_MANDIRI",
        tenant_id,
        name: "Bank Mandiri",
        channels: ["bank_transfer", "qr"],
        status: "healthy",
        max_amount_per_txn: 1000000000,
        settlement_sla_hours: 8,
        priority: 2,
        lastHeartbeatAt: this.now(),
      },
      {
        id: "STRIPE",
        tenant_id,
        name: "Stripe",
        channels: ["card_online", "card_pos", "wallet"],
        status: "healthy",
        max_amount_per_txn: 750000000,
        settlement_sla_hours: 24,
        priority: 3,
        lastHeartbeatAt: this.now(),
      },
      {
        id: "ADYEN",
        tenant_id,
        name: "Adyen",
        channels: ["card_online", "card_pos", "wallet"],
        status: "healthy",
        max_amount_per_txn: 750000000,
        settlement_sla_hours: 24,
        priority: 4,
        lastHeartbeatAt: this.now(),
      },
    ];

    const routing: PaymentRoutingPolicy[] = [
      {
        id: `${tenant_id}-routing-default`,
        tenant_id,
        name: "Default enterprise routing",
        enabled: true,
        priorities: ["BANK_BCA", "BANK_MANDIRI", "STRIPE"],
        fallbackProviders: ["BANK_MANDIRI", "STRIPE", "ADYEN"],
        maxRetries: 3,
        exponentialBackoffSeconds: 2,
        created_at: this.now(),
        updated_at: this.now(),
      },
    ];

    const devices: PaymentDevice[] = [
      {
        id: `${tenant_id}-pos-01`,
        tenant_id,
        location: "Jakarta HQ",
        deviceCode: "POS-01",
        approved: true,
        status: "online",
        providerId: "ADYEN",
        lastUsedAt: this.now(),
      },
      {
        id: `${tenant_id}-pos-02`,
        tenant_id,
        location: "Jakarta HQ",
        deviceCode: "POS-02",
        approved: true,
        status: "online",
        providerId: "STRIPE",
      },
    ];

    const pools: PaymentDevicePool[] = [
      {
        id: `${tenant_id}-pool-jakarta`,
        tenant_id,
        location: "Jakarta HQ",
        primaryDeviceId: `${tenant_id}-pos-01`,
        fallbackDeviceIds: [`${tenant_id}-pos-02`],
        created_at: this.now(),
        updated_at: this.now(),
      },
    ];

    const transactions: PaymentTransaction[] = [
      {
        id: `${tenant_id}-pay-001`,
        tenant_id,
        type: "vendor_payout",
        amount: 20000000,
        currency: "IDR",
        destination: "PT Fresh Supply Co",
        source: "Finance",
        channel: "bank_transfer",
        providerId: "BANK_BCA",
        idempotency_key: `${tenant_id}-idem-001`,
        status: "settled",
        retryAttempts: [
          {
            attempt: 1,
            attemptedAt: this.now(),
            providerId: "BANK_BCA",
            result: "success",
          },
        ],
        settlementId: `${tenant_id}-settlement-001`,
        ledgerSyncTriggeredAt: this.now(),
        evidencePackId: `${tenant_id}-evidence-001`,
        createdBy: "system",
        approvedBy: "finance-manager",
        approvedAt: this.now(),
        created_at: this.now(),
        updated_at: this.now(),
      },
    ];

    const settlements: PaymentSettlement[] = [
      {
        id: `${tenant_id}-settlement-001`,
        tenant_id,
        paymentId: `${tenant_id}-pay-001`,
        providerReference: "BCA-SETTLE-77881",
        status: "confirmed",
        confirmedAt: this.now(),
        created_at: this.now(),
        updated_at: this.now(),
      },
    ];

    const evidence: PaymentEvidencePack[] = [
      {
        id: `${tenant_id}-evidence-001`,
        tenant_id,
        paymentId: `${tenant_id}-pay-001`,
        providerProof: "BCA-TRANSFER-SLIP-77881",
        approvalSignatures: ["finance-manager"],
        checksum: "chk-seed",
        payload: '{"seed":"true"}',
        created_at: this.now(),
      },
    ];

    const seeded: TenantPaymentStore = {
      transactions,
      providers,
      routing,
      devices,
      pools,
      refunds: [],
      disputes: [],
      chargebacks: [],
      settlements,
      evidence,
      audit: [],
      settings: {
        id: this.id("settings"),
        tenant_id,
        fee_absorption_mode: "MERCHANT",
        is_gateway_active: true,
      },
      gatewayAccounts: new Map(),
    };
    this.store.set(tenant_id, seeded);
    return seeded;
  }

  private getStore(tenant_id: string) {
    return this.ensureTenant(tenant_id);
  }

  private findTransaction(tenant_id: string, paymentId: string) {
    const transaction = this.getStore(tenant_id).transactions.find(
      (item) => item.id === paymentId,
    );
    if (!transaction)
      throw new NotFoundException("Payment transaction not found");
    return transaction;
  }

  private findRefund(tenant_id: string, refundId: string) {
    const refund = this.getStore(tenant_id).refunds.find(
      (item) => item.id === refundId,
    );
    if (!refund) throw new NotFoundException("Refund not found");
    return refund;
  }

  private findDispute(tenant_id: string, disputeId: string) {
    const dispute = this.getStore(tenant_id).disputes.find(
      (item) => item.id === disputeId,
    );
    if (!dispute) throw new NotFoundException("Dispute not found");
    return dispute;
  }

  private activeRouting(tenant_id: string) {
    return this.getStore(tenant_id).routing.find((item) => item.enabled);
  }

  async getDashboard(ctx: ScopeLike): Promise<PaymentDashboard> {
    const store = this.getStore(ctx.tenant_id);
    const now = this.now();
    const settledToday = store.transactions.filter((item) => {
      if (item.status !== "settled") return false;
      return (
        item.updated_at.getFullYear() === now.getFullYear() &&
        item.updated_at.getMonth() === now.getMonth() &&
        item.updated_at.getDate() === now.getDate()
      );
    }).length;
    return {
      pendingApprovals: store.transactions.filter(
        (item) => item.status === "approval_pending",
      ).length,
      executingPayments: store.transactions.filter(
        (item) => item.status === "executing",
      ).length,
      settlementPending: store.transactions.filter(
        (item) => item.status === "settlement_pending",
      ).length,
      settledToday,
      failedTransactions: store.transactions.filter(
        (item) => item.status === "failed",
      ).length,
      openDisputes: store.disputes.filter(
        (item) => !["resolved", "rejected"].includes(item.status),
      ).length,
      openChargebacks: store.chargebacks.filter(
        (item) => !["won", "lost"].includes(item.status),
      ).length,
      refundPending: store.refunds.filter(
        (item) => !["settled", "rejected", "failed"].includes(item.status),
      ).length,
    };
  }

  async getTransactions(ctx: ScopeLike): Promise<PaymentTransaction[]> {
    return this.getStore(ctx.tenant_id).transactions;
  }

  async createTransaction(
    ctx: TenantContext,
    dto: CreatePaymentTransactionDto,
    actor_id: string,
  ): Promise<PaymentTransaction> {
    const store = this.getStore(ctx.tenant_id);
    const key =
      dto.idempotency_key ??
      this.checksum(
        `${ctx.tenant_id}|${dto.type}|${dto.amount}|${dto.destination}|${dto.externalReference ?? ""}`,
      );
    const existing = store.transactions.find(
      (item) => item.idempotency_key === key,
    );
    if (existing) return existing;

    const created: PaymentTransaction = {
      id: this.id("payment"),
      tenant_id: ctx.tenant_id,
      company_id: ctx.company_id,
      branch_id: ctx.branch_id,
      ecommerce_id: ctx.ecommerce_id,
      externalReference: dto.externalReference,
      type: dto.type,
      amount: dto.amount,
      currency: dto.currency ?? "IDR",
      destination: dto.destination,
      source: dto.source,
      channel: dto.channel ?? "bank_transfer",
      method: dto.method ?? "GATEWAY",
      provider: dto.provider ?? "STRIPE",
      paymentStatus: "PENDING",
      externalRef: dto.externalRef,
      idempotency_key: key,
      status: "approval_pending",
      retryAttempts: [],
      createdBy: actor_id,
      created_at: this.now(),
      updated_at: this.now(),
    };
    store.transactions.unshift(created);
    this.addAudit(
      ctx.tenant_id,
      actor_id,
      "request.created",
      "transaction",
      created.id,
      created.type,
    );
    return created;
  }

  async approveTransaction(
    ctx: TenantContext,
    paymentId: string,
    actor_id: string,
  ): Promise<PaymentTransaction> {
    const payment = this.findTransaction(ctx.tenant_id, paymentId);
    payment.status = "approved";
    payment.approvedBy = actor_id;
    payment.approvedAt = this.now();
    payment.updated_at = this.now();
    this.addAudit(
      ctx.tenant_id,
      actor_id,
      "request.approved",
      "transaction",
      payment.id,
      "approved",
    );
    return payment;
  }

  async rejectTransaction(
    ctx: TenantContext,
    paymentId: string,
    actor_id: string,
  ): Promise<PaymentTransaction> {
    const payment = this.findTransaction(ctx.tenant_id, paymentId);
    payment.status = "rejected";
    payment.approvedBy = actor_id;
    payment.approvedAt = this.now();
    payment.updated_at = this.now();
    this.addAudit(
      ctx.tenant_id,
      actor_id,
      "request.rejected",
      "transaction",
      payment.id,
      "rejected",
    );
    return payment;
  }

  async routeTransaction(
    ctx: TenantContext,
    paymentId: string,
    dto: RoutePaymentDto,
    actor_id: string,
  ): Promise<PaymentTransaction> {
    const payment = this.findTransaction(ctx.tenant_id, paymentId);
    if (!["approved", "provider_selected"].includes(payment.status)) {
      throw new BadRequestException(
        "Payment requires approval before routing.",
      );
    }
    const store = this.getStore(ctx.tenant_id);
    const policy = this.activeRouting(ctx.tenant_id);
    if (!policy) throw new BadRequestException("No active routing policy");

    const pickOrdered = [...policy.priorities, ...policy.fallbackProviders];
    const selectedId =
      dto.providerId ??
      pickOrdered.find((providerId) =>
        store.providers.some(
          (provider) =>
            provider.id === providerId &&
            provider.status !== "down" &&
            provider.max_amount_per_txn >= payment.amount,
        ),
      );
    if (!selectedId)
      throw new BadRequestException("No valid provider available");

    payment.providerId = selectedId;
    payment.status = "provider_selected";
    payment.updated_at = this.now();
    this.addAudit(
      ctx.tenant_id,
      actor_id,
      "provider.selected",
      "routing",
      payment.id,
      selectedId,
    );
    return payment;
  }

  async executeTransaction(
    ctx: TenantContext,
    paymentId: string,
    dto: ExecutePaymentDto,
    actor_id: string,
  ): Promise<PaymentTransaction> {
    const payment = this.findTransaction(ctx.tenant_id, paymentId);
    if (!["approved", "provider_selected"].includes(payment.status)) {
      throw new BadRequestException(
        "Payment requires approval and routing before execution.",
      );
    }
    const policy = this.activeRouting(ctx.tenant_id);
    if (!policy) throw new BadRequestException("No active routing policy");
    if (!payment.providerId)
      throw new BadRequestException("Provider is not selected");

    payment.status = "executing";
    payment.updated_at = this.now();
    const attempts: PaymentRetryAttempt[] = [...payment.retryAttempts];

    let success = false;
    for (let attempt = 1; attempt <= policy.maxRetries; attempt += 1) {
      const result = dto.forceFail
        ? "failed"
        : attempt === 1
          ? "success"
          : "failed";
      attempts.push({
        attempt,
        attemptedAt: this.now(),
        providerId: payment.providerId,
        result,
        reason: result === "failed" ? "Provider/network failure" : undefined,
      });
      if (result === "success") {
        success = true;
        break;
      }
    }
    payment.retryAttempts = attempts;

    if (!success) {
      payment.status = "failed";
      payment.updated_at = this.now();
      this.addAudit(
        ctx.tenant_id,
        actor_id,
        "execution.failed",
        "transaction",
        payment.id,
        "retries exhausted",
      );
      return payment;
    }

    const settlement: PaymentSettlement = {
      id: this.id("settlement"),
      tenant_id: ctx.tenant_id,
      paymentId: payment.id,
      providerReference: `${payment.providerId}-${Date.now()}`,
      status: "pending",
      created_at: this.now(),
      updated_at: this.now(),
    };
    this.getStore(ctx.tenant_id).settlements.unshift(settlement);
    payment.status = "settlement_pending";
    payment.settlementId = settlement.id;
    payment.updated_at = this.now();
    this.addAudit(
      ctx.tenant_id,
      actor_id,
      "execution.sent",
      "transaction",
      payment.id,
      settlement.providerReference,
    );
    return payment;
  }

  async settleTransaction(
    ctx: TenantContext,
    paymentId: string,
    actor_id: string,
  ): Promise<PaymentTransaction> {
    const payment = this.findTransaction(ctx.tenant_id, paymentId);
    if (payment.status !== "settlement_pending") {
      throw new BadRequestException("Payment must be settlement-pending.");
    }
    if (!payment.settlementId)
      throw new BadRequestException("Settlement missing.");
    const settlement = this.getStore(ctx.tenant_id).settlements.find(
      (item) => item.id === payment.settlementId,
    );
    if (!settlement) throw new NotFoundException("Settlement not found");

    settlement.status = "confirmed";
    settlement.confirmedAt = this.now();
    settlement.updated_at = this.now();

    const payload = JSON.stringify({
      paymentId: payment.id,
      providerReference: settlement.providerReference,
      amount: payment.amount,
      destination: payment.destination,
      approvedBy: payment.approvedBy,
      approvedAt: payment.approvedAt,
    });

    const evidence: PaymentEvidencePack = {
      id: this.id("evidence"),
      tenant_id: ctx.tenant_id,
      paymentId: payment.id,
      providerProof: settlement.providerReference,
      approvalSignatures: [payment.createdBy, payment.approvedBy ?? actor_id],
      checksum: this.checksum(payload),
      payload,
      created_at: this.now(),
    };
    this.getStore(ctx.tenant_id).evidence.unshift(evidence);

    payment.status = "settled";
    payment.evidencePackId = evidence.id;
    payment.ledgerSyncTriggeredAt = this.now();
    payment.updated_at = this.now();

    this.addAudit(
      ctx.tenant_id,
      actor_id,
      "settlement.confirmed",
      "settlement",
      settlement.id,
      "ledger sync triggered",
    );
    return payment;
  }

  async getProviders(ctx: ScopeLike): Promise<PaymentProvider[]> {
    return this.getStore(ctx.tenant_id).providers;
  }

  async updateProviderStatus(
    ctx: TenantContext,
    providerId: string,
    dto: UpdateProviderStatusDto,
    actor_id: string,
  ): Promise<PaymentProvider> {
    const provider = this.getStore(ctx.tenant_id).providers.find(
      (item) => item.id === providerId,
    );
    if (!provider) throw new NotFoundException("Provider not found");
    provider.status = dto.status;
    provider.lastHeartbeatAt = this.now();
    this.addAudit(
      ctx.tenant_id,
      actor_id,
      "provider.status_changed",
      "routing",
      provider.id,
      dto.status,
    );
    return provider;
  }

  async runProviderHealthSweep(
    ctx: TenantContext,
    actor_id: string,
  ): Promise<PaymentProvider[]> {
    const providers = this.getStore(ctx.tenant_id).providers;
    providers.forEach((provider) => {
      provider.lastHeartbeatAt = this.now();
      if (provider.status === "down") provider.status = "degraded";
    });
    this.addAudit(
      ctx.tenant_id,
      actor_id,
      "provider.health_sweep",
      "routing",
      "health-sweep",
      "health sweep completed",
    );
    return providers;
  }

  async getRoutingPolicies(ctx: ScopeLike): Promise<PaymentRoutingPolicy[]> {
    return this.getStore(ctx.tenant_id).routing;
  }

  async getDevices(ctx: ScopeLike): Promise<PaymentDevice[]> {
    return this.getStore(ctx.tenant_id).devices;
  }

  async getDevicePools(ctx: ScopeLike): Promise<PaymentDevicePool[]> {
    return this.getStore(ctx.tenant_id).pools;
  }

  async updateDeviceStatus(
    ctx: TenantContext,
    device_id: string,
    dto: UpdateDeviceStatusDto,
    actor_id: string,
  ): Promise<PaymentDevice> {
    const device = this.getStore(ctx.tenant_id).devices.find(
      (item) => item.id === device_id,
    );
    if (!device) throw new NotFoundException("Device not found");
    device.status = dto.status;
    this.addAudit(
      ctx.tenant_id,
      actor_id,
      "device.status_changed",
      "device",
      device.id,
      dto.status,
    );
    return device;
  }

  async getRefunds(ctx: ScopeLike): Promise<PaymentRefund[]> {
    return this.getStore(ctx.tenant_id).refunds;
  }

  async createRefund(
    ctx: TenantContext,
    dto: CreateRefundDto,
    actor_id: string,
  ): Promise<PaymentRefund> {
    const payment = this.findTransaction(ctx.tenant_id, dto.paymentId);
    if (payment.status !== "settled") {
      throw new BadRequestException(
        "Refund is allowed only for settled payments.",
      );
    }
    const created: PaymentRefund = {
      id: this.id("refund"),
      tenant_id: ctx.tenant_id,
      paymentId: dto.paymentId,
      type: dto.type,
      amount: dto.amount,
      reason: dto.reason,
      status: "requested",
      requested_by: actor_id,
      scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : undefined,
      created_at: this.now(),
      updated_at: this.now(),
    };
    this.getStore(ctx.tenant_id).refunds.unshift(created);
    this.addAudit(
      ctx.tenant_id,
      actor_id,
      "refund.requested",
      "refund",
      created.id,
      created.type,
    );
    return created;
  }

  async approveRefund(
    ctx: TenantContext,
    refundId: string,
    actor_id: string,
  ): Promise<PaymentRefund> {
    const refund = this.findRefund(ctx.tenant_id, refundId);
    refund.status = "approved";
    refund.approvedBy = actor_id;
    refund.updated_at = this.now();
    this.addAudit(
      ctx.tenant_id,
      actor_id,
      "refund.approved",
      "refund",
      refund.id,
      "approved",
    );
    return refund;
  }

  async executeRefund(
    ctx: TenantContext,
    refundId: string,
    actor_id: string,
  ): Promise<PaymentRefund> {
    const refund = this.findRefund(ctx.tenant_id, refundId);
    if (refund.status !== "approved")
      throw new BadRequestException("Refund must be approved first.");
    refund.status = "settled";
    refund.providerReference = `RFD-${Date.now()}`;
    refund.updated_at = this.now();
    this.addAudit(
      ctx.tenant_id,
      actor_id,
      "refund.settled",
      "refund",
      refund.id,
      refund.providerReference,
    );
    return refund;
  }

  async getDisputes(ctx: ScopeLike): Promise<PaymentDispute[]> {
    return this.getStore(ctx.tenant_id).disputes;
  }

  async createDispute(
    ctx: TenantContext,
    dto: CreateDisputeDto,
    actor_id: string,
  ): Promise<PaymentDispute> {
    const created: PaymentDispute = {
      id: this.id("dispute"),
      tenant_id: ctx.tenant_id,
      paymentId: dto.paymentId,
      amount: dto.amount,
      reason: dto.reason,
      status: "opened",
      openedBy: actor_id,
      evidence: [],
      created_at: this.now(),
      updated_at: this.now(),
    };
    this.getStore(ctx.tenant_id).disputes.unshift(created);
    this.addAudit(
      ctx.tenant_id,
      actor_id,
      "dispute.opened",
      "dispute",
      created.id,
      created.reason,
    );
    return created;
  }

  async attachDisputeEvidence(
    ctx: TenantContext,
    disputeId: string,
    dto: AttachDisputeEvidenceDto,
    actor_id: string,
  ): Promise<PaymentDispute> {
    const dispute = this.findDispute(ctx.tenant_id, disputeId);
    dispute.evidence.push(dto.evidence);
    dispute.status = "evidence_attached";
    dispute.updated_at = this.now();
    this.addAudit(
      ctx.tenant_id,
      actor_id,
      "dispute.evidence_attached",
      "dispute",
      dispute.id,
      dto.evidence,
    );
    return dispute;
  }

  async progressDispute(
    ctx: TenantContext,
    disputeId: string,
    dto: ProgressDisputeDto,
    actor_id: string,
  ): Promise<PaymentDispute> {
    const dispute = this.findDispute(ctx.tenant_id, disputeId);
    dispute.status = dto.status;
    if (dto.status === "provider_submitted") {
      dispute.providerCaseId = `CASE-${Date.now()}`;
    }
    dispute.updated_at = this.now();
    this.addAudit(
      ctx.tenant_id,
      actor_id,
      "dispute.status_changed",
      "dispute",
      dispute.id,
      dto.status,
    );
    return dispute;
  }

  async resolveDispute(
    ctx: TenantContext,
    disputeId: string,
    dto: ResolveDisputeDto,
    actor_id: string,
  ): Promise<PaymentDispute> {
    const dispute = this.findDispute(ctx.tenant_id, disputeId);
    dispute.status = "resolved";
    dispute.resolution = dto.resolution;
    dispute.updated_at = this.now();

    const chargeback: PaymentChargeback = {
      id: this.id("chargeback"),
      tenant_id: ctx.tenant_id,
      paymentId: dispute.paymentId,
      disputeId: dispute.id,
      amount: dispute.amount,
      status: dto.resolution.toLowerCase() as any,
      created_at: this.now(),
      updated_at: this.now(),
    };
    this.getStore(ctx.tenant_id).chargebacks.unshift(chargeback);

    this.addAudit(
      ctx.tenant_id,
      actor_id,
      "dispute.resolved",
      "chargeback",
      chargeback.id,
      dto.resolution,
    );
    return dispute;
  }

  async getChargebacks(ctx: ScopeLike): Promise<PaymentChargeback[]> {
    return this.getStore(ctx.tenant_id).chargebacks;
  }

  async getSettlements(ctx: ScopeLike): Promise<PaymentSettlement[]> {
    return this.getStore(ctx.tenant_id).settlements;
  }

  async getEvidencePacks(ctx: ScopeLike): Promise<PaymentEvidencePack[]> {
    return this.getStore(ctx.tenant_id).evidence;
  }

  async getAuditEvents(ctx: ScopeLike): Promise<PaymentAuditEvent[]> {
    return this.getStore(ctx.tenant_id).audit;
  }

  async getPaymentSettings(ctx: ScopeLike): Promise<any> {
    return this.getStore(ctx.tenant_id).settings;
  }

  async updatePaymentSettings(ctx: TenantContext, data: any): Promise<any> {
    const store = this.getStore(ctx.tenant_id);
    store.settings = { ...store.settings, ...data };
    return store.settings;
  }

  async getGatewayAccount(ctx: TenantContext, provider: string): Promise<any> {
    return this.getStore(ctx.tenant_id).gatewayAccounts.get(provider);
  }

  async upsertGatewayAccount(ctx: TenantContext, data: any): Promise<any> {
    this.getStore(ctx.tenant_id).gatewayAccounts.set(data.provider, data);
    return data;
  }

  async updateTransactionStatus(
    ctx: TenantContext,
    id: string,
    data: any,
    actor_id: string,
  ): Promise<PaymentTransaction> {
    const tx = this.findTransaction(ctx.tenant_id, id);
    Object.assign(tx, data);
    if (data.status) tx.paymentStatus = data.status;
    tx.updated_at = this.now();
    this.addAudit(ctx.tenant_id, actor_id, "status.updated", "transaction", id, JSON.stringify(data));
    return tx;
  }

  async checkAndInsertWebhookEvent(event_id: string, provider: string, payload: any): Promise<boolean> {
    // Basic mock: always true
    return true;
  }

  async createPlatformFeeLedger(ctx: TenantContext, transaction_id: string, amount: number, provider: string): Promise<void> {
    // Mock: do nothing
  }

  async findPendingTransactions(): Promise<PaymentTransaction[]> {
    const all = Array.from(this.store.values()).flatMap(s => s.transactions);
    return all.filter(tx => tx.paymentStatus === "PENDING" && tx.method === "GATEWAY");
  }

  async findTransactionByExternalRef(external_ref: string): Promise<PaymentTransaction | undefined> {
    const all = Array.from(this.store.values()).flatMap(s => s.transactions);
    return all.find(tx => tx.externalRef === external_ref || tx.id === external_ref);
  }
}
