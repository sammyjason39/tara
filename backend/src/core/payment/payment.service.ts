import { TenantContext } from "../../gateway/tenant-context.interface";
import { Injectable, BadRequestException } from "@nestjs/common";
import { PaymentStateMachine } from "./utils/payment-state.machine";
import { AttachDisputeEvidenceDto } from "./dto/attach-dispute-evidence.dto";
import { CreateDisputeDto } from "./dto/create-dispute.dto";
import { CreatePaymentTransactionDto } from "./dto/create-payment-transaction.dto";
import { CreateRefundDto } from "./dto/create-refund.dto";
import { ExecutePaymentDto } from "./dto/execute-payment.dto";
import { ProgressDisputeDto } from "./dto/progress-dispute.dto";
import { ResolveDisputeDto } from "./dto/resolve-dispute.dto";
import { RoutePaymentDto } from "./dto/route-payment.dto";
import { UpdateDeviceStatusDto } from "./dto/update-device-status.dto";
import { UpdateProviderStatusDto } from "./dto/update-provider-status.dto";
import { IPaymentRepository } from "./repositories/payment.repository.interface";
import { StripeAdapter } from "./adapters/stripe.adapter";
import { XenditAdapter } from "./adapters/xendit.adapter";
import { MidtransAdapter } from "./adapters/midtrans.adapter";
import { PaymentAdapter } from "./adapters/payment.adapter.interface";
import { IFinanceRepository } from "../finance/repositories/finance.repository.interface";

@Injectable()
export class PaymentService {
  private readonly circuitBreakers = new Map<string, { failure_count: number, last_failure_at: number }>();
  private readonly FAILURE_THRESHOLD = 3;
  private readonly CB_COOLDOWN_MS = 60000;
  private readonly IS_STATELESS = process.env.VERCEL === "1";

  constructor(
    private readonly repository: IPaymentRepository,
    private readonly stripeAdapter: StripeAdapter,
    private readonly xenditAdapter: XenditAdapter,
    private readonly midtransAdapter: MidtransAdapter,
    private readonly financeRepository: IFinanceRepository,
  ) {}

  public getAdapter(provider: string): PaymentAdapter {
    if (this.IS_STATELESS) {
      return this.resolveAdapter(provider);
    }

    const cb = this.circuitBreakers.get(provider);
    if (cb && cb.failure_count >= this.FAILURE_THRESHOLD) {
      const now = Date.now();
      if (now - cb.last_failure_at < this.CB_COOLDOWN_MS) {
        throw new Error(`Gateway ${provider} is temporarily disabled due to multiple failures.`);
      } else {
        this.resetFailure(provider);
      }
    }

    return this.resolveAdapter(provider);
  }

  private resolveAdapter(provider: string): PaymentAdapter {
    switch (provider.toUpperCase()) {
      case "STRIPE": return this.stripeAdapter;
      case "XENDIT": return this.xenditAdapter;
      case "MIDTRANS": return this.midtransAdapter;
      default: throw new Error(`Unsupported provider: ${provider}`);
    }
  }

  private recordFailure(provider: string) {
    if (this.IS_STATELESS) return;

    const cb = this.circuitBreakers.get(provider) || { failure_count: 0, last_failure_at: 0 };
    this.circuitBreakers.set(provider, {
      failure_count: cb.failure_count + 1,
      last_failure_at: Date.now(),
    });
  }

  private resetFailure(provider: string) {
    this.circuitBreakers.delete(provider);
  }

  private recordSuccess(provider: string) {
    this.resetFailure(provider);
  }

  async getDashboard(ctx: TenantContext) {
    return this.repository.getDashboard(ctx);
  }

  async getTransactions(ctx: TenantContext) {
    return this.repository.getTransactions(ctx);
  }

  async createTransaction(ctx: TenantContext,
    dto: CreatePaymentTransactionDto,
    actor_id: string,
  ) {
    // BUG-11 FIX: Check offline payment matrix
    const isOffline = this.isOfflineMode(ctx);
    const blockedPaymentTypes = ['CARD', 'QRIS', 'E_WALLET', 'LOYALTY_POINTS'];
    
    // Determine payment type from request
    const paymentType = this.determinePaymentType(dto);
    
    if (isOffline && blockedPaymentTypes.includes(paymentType)) {
      throw new BadRequestException({
        type: 'payment/offline-not-allowed',
        title: 'Payment Method Unavailable Offline',
        detail: `Payment method ${paymentType} is not available in offline mode. Only CASH and VOUCHER payments are allowed.`,
        tenant_id: ctx.tenant_id,
      });
    }
    
    return this.repository.createTransaction(ctx, dto, actor_id);
  }
  
