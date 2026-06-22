import { TenantContext } from "../../gateway/tenant-context.interface";
import { TenantScope } from "../../shared/scope/tenant-scope";
import { Injectable } from "@nestjs/common";
import { BadRequestException } from "../_shared";
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
import { OfflineContextResolver } from "./utils/offline-context.resolver";
import { AtomicOperationService } from "../shared/atomic";
import {
  classifyPaymentMethod,
  isMethodPermittedOffline,
} from "./utils/offline-payment-matrix";

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
    private readonly offlineResolver: OfflineContextResolver,
    private readonly atomic: AtomicOperationService,
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

  /**
   * Bridge a validated {@link TenantScope} (resolved by the controller from the
   * verified `TenantContext`) onto the legacy `TenantContext`-typed scope
   * parameter still used by the repository, payment adapters, the offline
   * resolver and the Finance journal helper. A `TenantScope` carries exactly the
   * tenant scoping fields (`tenant_id` / `branch_id` / `location_id`) those
   * collaborators consume (see `MultiTenancyUtil.ScopeLike`), so this is a
   * type-only adaptation with no behavioural change. Repository reads now consume
   * the resolved `TenantScope` directly (task 10.5); this bridge remains only for
   * the write paths and adapters/Finance helpers still typed against
   * `TenantContext`.
   */
  private toContext(scope: TenantScope): TenantContext {
    return {
      tenant_id: scope.tenant_id,
      company_id: scope.company_id as string,
      branch_id: scope.branch_id,
      location_id: scope.location_id,
    };
  }

  async getDashboard(scope: TenantScope) {
    return this.repository.getDashboard(scope);
  }

  async getTransactions(scope: TenantScope) {
    return this.repository.getTransactions(scope);
  }

  async createTransaction(scope: TenantScope,
    dto: CreatePaymentTransactionDto,
    actor_id: string,
  ) {
    const ctx = this.toContext(scope);
    // BUG-11: Enforce the Offline_Payment_Matrix against the resolved offline state
    // of this specific payment context (device/branch connectivity), not a global flag.
    const offlineContext = await this.offlineResolver.resolve(ctx, dto);
    const methodClass = classifyPaymentMethod(dto);

    if (offlineContext.isOffline && !isMethodPermittedOffline(methodClass)) {
      throw new BadRequestException({
        type: 'payment/offline-not-allowed',
        title: 'Payment Method Unavailable Offline',
        detail: `Payment method ${methodClass} is not available while the payment context is offline (${offlineContext.reason}). Only CASH and VOUCHER payments are allowed offline.`,
        tenant_id: ctx.tenant_id,
      });
    }

    return this.repository.createTransaction(ctx, dto, actor_id);
  }

  async approveTransaction(scope: TenantScope,
    paymentId: string,
    actor_id: string,
  ) {
    const ctx = this.toContext(scope);
    // The transition, its payment_audit_events record (written on the same
    // transaction client inside the repository) and the Integration_Log outbox
    // event all commit or roll back together (Requirements 12.3, 4.1, 4.2, 6.5).
    return this.atomic.run(async ({ tx, outbox }) => {
      const result = await this.repository.approveTransaction(
        ctx,
        paymentId,
        actor_id,
        tx,
      );
      await outbox({
        tenant_id: ctx.tenant_id,
        type: "payment.transaction.approved.v1",
        payload: { transaction_id: paymentId },
        company_id: scope.company_id,
      });
      return result;
    });
  }

  async rejectTransaction(scope: TenantScope,
    paymentId: string,
    actor_id: string,
  ) {
    const ctx = this.toContext(scope);
    return this.atomic.run(async ({ tx, outbox }) => {
      const result = await this.repository.rejectTransaction(
        ctx,
        paymentId,
        actor_id,
        tx,
      );
      await outbox({
        tenant_id: ctx.tenant_id,
        type: "payment.transaction.rejected.v1",
        payload: { transaction_id: paymentId },
        company_id: scope.company_id,
      });
      return result;
    });
  }

  async routeTransaction(scope: TenantScope,
    paymentId: string,
    dto: RoutePaymentDto,
    actor_id: string,
  ) {
    const ctx = this.toContext(scope);
    return this.atomic.run(async ({ tx, outbox }) => {
      const result = await this.repository.routeTransaction(
        ctx,
        paymentId,
        dto,
        actor_id,
        tx,
      );
      await outbox({
        tenant_id: ctx.tenant_id,
        type: "payment.transaction.routed.v1",
        payload: { transaction_id: paymentId },
        company_id: scope.company_id,
      });
      return result;
    });
  }

  async executeTransaction(scope: TenantScope,
    paymentId: string,
    dto: ExecutePaymentDto,
    actor_id: string,
  ) {
    const ctx = this.toContext(scope);
    return this.atomic.run(async ({ tx, outbox }) => {
      const result = await this.repository.executeTransaction(
        ctx,
        paymentId,
        dto,
        actor_id,
        tx,
      );
      await outbox({
        tenant_id: ctx.tenant_id,
        type: "payment.transaction.executed.v1",
        payload: { transaction_id: paymentId, status: result.status },
        company_id: scope.company_id,
      });
      return result;
    });
  }

  async settleTransaction(scope: TenantScope,
    paymentId: string,
    actor_id: string,
  ) {
    const ctx = this.toContext(scope);
    // On settle, the state transition (+ its settlement/evidence writes + audit),
    // the corresponding Finance_Module settlement record, and the Integration_Log
    // outbox event all enrol in the SAME Atomic_Operation, so they commit together
    // or roll back together (Requirements 12.3, 12.11, 4.1, 4.2, 6.5). If the
    // Finance settlement record fails, the whole operation rolls back — the
    // transaction is left in its pre-settlement (SETTLEMENT_PENDING) state — and
    // the error propagates as a server-error (5xx) response (Requirements 12.12,
    // 11.11).
    return this.atomic.run(async ({ tx, outbox }) => {
      const result = await this.repository.settleTransaction(
        ctx,
        paymentId,
        actor_id,
        tx,
      );

      // Finance settlement record, threaded onto the same transaction client so
      // it enrols in the current Atomic_Operation (Requirement 12.11). The
      // balanced posting clears Accounts Receivable against the cash/bank deposit,
      // recognising any gateway processing fee as an expense. A failure here
      // throws and rolls the whole operation back (Requirement 12.12).
      const totalAmount = Number(result.amount);
      const gatewayFee = Number(result.gatewayFee ?? 0);
      const settledAmount = totalAmount - gatewayFee;
      const isCash = result.method === "CASH";
      const depositAccount = isCash ? "1000" : "1001";
      const depositDescription = isCash
        ? "Cash dropped to Vault"
        : "Settlement Deposit";

      const lines: {
        accountCode: string;
        debit: number;
        credit: number;
        description: string;
      }[] = [
        {
          accountCode: depositAccount,
          debit: settledAmount,
          credit: 0,
          description: depositDescription,
        },
        {
          accountCode: "1002",
          debit: 0,
          credit: totalAmount,
          description: "Clear Accounts Receivable",
        },
      ];

      if (result.method === "GATEWAY" && gatewayFee > 0) {
        lines.push({
          accountCode: "EXP-FEE",
          debit: gatewayFee,
          credit: 0,
          description: "Gateway Processing Fee",
        });
      }

      await this.financeRepository.createJournal(
        ctx,
        {
          ref: `STL-${result.id.substring(0, 8)}`,
          description: `${result.method ?? "PAYMENT"} Settlement for ${result.externalReference || result.id}`,
          lines,
        },
        tx,
      );

      await outbox({
        tenant_id: ctx.tenant_id,
        type: "payment.transaction.settled.v1",
        payload: { transaction_id: paymentId },
        company_id: scope.company_id,
      });
      return result;
    });
  }

  async settleBatch(scope: TenantScope,
    dto: { transactionIds: string[] },
    actor_id: string,
  ) {
    const ctx = this.toContext(scope);
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

  async getProviders(scope: TenantScope) {
    return this.repository.getProviders(scope);
  }

  async updateProviderStatus(scope: TenantScope,
    providerId: string,
    dto: UpdateProviderStatusDto,
    actor_id: string,
  ) {
    return this.repository.updateProviderStatus(
      this.toContext(scope),
      providerId,
      dto,
      actor_id,
    );
  }

  async runProviderHealthSweep(scope: TenantScope, actor_id: string) {
    return this.repository.runProviderHealthSweep(this.toContext(scope), actor_id);
  }

  async getRoutingPolicies(scope: TenantScope) {
    return this.repository.getRoutingPolicies(scope);
  }

  async getDevices(scope: TenantScope) {
    return this.repository.getDevices(scope);
  }

  async getDevicePools(scope: TenantScope) {
    return this.repository.getDevicePools(scope);
  }

  async updateDeviceStatus(scope: TenantScope,
    device_id: string,
    dto: UpdateDeviceStatusDto,
    actor_id: string,
  ) {
    return this.repository.updateDeviceStatus(this.toContext(scope), device_id, dto, actor_id);
  }

  async getRefunds(scope: TenantScope) {
    return this.repository.getRefunds(scope);
  }

  async createRefund(scope: TenantScope, dto: CreateRefundDto, actor_id: string) {
    return this.repository.createRefund(this.toContext(scope), dto, actor_id);
  }

  async approveRefund(scope: TenantScope, refundId: string, actor_id: string) {
    const ctx = this.toContext(scope);
    return this.atomic.run(async ({ tx, outbox }) => {
      const result = await this.repository.approveRefund(
        ctx,
        refundId,
        actor_id,
        tx,
      );
      await outbox({
        tenant_id: ctx.tenant_id,
        type: "payment.refund.approved.v1",
        payload: { refund_id: refundId },
        company_id: scope.company_id,
      });
      return result;
    });
  }

  async executeRefund(scope: TenantScope, refundId: string, actor_id: string) {
    const ctx = this.toContext(scope);
    return this.atomic.run(async ({ tx, outbox }) => {
      const result = await this.repository.executeRefund(
        ctx,
        refundId,
        actor_id,
        tx,
      );
      await outbox({
        tenant_id: ctx.tenant_id,
        type: "payment.refund.executed.v1",
        payload: { refund_id: refundId },
        company_id: scope.company_id,
      });
      return result;
    });
  }

  async getDisputes(scope: TenantScope) {
    return this.repository.getDisputes(scope);
  }

  async createDispute(scope: TenantScope,
    dto: CreateDisputeDto,
    actor_id: string,
  ) {
    return this.repository.createDispute(this.toContext(scope), dto, actor_id);
  }

  async attachDisputeEvidence(scope: TenantScope,
    disputeId: string,
    dto: AttachDisputeEvidenceDto,
    actor_id: string,
  ) {
    return this.repository.attachDisputeEvidence(
      this.toContext(scope),
      disputeId,
      dto,
      actor_id,
    );
  }

  async progressDispute(scope: TenantScope,
    disputeId: string,
    dto: ProgressDisputeDto,
    actor_id: string,
  ) {
    const ctx = this.toContext(scope);
    return this.atomic.run(async ({ tx, outbox }) => {
      const result = await this.repository.progressDispute(
        ctx,
        disputeId,
        dto,
        actor_id,
        tx,
      );
      await outbox({
        tenant_id: ctx.tenant_id,
        type: "payment.dispute.progressed.v1",
        payload: { dispute_id: disputeId, status: dto.status },
        company_id: scope.company_id,
      });
      return result;
    });
  }

  async resolveDispute(scope: TenantScope,
    disputeId: string,
    dto: ResolveDisputeDto,
    actor_id: string,
  ) {
    const ctx = this.toContext(scope);
    return this.atomic.run(async ({ tx, outbox }) => {
      const result = await this.repository.resolveDispute(
        ctx,
        disputeId,
        dto,
        actor_id,
        tx,
      );
      await outbox({
        tenant_id: ctx.tenant_id,
        type: "payment.dispute.resolved.v1",
        payload: { dispute_id: disputeId, resolution: dto.resolution },
        company_id: scope.company_id,
      });
      return result;
    });
  }

  async getChargebacks(scope: TenantScope) {
    return this.repository.getChargebacks(scope);
  }

  async getSettlements(scope: TenantScope) {
    return this.repository.getSettlements(scope);
  }

  async getEvidencePacks(scope: TenantScope) {
    return this.repository.getEvidencePacks(scope);
  }

  async getAuditEvents(scope: TenantScope) {
    return this.repository.getAuditEvents(scope);
  }

  async getPaymentSettings(scope: TenantScope) {
    return this.repository.getPaymentSettings(scope);
  }

  async updatePaymentSettings(scope: TenantScope, data: any) {
    return this.repository.updatePaymentSettings(this.toContext(scope), data);
  }

  async getPaymentStatus(scope: TenantScope) {
    const ctx = this.toContext(scope);
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

  async processCash(scope: TenantScope,
    dto: CreatePaymentTransactionDto,
    actor_id: string,
  ) {
    const ctx = this.toContext(scope);
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

  async confirmEDC(scope: TenantScope,
    dto: CreatePaymentTransactionDto,
    actor_id: string,
  ) {
    const ctx = this.toContext(scope);
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

  async createGatewayPayment(scope: TenantScope,
    dto: CreatePaymentTransactionDto,
    actor_id: string,
  ) {
    const ctx = this.toContext(scope);
    // BUG-11: Gateway payments (CARD, QRIS, E-Wallet) are gateway-backed and are
    // blocked when the resolved payment context is offline.
    const offlineContext = await this.offlineResolver.resolve(ctx, dto);
    if (offlineContext.isOffline) {
      throw new BadRequestException({
        type: 'payment/offline-not-allowed',
        title: 'Gateway Payment Unavailable Offline',
        detail: `Gateway payments (CARD, QRIS, E-Wallet) are not available while the payment context is offline (${offlineContext.reason}).`,
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
