import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AttachDisputeEvidenceDto } from '../dto/attach-dispute-evidence.dto';
import { CreateDisputeDto } from '../dto/create-dispute.dto';
import { CreatePaymentTransactionDto } from '../dto/create-payment-transaction.dto';
import { CreateRefundDto } from '../dto/create-refund.dto';
import { ExecutePaymentDto } from '../dto/execute-payment.dto';
import { ProgressDisputeDto } from '../dto/progress-dispute.dto';
import { ResolveDisputeDto } from '../dto/resolve-dispute.dto';
import { RoutePaymentDto } from '../dto/route-payment.dto';
import { UpdateDeviceStatusDto } from '../dto/update-device-status.dto';
import { UpdateProviderStatusDto } from '../dto/update-provider-status.dto';
import { PaymentDevice, PaymentDevicePool } from '../entities/payment-device.entity';
import { PaymentChargeback, PaymentDispute } from '../entities/payment-dispute.entity';
import { PaymentProvider } from '../entities/payment-provider.entity';
import { PaymentRefund } from '../entities/payment-refund.entity';
import {
  PaymentAuditEvent,
  PaymentEvidencePack,
  PaymentSettlement,
} from '../entities/payment-settlement.entity';
import { PaymentRoutingPolicy } from '../entities/payment-routing-policy.entity';
import { PaymentRetryAttempt, PaymentTransaction } from '../entities/payment-transaction.entity';
import { IPaymentRepository, PaymentDashboard } from './payment.repository.interface';

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
};

@Injectable()
export class PaymentMockRepository extends IPaymentRepository {
  private readonly store = new Map<string, TenantPaymentStore>();

  constructor() {
    super();
    this.ensureTenant('tenant-001');
    this.ensureTenant('tenant-002');
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
    tenantId: string,
    actorId: string,
    action: string,
    entityType: PaymentAuditEvent['entityType'],
    entityId: string,
    detail: string,
  ) {
    const store = this.getStore(tenantId);
    store.audit.unshift({
      id: this.id('payment-audit'),
      tenantId,
      actorId,
      action,
      entityType,
      entityId,
      detail,
      createdAt: this.now(),
    });
  }