  /**
   * Determine payment type from request DTO
   */
  private determinePaymentType(dto: CreatePaymentTransactionDto): string {
    // Map channel to payment type
    if (dto.channel === 'card_online' || dto.channel === 'card_pos') return 'CARD';
    if (dto.channel === 'wallet') return 'E_WALLET';
    if (dto.channel === 'qr') return 'QRIS';
    if (dto.method === 'EDC') return 'CARD';
    if (dto.method === 'CASH') return 'CASH';
    if (dto.method === 'GATEWAY') return dto.provider || 'GATEWAY';
    return 'UNKNOWN';
  }
  
  /**
   * Check if system is in offline mode
   * Uses OFFLINE_MODE environment variable for simple configuration
   */
  private isOfflineMode(ctx: TenantContext): boolean {
    return process.env.OFFLINE_MODE === "true";
  }

  async approveTransaction(ctx: TenantContext,
    paymentId: string,
    actor_id: string,
  ) {
    return this.repository.approveTransaction(ctx, paymentId, actor_id);
  }

  async rejectTransaction(ctx: TenantContext,
    paymentId: string,
    actor_id: string,
  ) {
    return this.repository.rejectTransaction(ctx, paymentId, actor_id);
  }

  async routeTransaction(ctx: TenantContext,
    paymentId: string,
    dto: RoutePaymentDto,
    actor_id: string,
  ) {
    return this.repository.routeTransaction(ctx, paymentId, dto, actor_id);
  }

  async executeTransaction(ctx: TenantContext,
    paymentId: string,
    dto: ExecutePaymentDto,
    actor_id: string,
  ) {
    return this.repository.executeTransaction(
      ctx,
      paymentId,
      dto,
      actor_id,
    );
  }

  async settleTransaction(ctx: TenantContext,
    paymentId: string,
    actor_id: string,
  ) {
    return this.repository.settleTransaction(ctx, paymentId, actor_id);
  }

  async settleBatch(ctx: TenantContext,
    dto: { transactionIds: string[] },
    actor_id: string,
  ) {
    const transactions = await this.repository.getTransactions(ctx);
    const toSettle = transactions.filter(
      (t) =>
        dto.transactionIds.includes(t.id) &&
        t.paymentStatus === "PAID"
    );

    if (toSettle.length === 0) return { settledCount: 0 };

    let settledCount = 0;
    for (const tx of toSettle) {
      const realizedFee = tx.platformFeePending || 0;
      const gatewayFee = tx.gatewayFee || 0;
      const totalAmount = Number(tx.amount);
      const settledAmount = totalAmount - gatewayFee;

      await this.repository.updateTransactionStatus(
        ctx,
        tx.id,
        { 
          status: "SETTLED",
          platform_fee_pending: 0,
          platform_fee_realized: realizedFee,
        },
        actor_id,
      );

      if (realizedFee > 0) {
        await this.repository.createPlatformFeeLedger(
          ctx,
          tx.id,
          realizedFee,
          tx.provider || "MANUAL"
        );
      }

      const accountCode = tx.method === "CASH" ? "1000" : "1001";
      const description = tx.method === "CASH" ? "Cash dropped to Vault" : "Batch Settlement Deposit";
      
      const lines = [
        {
          accountCode: accountCode,
          debit: settledAmount,
          credit: 0,
          description: description,
        },
        {
          accountCode: "1002",
          debit: 0,
          credit: totalAmount,
          description: "Clear Accounts Receivable",
        },
      ];

      if (tx.method === "GATEWAY" && gatewayFee > 0) {
        lines.push({
          accountCode: "EXP-FEE",
          debit: gatewayFee,
          credit: 0,
          description: "Gateway Processing Fee",
        });
      }

      await this.financeRepository.createJournal(ctx, {
        ref: `BATCH-${tx.id.substring(0, 8)}`,
        description: `${tx.method} Batch Settlement for ${tx.externalReference || tx.id}`,
        lines,
      });

      settledCount++;
    }

    return { settledCount };
  }

  async getProviders(ctx: TenantContext) {
    return this.repository.getProviders(ctx);
  }

  async updateProviderStatus(ctx: TenantContext,
    providerId: string,
    dto: UpdateProviderStatusDto,
    actor_id: string,
  ) {
    return this.repository.updateProviderStatus(
      ctx,
      providerId,
      dto,
      actor_id,
    );
  }

  async runProviderHealthSweep(ctx: TenantContext, actor_id: string) {
    return this.repository.runProviderHealthSweep(ctx, actor_id);
  }

