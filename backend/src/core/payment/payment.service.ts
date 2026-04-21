import { Injectable, HttpException, HttpStatus } from "@nestjs/common";
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
  // HARDENED: Strict Gateway Circuit Breaker
  // Structure: { failure_count: number, last_failure_at: number }
  private readonly circuitBreakers = new Map<string, { failure_count: number, last_failure_at: number }>();
  private readonly FAILURE_THRESHOLD = 3;
  private readonly CB_COOLDOWN_MS = 60000; // 60s
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
      // In Serverless mode, skip circuit breaker as memory is not persistent
      return this.resolveAdapter(provider);
    }

    const cb = this.circuitBreakers.get(provider);
    if (cb && cb.failure_count >= this.FAILURE_THRESHOLD) {
      const now = Date.now();
      if (now - cb.last_failure_at < this.CB_COOLDOWN_MS) {
        throw new Error(`Gateway ${provider} is temporarily disabled due to multiple failures.`);
      } else {
        // Cooldown passed, reset partially
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
    if (this.IS_STATELESS) return; // Cannot rely on local memory in Vercel

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

  async getDashboard(tenant_id: string) {
    return this.repository.getDashboard(tenant_id);
  }

  async getTransactions(tenant_id: string) {
    return this.repository.getTransactions(tenant_id);
  }

  async createTransaction(
    tenant_id: string,
    dto: CreatePaymentTransactionDto,
    actor_id: string,
  ) {
    return this.repository.createTransaction(tenant_id, dto, actor_id);
  }

  async approveTransaction(
    tenant_id: string,
    paymentId: string,
    actor_id: string,
  ) {
    return this.repository.approveTransaction(tenant_id, paymentId, actor_id);
  }

  async rejectTransaction(
    tenant_id: string,
    paymentId: string,
    actor_id: string,
  ) {
    return this.repository.rejectTransaction(tenant_id, paymentId, actor_id);
  }

  async routeTransaction(
    tenant_id: string,
    paymentId: string,
    dto: RoutePaymentDto,
    actor_id: string,
  ) {
    return this.repository.routeTransaction(tenant_id, paymentId, dto, actor_id);
  }

  async executeTransaction(
    tenant_id: string,
    paymentId: string,
    dto: ExecutePaymentDto,
    actor_id: string,
  ) {
    return this.repository.executeTransaction(
      tenant_id,
      paymentId,
      dto,
      actor_id,
    );
  }

  async settleTransaction(
    tenant_id: string,
    paymentId: string,
    actor_id: string,
  ) {
    return this.repository.settleTransaction(tenant_id, paymentId, actor_id);
  }

  async settleBatch(
    tenant_id: string,
    dto: { transactionIds: string[] },
    actor_id: string,
  ) {
    const transactions = await this.repository.getTransactions(tenant_id);
    const toSettle = transactions.filter(
      (t) =>
        dto.transactionIds.includes(t.id) &&
        t.paymentStatus === "PAID"
    );

    if (toSettle.length === 0) return { settledCount: 0 };

    let settledCount = 0;
    for (const tx of toSettle) {
      // 1. Final Fee and Net Calculation
      const realizedFee = tx.platformFeePending || 0;
      const gatewayFee = tx.gatewayFee || 0;
      const totalAmount = Number(tx.amount);
      const settledAmount = totalAmount - gatewayFee; // What actually reaches the bank

      // 2. Perform Fee Realization
      await this.repository.updateTransactionStatus(
        tenant_id,
        tx.id,
        { 
          status: "SETTLED",
          platform_fee_pending: 0,
          platform_fee_realized: realizedFee,
        },
        actor_id,
      );

      // Insert into Fee Ledger (Officialized Revenue)
      if (realizedFee > 0) {
        await this.repository.createPlatformFeeLedger(
          tenant_id,
          tx.id,
          realizedFee,
          tx.provider || "MANUAL"
        );
      }

      // 3. ASYNC FINANCE LEDGER INTEGRATION
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
          accountCode: "1002", // POS Gateway Clearing (AR)
          debit: 0,
          credit: totalAmount, // Credit the full gross amount
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

      await this.financeRepository.createJournal(tenant_id, {
        ref: `BATCH-${tx.id.substring(0, 8)}`,
        description: `${tx.method} Batch Settlement for ${tx.externalReference || tx.id}`,
        lines,
      });

      settledCount++;
    }

    return { settledCount };
  }

  async getProviders(tenant_id: string) {
    return this.repository.getProviders(tenant_id);
  }

  async updateProviderStatus(
    tenant_id: string,
    providerId: string,
    dto: UpdateProviderStatusDto,
    actor_id: string,
  ) {
    return this.repository.updateProviderStatus(
      tenant_id,
      providerId,
      dto,
      actor_id,
    );
  }

  async runProviderHealthSweep(tenant_id: string, actor_id: string) {
    return this.repository.runProviderHealthSweep(tenant_id, actor_id);
  }

  async getRoutingPolicies(tenant_id: string) {
    return this.repository.getRoutingPolicies(tenant_id);
  }

  async getDevices(tenant_id: string) {
    return this.repository.getDevices(tenant_id);
  }

  async getDevicePools(tenant_id: string) {
    return this.repository.getDevicePools(tenant_id);
  }

  async updateDeviceStatus(
    tenant_id: string,
    device_id: string,
    dto: UpdateDeviceStatusDto,
    actor_id: string,
  ) {
    return this.repository.updateDeviceStatus(tenant_id, device_id, dto, actor_id);
  }

  async getRefunds(tenant_id: string) {
    return this.repository.getRefunds(tenant_id);
  }

  async createRefund(tenant_id: string, dto: CreateRefundDto, actor_id: string) {
    return this.repository.createRefund(tenant_id, dto, actor_id);
  }

  async approveRefund(tenant_id: string, refundId: string, actor_id: string) {
    return this.repository.approveRefund(tenant_id, refundId, actor_id);
  }

  async executeRefund(tenant_id: string, refundId: string, actor_id: string) {
    return this.repository.executeRefund(tenant_id, refundId, actor_id);
  }

  async getDisputes(tenant_id: string) {
    return this.repository.getDisputes(tenant_id);
  }

  async createDispute(
    tenant_id: string,
    dto: CreateDisputeDto,
    actor_id: string,
  ) {
    return this.repository.createDispute(tenant_id, dto, actor_id);
  }

  async attachDisputeEvidence(
    tenant_id: string,
    disputeId: string,
    dto: AttachDisputeEvidenceDto,
    actor_id: string,
  ) {
    return this.repository.attachDisputeEvidence(
      tenant_id,
      disputeId,
      dto,
      actor_id,
    );
  }

  async progressDispute(
    tenant_id: string,
    disputeId: string,
    dto: ProgressDisputeDto,
    actor_id: string,
  ) {
    return this.repository.progressDispute(tenant_id, disputeId, dto, actor_id);
  }

  async resolveDispute(
    tenant_id: string,
    disputeId: string,
    dto: ResolveDisputeDto,
    actor_id: string,
  ) {
    return this.repository.resolveDispute(tenant_id, disputeId, dto, actor_id);
  }

  async getChargebacks(tenant_id: string) {
    return this.repository.getChargebacks(tenant_id);
  }

  async getSettlements(tenant_id: string) {
    return this.repository.getSettlements(tenant_id);
  }

  async getEvidencePacks(tenant_id: string) {
    return this.repository.getEvidencePacks(tenant_id);
  }

  async getAuditEvents(tenant_id: string) {
    return this.repository.getAuditEvents(tenant_id);
  }

  // Unified Gateway & Settings
  async getPaymentSettings(tenant_id: string) {
    return this.repository.getPaymentSettings(tenant_id);
  }

  async updatePaymentSettings(tenant_id: string, data: any) {
    return this.repository.updatePaymentSettings(tenant_id, data);
  }

  async getPaymentStatus(tenant_id: string) {
    const configuredProviders: string[] = [];
    if (await this.stripeAdapter.isAvailable(tenant_id)) configuredProviders.push("STRIPE");
    if (await this.xenditAdapter.isAvailable(tenant_id)) configuredProviders.push("XENDIT");
    if (await this.midtransAdapter.isAvailable(tenant_id)) configuredProviders.push("MIDTRANS");

    // Filter by circuit breaker
    const availableProviders = configuredProviders.filter(p => {
      const cb = this.circuitBreakers.get(p);
      if (!cb) return true;
      const is_open = cb.failure_count >= this.FAILURE_THRESHOLD && (Date.now() - cb.last_failure_at < this.CB_COOLDOWN_MS);
      return !is_open;
    });

    const is_total_outage = configuredProviders.length > 0 && availableProviders.length === 0;

    return {
      cash: true, // Always available
      edc: true,  // Always available manually
      gateway: availableProviders.length > 0,
      available_providers: availableProviders,
      reason: is_total_outage ? "Gateway temporarily unavailable due to upstream connectivity issues" : undefined,
    };
  }

  /**
   * Non-blocking Cash Payment
   */
  async processCash(
    tenant_id: string,
    dto: CreatePaymentTransactionDto,
    actor_id: string,
  ) {
    const transaction = await this.repository.createTransaction(
      tenant_id,
      {
        ...dto,
        method: "CASH",
        provider: "MANUAL",
      },
      actor_id,
    );

    // Cash is immediately "paid" upon staff confirmation
    return this.repository.updateTransactionStatus(
      tenant_id,
      transaction.id,
      {
        status: "PAID",
        net_amount: dto.amount,
      },
      actor_id,
    );
  }

  /**
   * Non-blocking EDC Confirmation
   */
  async confirmEDC(
    tenant_id: string,
    dto: CreatePaymentTransactionDto,
    actor_id: string,
  ) {
    const transaction = await this.repository.createTransaction(
      tenant_id,
      {
        ...dto,
        method: "EDC",
        provider: "MANUAL",
      },
      actor_id,
    );

    // EDC is considered paid once the staff enters the trace number
    return this.repository.updateTransactionStatus(
      tenant_id,
      transaction.id,
      {
        status: "PAID",
        external_ref: dto.externalRef,
        net_amount: dto.amount,
      },
      actor_id,
    );
  }

  /**
   * Unified Generic Gateway Payment
   */
  async createGatewayPayment(
    tenant_id: string,
    dto: CreatePaymentTransactionDto,
    actor_id: string,
  ) {
    const settings = await this.getPaymentSettings(tenant_id);
    const provider = dto.provider || "STRIPE";
    
    // Gateway Fallback Check
    if (provider !== "MANUAL") {
       const status = await this.getPaymentStatus(tenant_id);
       if (!status.gateway || !status.available_providers.includes(provider)) {
         throw new Error(`Gateway ${provider} is currently unavailable for tenant ${tenant_id}`);
       }
    }

    const adapter = this.getAdapter(provider);

    // Calculate Fees (1% Zenvix Fee)
    const zenvixFee = Math.floor(dto.amount * 0.01);
    const feeAbsorbedBy = settings.fee_absorption_mode || "MERCHANT";

    const transaction = await this.repository.createTransaction(
      tenant_id,
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
        tenant_id,
        order_id: transaction.id, 
        application_fee_amount: zenvixFee,
      });

      // Update with External Ref 
      await this.repository.updateTransactionStatus(
        tenant_id,
        transaction.id,
        {
          status: "PENDING",
          external_ref: gatewayResult.transaction_id || gatewayResult.client_secret || "", 
          platform_fee_pending: zenvixFee, // Hardened: Track as pending
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

  /**
   * Universal Webhook Handler (via Adapters)
   */
  async handleGatewayWebhookPayload(
    provider: string,
    payload: any,
    signature: string,
  ) {
    const adapter = this.getAdapter(provider);
    
    // Abstracted parsing & verification
    const result = await adapter.handleWebhook(
      payload, 
      signature, 
      process.env[`${provider.toUpperCase()}_WEBHOOK_SECRET`]
    );

    // Provide a generic fallback event id. Real providers send specific event IDs.
    const event_id = result.raw_event?.id || result.raw_event?.event_id || result.external_ref;

    // Idempotency check with Repository Event Logger
    const isNewEvent = await this.repository.checkAndInsertWebhookEvent(event_id, provider, payload);
    if (!isNewEvent) {
      console.warn(`[PaymentWebhook] Ignored duplicate event ${event_id} from ${provider}`);
      return;
    }

    const tenant_id = result.raw_event?.data?.object?.metadata?.tenant_id || "zenvix"; 
    
    const transactions = await this.repository.getTransactions(tenant_id);
    const tx = transactions.find((t) => t.externalRef === result.external_ref || t.id === result.external_ref);

    if (!tx || tx.paymentStatus === "PAID") return; 

    return this.syncTransactionStatus(tenant_id, tx.id, {
      status: result.status,
      gateway_fee: result.gateway_fee,
      net_amount: result.net_amount,
    }, provider, "webhook");
  }

  /**
   * Unified transaction status synchronizer
   */
  async syncTransactionStatus(
    tenant_id: string,
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
    const transactions = await this.repository.getTransactions(tenant_id);
    const tx = transactions.find((t) => t.id === transaction_id);
    if (!tx) return;

    // HARDENED: State Machine Enforcement
    PaymentStateMachine.validate(tx.paymentStatus || "PENDING", data.status);

    // Idempotency: Avoid double processing
    if (tx.paymentStatus === data.status) {
      return tx;
    }

    // MANDATORY: Full Financial Reversal for Refunds
    if (data.status === "REFUNDED") {
      const accountCode = tx.method === "CASH" ? "1000" : "1001";
      const totalAmount = Number(tx.amount);
      const feeAmount = tx.platformFeeRealized ? Number(tx.platformFeeRealized) : 0;
      const netReversal = totalAmount - feeAmount;

      await this.financeRepository.createJournal(tenant_id, {
        ref: `REV-${tx.id.substring(0, 8)}`,
        description: `Full Refund Reversal [${tx.method}] - Gross: ${totalAmount}, Platform: ${feeAmount}`,
        lines: [
          {
            accountCode: "4100", // Sales Returns
            debit: totalAmount,
            credit: 0,
            description: "Gross Revenue Reversal (DR 4100)",
          },
          {
            accountCode: accountCode, // 1000/1001 Cash/Bank
            debit: 0,
            credit: netReversal,
            description: "Cash/Bank Outflow Reversal",
          },
          ...(feeAmount > 0
            ? [
                {
                  accountCode: "4000-PLT", // Platform Revenue
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
      tenant_id,
      tx.id,
      data,
      actor_id,
    );

    return updated;
  }

  /**
   * Universal Refund Handler
   */
  async refundPayment(tenant_id: string, transaction_id: string, actor_id: string) {
    const transactions = await this.repository.getTransactions(tenant_id);
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
      await this.syncTransactionStatus(tenant_id, tx.id, { status: "REFUNDED" }, providerName, actor_id);
      return { success: true, method: tx.method };
    }

    throw new Error("Unable to refund given transaction state");
  }

  // --- OBSERVABILITY ---

  /**
   * Get health of all payment providers (Circuit Breaker states)
   */
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

  /**
   * Get overall payment statistics for management
   */
  async getPaymentStats(tenant_id: string) {
    const transactions = await this.repository.getTransactions(tenant_id);
    
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
      if (stats.counts[status] !== undefined) {
        stats.counts[status]++;
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