  private ensureTenant(tenantId: string): TenantPaymentStore {
    const existing = this.store.get(tenantId);
    if (existing) return existing;

    const providers: PaymentProvider[] = [
      {
        id: 'BANK_BCA',
        tenantId,
        name: 'Bank BCA',
        channels: ['bank_transfer', 'qr'],
        status: 'healthy',
        maxAmountPerTxn: 1000000000,
        settlementSlaHours: 6,
        priority: 1,
        lastHeartbeatAt: this.now(),
      },
      {
        id: 'BANK_MANDIRI',
        tenantId,
        name: 'Bank Mandiri',
        channels: ['bank_transfer', 'qr'],
        status: 'healthy',
        maxAmountPerTxn: 1000000000,
        settlementSlaHours: 8,
        priority: 2,
        lastHeartbeatAt: this.now(),
      },
      {
        id: 'STRIPE',
        tenantId,
        name: 'Stripe',
        channels: ['card_online', 'card_pos', 'wallet'],
        status: 'healthy',
        maxAmountPerTxn: 750000000,
        settlementSlaHours: 24,
        priority: 3,
        lastHeartbeatAt: this.now(),
      },
      {
        id: 'ADYEN',
        tenantId,
        name: 'Adyen',
        channels: ['card_online', 'card_pos', 'wallet'],
        status: 'healthy',
        maxAmountPerTxn: 750000000,
        settlementSlaHours: 24,
        priority: 4,
        lastHeartbeatAt: this.now(),
      },
    ];

    const routing: PaymentRoutingPolicy[] = [
      {
        id: `${tenantId}-routing-default`,
        tenantId,
        name: 'Default enterprise routing',
        enabled: true,
        priorities: ['BANK_BCA', 'BANK_MANDIRI', 'STRIPE'],
        fallbackProviders: ['BANK_MANDIRI', 'STRIPE', 'ADYEN'],
        maxRetries: 3,
        exponentialBackoffSeconds: 2,
        createdAt: this.now(),
        updatedAt: this.now(),
      },
    ];

    const devices: PaymentDevice[] = [
      {
        id: `${tenantId}-pos-01`,
        tenantId,
        location: 'Jakarta HQ',
        deviceCode: 'POS-01',
        approved: true,
        status: 'online',
        providerId: 'ADYEN',
        lastUsedAt: this.now(),
      },
      {
        id: `${tenantId}-pos-02`,
        tenantId,
        location: 'Jakarta HQ',
        deviceCode: 'POS-02',
        approved: true,
        status: 'online',
        providerId: 'STRIPE',
      },
    ];

    const pools: PaymentDevicePool[] = [
      {
        id: `${tenantId}-pool-jakarta`,
        tenantId,
        location: 'Jakarta HQ',
        primaryDeviceId: `${tenantId}-pos-01`,
        fallbackDeviceIds: [`${tenantId}-pos-02`],
        createdAt: this.now(),
        updatedAt: this.now(),
      },
    ];

    const transactions: PaymentTransaction[] = [
      {
        id: `${tenantId}-pay-001`,
        tenantId,
        type: 'vendor_payout',
        amount: 20000000,
        currency: 'IDR',
        destination: 'PT Fresh Supply Co',
        source: 'Finance',
        channel: 'bank_transfer',
        providerId: 'BANK_BCA',
        idempotencyKey: `${tenantId}-idem-001`,
        status: 'settled',
        retryAttempts: [
          {
            attempt: 1,
            attemptedAt: this.now(),
            providerId: 'BANK_BCA',
            result: 'success',
          },
        ],
        settlementId: `${tenantId}-settlement-001`,
        ledgerSyncTriggeredAt: this.now(),
        evidencePackId: `${tenantId}-evidence-001`,
        createdBy: 'system',
        approvedBy: 'finance-manager',
        approvedAt: this.now(),
        createdAt: this.now(),
        updatedAt: this.now(),
      },
    ];

    const settlements: PaymentSettlement[] = [
      {
        id: `${tenantId}-settlement-001`,
        tenantId,
        paymentId: `${tenantId}-pay-001`,
        providerReference: 'BCA-SETTLE-77881',
        status: 'confirmed',
        confirmedAt: this.now(),
        createdAt: this.now(),
        updatedAt: this.now(),
      },
    ];

    const evidence: PaymentEvidencePack[] = [
      {
        id: `${tenantId}-evidence-001`,
        tenantId,
        paymentId: `${tenantId}-pay-001`,
        providerProof: 'BCA-TRANSFER-SLIP-77881',
        approvalSignatures: ['finance-manager'],
        checksum: 'chk-seed',
        payload: '{"seed":"true"}',
        createdAt: this.now(),
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
    };
    this.store.set(tenantId, seeded);
    return seeded;
  }

  private getStore(tenantId: string) {
    return this.ensureTenant(tenantId);
  }

  private findTransaction(tenantId: string, paymentId: string) {
    const transaction = this.getStore(tenantId).transactions.find((item) => item.id === paymentId);
    if (!transaction) throw new NotFoundException('Payment transaction not found');
    return transaction;
  }

  private findRefund(tenantId: string, refundId: string) {
    const refund = this.getStore(tenantId).refunds.find((item) => item.id === refundId);
    if (!refund) throw new NotFoundException('Refund not found');
    return refund;
  }

  private findDispute(tenantId: string, disputeId: string) {
    const dispute = this.getStore(tenantId).disputes.find((item) => item.id === disputeId);
    if (!dispute) throw new NotFoundException('Dispute not found');
    return dispute;
  }

  private activeRouting(tenantId: string) {
    return this.getStore(tenantId).routing.find((item) => item.enabled);
  }

  async getDashboard(tenantId: string): Promise<PaymentDashboard> {
    const store = this.getStore(tenantId);
    const now = this.now();
    const settledToday = store.transactions.filter((item) => {
      if (item.status !== 'settled') return false;
      return (
        item.updatedAt.getFullYear() === now.getFullYear() &&
        item.updatedAt.getMonth() === now.getMonth() &&
        item.updatedAt.getDate() === now.getDate()
      );
    }).length;
    return {
      pendingApprovals: store.transactions.filter((item) => item.status === 'approval_pending').length,
      executingPayments: store.transactions.filter((item) => item.status === 'executing').length,
      settlementPending: store.transactions.filter((item) => item.status === 'settlement_pending').length,
      settledToday,
      failedTransactions: store.transactions.filter((item) => item.status === 'failed').length,
      openDisputes: store.disputes.filter((item) => !['resolved', 'rejected'].includes(item.status)).length,
      openChargebacks: store.chargebacks.filter((item) => !['won', 'lost'].includes(item.status)).length,
      refundPending: store.refunds.filter((item) => !['settled', 'rejected', 'failed'].includes(item.status)).length,
    };
  }

  async getTransactions(tenantId: string): Promise<PaymentTransaction[]> {
    return this.getStore(tenantId).transactions;
  }

  async createTransaction(
    tenantId: string,
    dto: CreatePaymentTransactionDto,
    actorId: string,
  ): Promise<PaymentTransaction> {
    const store = this.getStore(tenantId);
    const key =
      dto.idempotencyKey ??
      this.checksum(`${tenantId}|${dto.type}|${dto.amount}|${dto.destination}|${dto.externalReference ?? ''}`);
    const existing = store.transactions.find((item) => item.idempotencyKey === key);
    if (existing) return existing;

    const created: PaymentTransaction = {
      id: this.id('payment'),
      tenantId,
      externalReference: dto.externalReference,
      type: dto.type,
      amount: dto.amount,
      currency: dto.currency ?? 'IDR',
      destination: dto.destination,
      source: dto.source,
      channel: dto.channel ?? 'bank_transfer',
      idempotencyKey: key,
      status: 'approval_pending',
      retryAttempts: [],
      createdBy: actorId,
      createdAt: this.now(),
      updatedAt: this.now(),
    };
    store.transactions.unshift(created);
    this.addAudit(tenantId, actorId, 'request.created', 'transaction', created.id, created.type);
    return created;
  }

  async approveTransaction(tenantId: string, paymentId: string, actorId: string): Promise<PaymentTransaction> {
    const payment = this.findTransaction(tenantId, paymentId);
    payment.status = 'approved';
    payment.approvedBy = actorId;
    payment.approvedAt = this.now();
    payment.updatedAt = this.now();
    this.addAudit(tenantId, actorId, 'request.approved', 'transaction', payment.id, 'approved');
    return payment;
  }

  async rejectTransaction(tenantId: string, paymentId: string, actorId: string): Promise<PaymentTransaction> {
    const payment = this.findTransaction(tenantId, paymentId);
    payment.status = 'rejected';
    payment.approvedBy = actorId;
    payment.approvedAt = this.now();
    payment.updatedAt = this.now();
    this.addAudit(tenantId, actorId, 'request.rejected', 'transaction', payment.id, 'rejected');
    return payment;
  }

  async routeTransaction(
    tenantId: string,
    paymentId: string,
    dto: RoutePaymentDto,
    actorId: string,
  ): Promise<PaymentTransaction> {
    const payment = this.findTransaction(tenantId, paymentId);
    if (!['approved', 'provider_selected'].includes(payment.status)) {
      throw new BadRequestException('Payment requires approval before routing.');
    }
    const store = this.getStore(tenantId);
    const policy = this.activeRouting(tenantId);
    if (!policy) throw new BadRequestException('No active routing policy');

    const pickOrdered = [...policy.priorities, ...policy.fallbackProviders];
    const selectedId =
      dto.providerId ??
      pickOrdered.find((providerId) =>
        store.providers.some(
          (provider) =>
            provider.id === providerId &&
            provider.status !== 'down' &&
            provider.maxAmountPerTxn >= payment.amount,
        ),
      );
    if (!selectedId) throw new BadRequestException('No valid provider available');

    payment.providerId = selectedId;
    payment.status = 'provider_selected';
    payment.updatedAt = this.now();
    this.addAudit(tenantId, actorId, 'provider.selected', 'routing', payment.id, selectedId);
    return payment;
  }

  async executeTransaction(
    tenantId: string,
    paymentId: string,
    dto: ExecutePaymentDto,
    actorId: string,
  ): Promise<PaymentTransaction> {
    const payment = this.findTransaction(tenantId, paymentId);
    if (!['approved', 'provider_selected'].includes(payment.status)) {
      throw new BadRequestException('Payment requires approval and routing before execution.');
    }
    const policy = this.activeRouting(tenantId);
    if (!policy) throw new BadRequestException('No active routing policy');
    if (!payment.providerId) throw new BadRequestException('Provider is not selected');

    payment.status = 'executing';
    payment.updatedAt = this.now();
    const attempts: PaymentRetryAttempt[] = [...payment.retryAttempts];

    let success = false;
    for (let attempt = 1; attempt <= policy.maxRetries; attempt += 1) {
      const result = dto.forceFail ? 'failed' : attempt === 1 ? 'success' : 'failed';
      attempts.push({
        attempt,
        attemptedAt: this.now(),
        providerId: payment.providerId,
        result,
        reason: result === 'failed' ? 'Provider/network failure' : undefined,
      });
      if (result === 'success') {
        success = true;
        break;
      }
    }
    payment.retryAttempts = attempts;

    if (!success) {
      payment.status = 'failed';
      payment.updatedAt = this.now();
      this.addAudit(tenantId, actorId, 'execution.failed', 'transaction', payment.id, 'retries exhausted');
      return payment;
    }

    const settlement: PaymentSettlement = {
      id: this.id('settlement'),
      tenantId,
      paymentId: payment.id,
      providerReference: `${payment.providerId}-${Date.now()}`,
      status: 'pending',
      createdAt: this.now(),
      updatedAt: this.now(),
    };
    this.getStore(tenantId).settlements.unshift(settlement);
    payment.status = 'settlement_pending';
    payment.settlementId = settlement.id;
    payment.updatedAt = this.now();
    this.addAudit(tenantId, actorId, 'execution.sent', 'transaction', payment.id, settlement.providerReference);
    return payment;
  }

  async settleTransaction(tenantId: string, paymentId: string, actorId: string): Promise<PaymentTransaction> {
    const payment = this.findTransaction(tenantId, paymentId);
    if (payment.status !== 'settlement_pending') {
      throw new BadRequestException('Payment must be settlement-pending.');
    }
    if (!payment.settlementId) throw new BadRequestException('Settlement missing.');
    const settlement = this.getStore(tenantId).settlements.find((item) => item.id === payment.settlementId);
    if (!settlement) throw new NotFoundException('Settlement not found');

    settlement.status = 'confirmed';
    settlement.confirmedAt = this.now();
    settlement.updatedAt = this.now();

    const payload = JSON.stringify({
      paymentId: payment.id,
      providerReference: settlement.providerReference,
      amount: payment.amount,
      destination: payment.destination,
      approvedBy: payment.approvedBy,
      approvedAt: payment.approvedAt,
    });

    const evidence: PaymentEvidencePack = {
      id: this.id('evidence'),
      tenantId,
      paymentId: payment.id,
      providerProof: settlement.providerReference,
      approvalSignatures: [payment.createdBy, payment.approvedBy ?? actorId],
      checksum: this.checksum(payload),
      payload,
      createdAt: this.now(),
    };
    this.getStore(tenantId).evidence.unshift(evidence);

    payment.status = 'settled';
    payment.evidencePackId = evidence.id;
    payment.ledgerSyncTriggeredAt = this.now();
    payment.updatedAt = this.now();

    this.addAudit(tenantId, actorId, 'settlement.confirmed', 'settlement', settlement.id, 'ledger sync triggered');
    return payment;
  }

  async getProviders(tenantId: string): Promise<PaymentProvider[]> {
    return this.getStore(tenantId).providers;
  }

  async updateProviderStatus(
    tenantId: string,
    providerId: string,
    dto: UpdateProviderStatusDto,
    actorId: string,
  ): Promise<PaymentProvider> {
    const provider = this.getStore(tenantId).providers.find((item) => item.id === providerId);
    if (!provider) throw new NotFoundException('Provider not found');
    provider.status = dto.status;
    provider.lastHeartbeatAt = this.now();
    this.addAudit(tenantId, actorId, 'provider.status_changed', 'routing', provider.id, dto.status);
    return provider;
  }

  async runProviderHealthSweep(tenantId: string, actorId: string): Promise<PaymentProvider[]> {
    const providers = this.getStore(tenantId).providers;
    providers.forEach((provider) => {
      provider.lastHeartbeatAt = this.now();
      if (provider.status === 'down') provider.status = 'degraded';
    });
    this.addAudit(tenantId, actorId, 'provider.health_sweep', 'routing', 'health-sweep', 'health sweep completed');
    return providers;
  }

  async getRoutingPolicies(tenantId: string): Promise<PaymentRoutingPolicy[]> {
    return this.getStore(tenantId).routing;
  }

  async getDevices(tenantId: string): Promise<PaymentDevice[]> {
    return this.getStore(tenantId).devices;
  }

  async getDevicePools(tenantId: string): Promise<PaymentDevicePool[]> {
    return this.getStore(tenantId).pools;
  }

  async updateDeviceStatus(
    tenantId: string,
    deviceId: string,
    dto: UpdateDeviceStatusDto,
    actorId: string,
  ): Promise<PaymentDevice> {
    const device = this.getStore(tenantId).devices.find((item) => item.id === deviceId);
    if (!device) throw new NotFoundException('Device not found');
    device.status = dto.status;
    this.addAudit(tenantId, actorId, 'device.status_changed', 'device', device.id, dto.status);
    return device;
  }

  async getRefunds(tenantId: string): Promise<PaymentRefund[]> {
    return this.getStore(tenantId).refunds;
  }

  async createRefund(tenantId: string, dto: CreateRefundDto, actorId: string): Promise<PaymentRefund> {
    const payment = this.findTransaction(tenantId, dto.paymentId);
    if (payment.status !== 'settled') {
      throw new BadRequestException('Refund is allowed only for settled payments.');
    }
    const created: PaymentRefund = {
      id: this.id('refund'),
      tenantId,
      paymentId: dto.paymentId,
      type: dto.type,
      amount: dto.amount,
      reason: dto.reason,
      status: 'requested',
      requestedBy: actorId,
      scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : undefined,
      createdAt: this.now(),
      updatedAt: this.now(),
    };
    this.getStore(tenantId).refunds.unshift(created);
    this.addAudit(tenantId, actorId, 'refund.requested', 'refund', created.id, created.type);
    return created;
  }

  async approveRefund(tenantId: string, refundId: string, actorId: string): Promise<PaymentRefund> {
    const refund = this.findRefund(tenantId, refundId);
    refund.status = 'approved';
    refund.approvedBy = actorId;
    refund.updatedAt = this.now();
    this.addAudit(tenantId, actorId, 'refund.approved', 'refund', refund.id, 'approved');
    return refund;
  }

  async executeRefund(tenantId: string, refundId: string, actorId: string): Promise<PaymentRefund> {
    const refund = this.findRefund(tenantId, refundId);
    if (refund.status !== 'approved') throw new BadRequestException('Refund must be approved first.');
    refund.status = 'settled';
    refund.providerReference = `RFD-${Date.now()}`;
    refund.updatedAt = this.now();
    this.addAudit(tenantId, actorId, 'refund.settled', 'refund', refund.id, refund.providerReference);
    return refund;
  }

  async getDisputes(tenantId: string): Promise<PaymentDispute[]> {
    return this.getStore(tenantId).disputes;
  }

  async createDispute(tenantId: string, dto: CreateDisputeDto, actorId: string): Promise<PaymentDispute> {
    this.findTransaction(tenantId, dto.paymentId);
    const created: PaymentDispute = {
      id: this.id('dispute'),
      tenantId,
      paymentId: dto.paymentId,
      reason: dto.reason,
      amount: dto.amount,
      status: 'opened',
      openedBy: actorId,
      evidence: [],
      createdAt: this.now(),
      updatedAt: this.now(),
    };
    this.getStore(tenantId).disputes.unshift(created);
    this.addAudit(tenantId, actorId, 'dispute.opened', 'dispute', created.id, created.reason);
    return created;
  }

  async attachDisputeEvidence(
    tenantId: string,
    disputeId: string,
    dto: AttachDisputeEvidenceDto,
    actorId: string,
  ): Promise<PaymentDispute> {
    const dispute = this.findDispute(tenantId, disputeId);
    dispute.evidence = [...dispute.evidence, dto.evidence];
    dispute.status = 'evidence_attached';
    dispute.updatedAt = this.now();
    this.addAudit(tenantId, actorId, 'dispute.evidence_attached', 'dispute', dispute.id, dto.evidence);
    return dispute;
  }

  async progressDispute(
    tenantId: string,
    disputeId: string,
    dto: ProgressDisputeDto,
    actorId: string,
  ): Promise<PaymentDispute> {
    const dispute = this.findDispute(tenantId, disputeId);
    dispute.status = dto.status;
    dispute.updatedAt = this.now();
    if (dto.status === 'provider_submitted') {
      dispute.providerCaseId = `CASE-${Date.now()}`;
    }
    this.addAudit(tenantId, actorId, 'dispute.status_changed', 'dispute', dispute.id, dto.status);
    return dispute;
  }

  async resolveDispute(
    tenantId: string,
    disputeId: string,
    dto: ResolveDisputeDto,
    actorId: string,
  ): Promise<PaymentDispute> {
    const dispute = this.findDispute(tenantId, disputeId);
    dispute.status = 'resolved';
    dispute.resolution = dto.resolution;
    dispute.updatedAt = this.now();
    const chargeback: PaymentChargeback = {
      id: this.id('chargeback'),
      tenantId,
      paymentId: dispute.paymentId,
      disputeId: dispute.id,
      amount: dispute.amount,
      status: dto.resolution === 'lost' ? 'lost' : 'won',
      createdAt: this.now(),
      updatedAt: this.now(),
    };
    this.getStore(tenantId).chargebacks.unshift(chargeback);
    this.addAudit(tenantId, actorId, 'dispute.resolved', 'chargeback', chargeback.id, dto.resolution);
    return dispute;
  }

  async getChargebacks(tenantId: string): Promise<PaymentChargeback[]> {
    return this.getStore(tenantId).chargebacks;
  }

  async getSettlements(tenantId: string): Promise<PaymentSettlement[]> {
    return this.getStore(tenantId).settlements;
  }

  async getEvidencePacks(tenantId: string): Promise<PaymentEvidencePack[]> {
    return this.getStore(tenantId).evidence;
  }

  async getAuditEvents(tenantId: string): Promise<PaymentAuditEvent[]> {
    return this.getStore(tenantId).audit;
  }
}