  async getRoutingPolicies(ctx: TenantContext) {
    return this.repository.getRoutingPolicies(ctx);
  }

  async getDevices(ctx: TenantContext) {
    return this.repository.getDevices(ctx);
  }

  async getDevicePools(ctx: TenantContext) {
    return this.repository.getDevicePools(ctx);
  }

  async updateDeviceStatus(ctx: TenantContext,
    device_id: string,
    dto: UpdateDeviceStatusDto,
    actor_id: string,
  ) {
    return this.repository.updateDeviceStatus(ctx, device_id, dto, actor_id);
  }

  async getRefunds(ctx: TenantContext) {
    return this.repository.getRefunds(ctx);
  }

  async createRefund(ctx: TenantContext, dto: CreateRefundDto, actor_id: string) {
    return this.repository.createRefund(ctx, dto, actor_id);
  }

  async approveRefund(ctx: TenantContext, refundId: string, actor_id: string) {
    return this.repository.approveRefund(ctx, refundId, actor_id);
  }

  async executeRefund(ctx: TenantContext, refundId: string, actor_id: string) {
    return this.repository.executeRefund(ctx, refundId, actor_id);
  }

  async getDisputes(ctx: TenantContext) {
    return this.repository.getDisputes(ctx);
  }

  async createDispute(ctx: TenantContext,
    dto: CreateDisputeDto,
    actor_id: string,
  ) {
    return this.repository.createDispute(ctx, dto, actor_id);
  }

  async attachDisputeEvidence(ctx: TenantContext,
    disputeId: string,
    dto: AttachDisputeEvidenceDto,
    actor_id: string,
  ) {
    return this.repository.attachDisputeEvidence(
      ctx,
      disputeId,
      dto,
      actor_id,
    );
  }

  async progressDispute(ctx: TenantContext,
    disputeId: string,
    dto: ProgressDisputeDto,
    actor_id: string,
  ) {
    return this.repository.progressDispute(ctx, disputeId, dto, actor_id);
  }

  async resolveDispute(ctx: TenantContext,
    disputeId: string,
    dto: ResolveDisputeDto,
    actor_id: string,
  ) {
    return this.repository.resolveDispute(ctx, disputeId, dto, actor_id);
  }

  async getChargebacks(ctx: TenantContext) {
    return this.repository.getChargebacks(ctx);
  }

  async getSettlements(ctx: TenantContext) {
    return this.repository.getSettlements(ctx);
  }

  async getEvidencePacks(ctx: TenantContext) {
    return this.repository.getEvidencePacks(ctx);
  }

  async getAuditEvents(ctx: TenantContext) {
    return this.repository.getAuditEvents(ctx);
  }

  async getPaymentSettings(ctx: TenantContext) {
    return this.repository.getPaymentSettings(ctx);
  }

  async updatePaymentSettings(ctx: TenantContext, data: any) {
    return this.repository.updatePaymentSettings(ctx, data);
  }

  async getPaymentStatus(ctx: TenantContext) {
    const configuredProviders: string[] = [];
    if (await this.stripeAdapter.isAvailable(ctx)) configuredProviders.push("STRIPE");
    if (await this.xenditAdapter.isAvailable(ctx)) configuredProviders.push("XENDIT");
    if (await this.midtransAdapter.isAvailable(ctx)) configuredProviders.push("MIDTRANS");

    const availableProviders = configuredProviders.filter(p => {
      const cb = this.circuitBreakers.get(p);
      if (!cb) return true;
      const is_open = cb.failure_count >= this.FAILURE_THRESHOLD && (Date.now() - cb.last_failure_at < this.CB_COOLDOWN_MS);
      return !is_open;
    });

    const is_total_outage = configuredProviders.length > 0 && availableProviders.length === 0;

    return {
      cash: true,
      edc: true,
      gateway: availableProviders.length > 0,
      available_providers: availableProviders,
      reason: is_total_outage ? "Gateway temporarily unavailable due to upstream connectivity issues" : undefined,
    };
  }

  async processCash(ctx: TenantContext,
    dto: CreatePaymentTransactionDto,
    actor_id: string,
  ) {
    // BUG-11 FIX: Cash payments are allowed in offline mode
    const transaction = await this.repository.createTransaction(
      ctx,
      {
        ...dto,
        method: "CASH",
        provider: "MANUAL",
      },
      actor_id,
    );

    return this.repository.updateTransactionStatus(
      ctx,
      transaction.id,
      {
        status: "PAID",
        net_amount: dto.amount,
      },
      actor_id,
    );
  }

  async confirmEDC(ctx: TenantContext,
    dto: CreatePaymentTransactionDto,
    actor_id: string,
  ) {
    // BUG-11 FIX: EDC payments are allowed in offline mode
    const transaction = await this.repository.createTransaction(
      ctx,
      {
        ...dto,
        method: "EDC",
        provider: "MANUAL",
      },
      actor_id,
    );

    return this.repository.updateTransactionStatus(
      ctx,
      transaction.id,
      {
        status: "PAID",
        external_ref: dto.externalRef,
        net_amount: dto.amount,
      },
      actor_id,
    );
  }

  async createGatewayPayment(ctx: TenantContext,
    dto: CreatePaymentTransactionDto,
    actor_id: string,
  ) {
    // BUG-11 FIX: Check offline payment matrix for gateway payments
    const isOffline = this.isOfflineMode(ctx);
    if (isOffline) {
      throw new BadRequestException({
        type: 'payment/offline-not-allowed',
        title: 'Gateway Payment Unavailable Offline',
        detail: 'Gateway payments (CARD, QRIS, E-Wallet) are not available in offline mode.',
        tenant_id: ctx.tenant_id,
      });
    }
    
    const settings = await this.getPaymentSettings(ctx);
    const provider = dto.provider || "STRIPE";
    
    if (provider !== "MANUAL") {
       const status = await this.getPaymentStatus(ctx);
       if (!status.gateway || !status.available_providers.includes(provider)) {
         throw new Error(`Gateway ${provider} is currently unavailable for tenant ${ctx.tenant_id}`);
       }
    }

    const adapter = this.getAdapter(provider);
    const zenvixFee = Math.floor(dto.amount * 0.01);
    const feeAbsorbedBy = settings.fee_absorption_mode || "MERCHANT";

    const transaction = await this.repository.createTransaction(
      ctx,
      {
        ...dto,
        method: "GATEWAY",
        provider: provider as any,
      },
      actor_id,
    );

    try {
      const gatewayResult = await adapter.createPaymentIntent({
        amount: feeAbsorbedBy === "CUSTOMER" ? dto.amount + zenvixFee : dto.amount,
        currency: dto.currency || "IDR",
        tenant_id: ctx.tenant_id,
        order_id: transaction.id, 
        application_fee_amount: zenvixFee,
      });

      await this.repository.updateTransactionStatus(
        ctx,
        transaction.id,
        {
          status: "PENDING",
          external_ref: gatewayResult.transaction_id || gatewayResult.client_secret || "", 
          platform_fee_pending: zenvixFee,
        },
        actor_id,
      );

      return {
        transaction_id: transaction.id,
        ...gatewayResult,
      };
    } catch (error) {
      this.recordFailure(provider);
      throw error;
    }
  }

  async handleGatewayWebhookPayload(
    provider: string,
    payload: any,
    signature: string,
    ctx?: TenantContext,
  ) {
    const adapter = this.getAdapter(provider);
    const result = await adapter.handleWebhook(
      payload, 
      signature, 
      process.env[`${provider.toUpperCase()}_WEBHOOK_SECRET`]
    );

    const event_id = (result as any).raw_event?.id || (result as any).raw_event?.event_id || result.external_ref;

    const isNewEvent = await this.repository.checkAndInsertWebhookEvent(event_id!, provider, payload);
    if (!isNewEvent) {
      console.warn(`[PaymentWebhook] Ignored duplicate event ${event_id} from ${provider}`);
      return;
    }

    let effectiveCtx = ctx;
    let tx;

    if (!effectiveCtx) {
       tx = await this.repository.findTransactionByExternalRef(result.external_ref);
       if (tx) {
         effectiveCtx = {
           tenant_id: tx.tenant_id,
           company_id: tx.company_id,
           branch_id: tx.branch_id,
           ecommerce_id: tx.ecommerce_id,
         } as TenantContext;
       }
    } else {
       const transactions = await this.repository.getTransactions(effectiveCtx);
       tx = transactions.find((t) => t.externalRef === result.external_ref || t.id === result.external_ref);
    }

    if (!tx || tx.paymentStatus === "PAID") return; 
    if (!effectiveCtx) {
       console.error(`[PaymentWebhook] Could not determine tenant context for external_ref ${result.external_ref}`);
       return;
    }

    return this.syncTransactionStatus(effectiveCtx, tx.id, {
      status: result.status,
      gateway_fee: result.gateway_fee,
      net_amount: result.net_amount,
    }, provider, "webhook");
  }

  async syncTransactionStatus(ctx: TenantContext,
    transaction_id: string,
    data: {
      status: "PENDING" | "PAID" | "FAILED" | "REFUNDED" | "SETTLED";
      external_ref?: string;
      gateway_fee?: number;
      net_amount?: number;
      retry_count?: number;
      last_checked_at?: Date;
    },
    provider: string,
    actor_id: string,
  ) {
    const transactions = await this.repository.getTransactions(ctx);
    const tx = transactions.find((t) => t.id === transaction_id);
    if (!tx) return;

    PaymentStateMachine.validate(tx.paymentStatus || "PENDING", data.status);

    if (tx.paymentStatus === data.status) {
      return tx;
    }

    if (data.status === "REFUNDED") {
      const accountCode = tx.method === "CASH" ? "1000" : "1001";
      const totalAmount = Number(tx.amount);
      const feeAmount = tx.platformFeeRealized ? Number(tx.platformFeeRealized) : 0;
      const netReversal = totalAmount - feeAmount;

      await this.financeRepository.createJournal(ctx, {
        ref: `REV-${tx.id.substring(0, 8)}`,
        description: `Full Refund Reversal [${tx.method}] - Gross: ${totalAmount}, Platform: ${feeAmount}`,
        lines: [
          {
            accountCode: "4100",
            debit: totalAmount,
            credit: 0,
            description: "Gross Revenue Reversal (DR 4100)",
          },
          {
            accountCode: accountCode,
            debit: 0,
            credit: netReversal,
            description: "Cash/Bank Outflow Reversal",
          },
          ...(feeAmount > 0
            ? [
                {
                  accountCode: "4000-PLT",
                  debit: feeAmount,
                  credit: 0,
                  description: "Zenvix Platform Fee Income Reversal",
                },
              ]
            : []),
        ],
      });
    }

    const updated = await this.repository.updateTransactionStatus(
      ctx,
      tx.id,
      data,
      actor_id,
    );

    return updated;
  }

  async refundPayment(ctx: TenantContext, transaction_id: string, actor_id: string) {
    const transactions = await this.repository.getTransactions(ctx);
    const tx = transactions.find((t) => t.id === transaction_id);
    if (!tx) throw new Error("Transaction not found");

    if (tx.paymentStatus === "REFUNDED") {
      return { success: true, message: "Already refunded" };
    }

    let success = false;
    let providerName = "MANUAL";

    if (tx.method === "CASH") {
      success = true;
    } else if (tx.method === "GATEWAY" && tx.provider && tx.externalRef) {
      providerName = tx.provider;
      const adapter = this.getAdapter(tx.provider);
      try {
        success = await adapter.refund(tx.externalRef, tx.amount);
        if (success) {
          this.recordSuccess(tx.provider);
        }
      } catch (error) {
        this.recordFailure(tx.provider);
        throw error;
      }
    }

    if (success) {
      await this.syncTransactionStatus(ctx, tx.id, { status: "REFUNDED" }, providerName, actor_id);
      return { success: true, method: tx.method };
    }

    throw new Error("Unable to refund given transaction state");
  }

  getProviderHealth() {
    const health: Record<string, any> = {
      STRIPE: { status: "HEALTHY" },
      XENDIT: { status: "HEALTHY" },
      MIDTRANS: { status: "HEALTHY" },
    };

    this.circuitBreakers.forEach((cb, provider) => {
      const is_open = cb.failure_count >= this.FAILURE_THRESHOLD && (Date.now() - cb.last_failure_at < this.CB_COOLDOWN_MS);
      health[provider] = {
        status: is_open ? "CLOSED" : "DEGRADED",
        failure_count: cb.failure_count,
        last_failure_at: new Date(cb.last_failure_at).toISOString(),
        retry_after: is_open ? Math.ceil((this.CB_COOLDOWN_MS - (Date.now() - cb.last_failure_at)) / 1000) + "s" : "0s",
      };
    });

    return health;
  }

  async getPaymentStats(ctx: TenantContext) {
    const transactions = await this.repository.getTransactions(ctx);
    
    const stats = {
      volume: 0,
      realized_fees: 0,
      counts: {
        PENDING: 0,
        PAID: 0,
        SETTLED: 0,
        REFUNDED: 0,
        FAILED: 0,
      },
    };

    transactions.forEach(tx => {
      const status = tx.paymentStatus || "PENDING";
      if (stats.counts[status as keyof typeof stats.counts] !== undefined) {
        stats.counts[status as keyof typeof stats.counts]++;
      }

      const amount = Number(tx.amount || 0);
      if (status === "PAID" || status === "SETTLED") {
        stats.volume += amount;
      }

      stats.realized_fees += Number(tx.platformFeeRealized || 0);
    });

    return stats;
  }
}
