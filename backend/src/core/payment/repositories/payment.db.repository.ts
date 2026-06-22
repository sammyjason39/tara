import { TenantContext } from "../../../gateway/tenant-context.interface";
import { MultiTenancyUtil, ScopeLike } from "../../../shared/utils/multi-tenancy.util";
import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { BadRequestException, NotFoundException } from "../../_shared";
import {
  payment_transactions as PrismaTransaction,
  payment_providers as PrismaProvider,
  payment_routing_policies as PrismaRoutingPolicy,
  payment_pos_devices as PrismaPosDevice,
  payment_refunds as PrismaRefund,
  payment_disputes as PrismaDispute,
  payment_chargebacks as PrismaChargeback,
  payment_settlements as PrismaSettlement,
  payment_evidence_packs as PrismaEvidencePack,
  payment_audit_events as PrismaAuditEvent,
} from "@prisma/client";
import { v4 as uuidv4 } from "uuid";
import { PrismaService } from "../../../persistence/prisma.service";
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
import { PaymentTransaction } from "../entities/payment-transaction.entity";
import {
  IPaymentRepository,
  PaymentDashboard,
} from "./payment.repository.interface";
import { defineFieldMap } from "../../common";

/**
 * `payment_transactions` writable columns sourced from the inbound
 * {@link CreatePaymentTransactionDto}. The remaining columns (`id`, `tenant_id`,
 * `status`, `created_by`, `payment_status`, the platform-fee fields, …) are bound
 * explicitly by the repository rather than from the DTO.
 *
 * `provider` is intentionally excluded: the DTO carries a provider *name*
 * ("STRIPE" | "MANUAL") used only to select a gateway adapter, not the
 * `provider_id` FK column, so it is declared as a known non-column field and
 * dropped rather than rejected. `idempotency_key` is computed/handled explicitly
 * below and is likewise ignored by the map.
 */
const PAYMENT_TRANSACTION_COLUMNS = [
  "external_reference",
  "external_ref",
  "type",
  "amount",
  "currency",
  "destination",
  "source",
  "channel",
  "method",
] as const;

/**
 * Explicit DTO-to-column mapping for payment-transaction creation
 * (Requirements 5.1–5.4): each supplied field binds to exactly the schema column
 * its name deterministically resolves to, and any field that resolves to no
 * column rejects the whole request, naming the field and persisting nothing.
 */
const mapTransactionToColumns = defineFieldMap({
  columns: PAYMENT_TRANSACTION_COLUMNS,
  ignore: ["provider", "idempotency_key"],
});

/**
 * Payment_Lifecycle transition guards (Requirements 12.3, 12.4, 12.7, 12.8,
 * 12.9, 12.10, 4.6, 4.7).
 *
 * The persisted `status` columns use upper-snake values. The transaction
 * lifecycle is REQUEST_CREATED → APPROVED → PROVIDER_SELECTED (route) →
 * SETTLEMENT_PENDING (execute) → SETTLED, with REJECTED reachable from the
 * request state and FAILED reachable from execution; the refund lifecycle is
 * REQUESTED → APPROVED → SETTLED; the dispute lifecycle is OPENED → (in-progress)
 * → RESOLVED. Every transition reads the entity's CURRENT state inside the
 * Atomic_Operation BEFORE any write and validates it against the legal source
 * states for the requested edge. An illegal transition is rejected with a
 * `BadRequestException` that names the current and target state, and because the
 * throw happens before any write nothing is persisted and the entity is left
 * unchanged (Requirements 12.4, 12.8, 12.10, 4.7).
 */

/** Legacy request-state alias persisted by older rows, treated like REQUEST_CREATED. */
const TXN_REQUEST_STATES = new Set(["REQUEST_CREATED", "APPROVAL_PENDING"]);
/** A transaction may be approved/rejected only while awaiting approval. */
const TXN_ROUTE_FROM = "APPROVED";
const TXN_EXECUTE_FROM = "PROVIDER_SELECTED";
const TXN_SETTLE_FROM = "SETTLEMENT_PENDING";
/** A refund may be approved only from REQUESTED and executed only from APPROVED. */
const REFUND_APPROVE_FROM = "REQUESTED";
const REFUND_EXECUTE_FROM = "APPROVED";
/** Terminal dispute states — no progress or resolve transition is legal from these. */
const DISPUTE_TERMINAL_STATES = new Set(["RESOLVED", "REJECTED"]);

/** Normalise a persisted/requested state value to its canonical upper form. */
function normPaymentState(value: unknown): string {
  return String(value ?? "").toUpperCase();
}

/**
 * Build the standard invalid-transition error naming the entity, its current
 * state, and the rejected target state (Requirements 12.4, 12.8, 12.10).
 */
function invalidPaymentTransition(
  entity: string,
  id: string,
  current: string,
  target: string,
): BadRequestException {
  return new BadRequestException(
    `Invalid Payment_Lifecycle transition for ${entity} '${id}': ` +
      `cannot transition from '${current}' to '${target}'.`,
  );
}

@Injectable()
export class PaymentDbRepository implements IPaymentRepository {
  constructor(private readonly prisma: PrismaService) {}

  private checksum(input: string) {
    let hash = 0;
    for (let i = 0; i < input.length; i += 1) {
      hash = (hash << 5) - hash + input.charCodeAt(i);
      hash |= 0;
    }
    return `chk-${Math.abs(hash).toString(16)}`;
  }

  private async addAudit(ctx: TenantContext,
    actor_id: string,
    action: string,
    entity_type: string,
    entity_id: string,
    detail: string,
    tx?: Prisma.TransactionClient,
  ) {
    const client = tx ?? this.prisma;
    await client.payment_audit_events.create({
      data: {
        id: uuidv4(),
        // Only tenant_id is valid here; getScope() injected branch_id/location_id (not
        // columns) which 500-ed the payment audit insert during checkout.
        tenant_id: ctx.tenant_id,
        actor_id: actor_id,
        action,
        entity_type: entity_type,
        entity_id: entity_id,
        detail,
      },
    });
  }

  async getDashboard(ctx: ScopeLike): Promise<PaymentDashboard> {
    const now = new Date();
    const startOfDay = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    );

    const scope = MultiTenancyUtil.getScope(ctx);

    const settledToday = await this.prisma.payment_transactions.count({
      where: {
        ...scope,
        status: "SETTLED",
        updated_at: { gte: startOfDay },
      },
    });

    const pendingApprovals = await this.prisma.payment_transactions.count({
      where: {
        ...scope,
        // A newly created transaction is now persisted in the REQUEST state
        // (`REQUEST_CREATED`, Requirement 12.1); both it and any legacy
        // `APPROVAL_PENDING` rows are awaiting approval.
        status: { in: ["REQUEST_CREATED", "APPROVAL_PENDING"] },
      },
    });

    const executingPayments = await this.prisma.payment_transactions.count({
      where: { ...scope, status: "EXECUTING" },
    });

    const settlementPending = await this.prisma.payment_transactions.count({
      where: { ...scope, status: "SETTLEMENT_PENDING" },
    });

    const failedTransactions = await this.prisma.payment_transactions.count({
      where: { ...scope, status: "FAILED" },
    });

    const openDisputes = await this.prisma.payment_disputes.count({
      where: {
        ...scope,
        status: { notIn: ["RESOLVED", "REJECTED"] },
      },
    });

    const openChargebacks = await this.prisma.payment_chargebacks.count({
      where: {
        ...scope,
        status: { notIn: ["WON", "LOST"] },
      },
    });

    const refundPending = await this.prisma.payment_refunds.count({
      where: {
        ...scope,
        status: { notIn: ["SETTLED", "REJECTED", "FAILED"] },
      },
    });

    return {
      pendingApprovals,
      executingPayments,
      settlementPending,
      settledToday,
      failedTransactions,
      openDisputes,
      openChargebacks,
      refundPending,
    };
  }

  async getTransactions(ctx: ScopeLike): Promise<PaymentTransaction[]> {
    const txs = await this.prisma.payment_transactions.findMany({
      where: MultiTenancyUtil.getScope(ctx),
      include: { payment_retry_attempts: true },
      orderBy: { created_at: "desc" },
    });
    return txs.map((tx: PrismaTransaction) => this.mapTransaction(tx));
  }

  async createTransaction(ctx: TenantContext,
    dto: CreatePaymentTransactionDto,
    actor_id: string,
  ): Promise<PaymentTransaction> {
    const key =
      dto.idempotency_key ??
      this.checksum(
        `${ctx.tenant_id}|${dto.type}|${dto.amount}|${dto.destination}|${dto.externalReference ?? ""}`,
      );

    const existing = await this.prisma.payment_transactions.findUnique({
      where: { idempotency_key: key },
    });
    if (existing) return this.mapTransaction(existing as PrismaTransaction);

    // Explicit, deterministic DTO-to-column mapping (Requirements 5.1–5.4): an
    // unknown field rejects the request before any write, so the count of
    // persisted values equals the count of supplied mappable values.
    const mapped = mapTransactionToColumns(
      dto as unknown as Record<string, unknown>,
    ) as Record<string, any>;

    const created = await this.prisma.payment_transactions.create({
      data: {
        ...mapped,
        id: uuidv4(),
        // payment_transactions only carries tenant_id + (optional) company_id. Using the
        // full getScope() here injected branch_id/location_id, which are not columns on this
        // model -> PrismaClientValidationError that 500-ed POS checkout's payment step.
        tenant_id: ctx.tenant_id,
        currency: dto.currency ?? "IDR",
        channel: dto.channel ?? "BANK_TRANSFER",
        method: dto.method ?? "GATEWAY",
        idempotency_key: key,
        // Requirement 12.1: a newly created transaction is persisted in the
        // REQUEST state (schema default `REQUEST_CREATED`) — the entry point of
        // the Payment_Lifecycle (REQUEST → APPROVED → ROUTED → EXECUTED →
        // SETTLED). The previous `APPROVAL_PENDING` skipped the request state.
        status: "REQUEST_CREATED",
        created_by: actor_id,
        payment_status: "PENDING",
        platform_fee_pending: 0,
        platform_fee_realized: 0,
      } as any,
    });

    await this.addAudit(
      ctx,
      actor_id,
      "request.created",
      "TRANSACTION",
      created.id,
      created.type,
    );
    return this.mapTransaction(created as PrismaTransaction);
  }

  async approveTransaction(ctx: TenantContext,
    paymentId: string,
    actor_id: string,
    tx?: Prisma.TransactionClient,
  ): Promise<PaymentTransaction> {
    const client = tx ?? this.prisma;
    // Read the CURRENT state inside the Atomic_Operation, scoped by tenant_id,
    // BEFORE any write (Requirements 12.3, 12.4, 4.6, 4.7).
    const payment = await client.payment_transactions.findFirst({
      where: { id: paymentId, tenant_id: ctx.tenant_id },
    });
    if (!payment) throw new NotFoundException("Payment not found");

    const current = normPaymentState(payment.status);
    // A transaction may be approved only from the request state.
    if (!TXN_REQUEST_STATES.has(current)) {
      throw invalidPaymentTransition("transaction", paymentId, current, "APPROVED");
    }

    const updated = await client.payment_transactions.update({
      where: { id: paymentId },
      data: {
        status: "APPROVED",
        approved_by: actor_id,
        approved_at: new Date(),
      },
    });
    await this.addAudit(
      ctx,
      actor_id,
      "request.approved",
      "TRANSACTION",
      updated.id,
      "APPROVED",
      client as Prisma.TransactionClient,
    );
    return this.mapTransaction(updated);
  }

  async rejectTransaction(ctx: TenantContext,
    paymentId: string,
    actor_id: string,
    tx?: Prisma.TransactionClient,
  ): Promise<PaymentTransaction> {
    const client = tx ?? this.prisma;
    // Read the CURRENT state inside the Atomic_Operation, scoped by tenant_id,
    // BEFORE any write (Requirements 12.3, 12.4, 4.6, 4.7).
    const payment = await client.payment_transactions.findFirst({
      where: { id: paymentId, tenant_id: ctx.tenant_id },
    });
    if (!payment) throw new NotFoundException("Payment not found");

    const current = normPaymentState(payment.status);
    // A transaction may be rejected only from the request state.
    if (!TXN_REQUEST_STATES.has(current)) {
      throw invalidPaymentTransition("transaction", paymentId, current, "REJECTED");
    }

    const updated = await client.payment_transactions.update({
      where: { id: paymentId },
      data: {
        status: "REJECTED",
        approved_by: actor_id,
        approved_at: new Date(),
      },
    });
    await this.addAudit(
      ctx,
      actor_id,
      "request.rejected",
      "TRANSACTION",
      updated.id,
      "REJECTED",
      client as Prisma.TransactionClient,
    );
    return this.mapTransaction(updated);
  }

  async routeTransaction(ctx: TenantContext,
    paymentId: string,
    dto: RoutePaymentDto,
    actor_id: string,
    tx?: Prisma.TransactionClient,
  ): Promise<PaymentTransaction> {
    const client = tx ?? this.prisma;
    // Composite-key read of the CURRENT state inside the Atomic_Operation,
    // scoped by tenant_id, BEFORE any write (Requirements 12.3, 12.4, 4.5, 4.6).
    const payment = await client.payment_transactions.findFirst({
      where: { id: paymentId, tenant_id: ctx.tenant_id },
    });
    if (!payment) throw new NotFoundException("Payment not found");

    const current = normPaymentState(payment.status);
    // Routing (provider selection) is legal only from the APPROVED state.
    if (current !== TXN_ROUTE_FROM) {
      throw invalidPaymentTransition(
        "transaction",
        paymentId,
        current,
        "PROVIDER_SELECTED",
      );
    }

    let providerId = dto.providerId;
    if (!providerId) {
      const policy = await client.payment_routing_policies.findFirst({
        where: { tenant_id: ctx.tenant_id, enabled: true },
      });
      if (!policy) throw new BadRequestException("No active routing policy");
      if (policy.priorities.length > 0) providerId = (policy.priorities as string[])[0];
    }

    if (!providerId) throw new BadRequestException("No provider available");

    const updated = await client.payment_transactions.update({
      where: { id: paymentId },
      data: {
        provider_id: providerId,
        status: "PROVIDER_SELECTED",
      },
    });

    await this.addAudit(
      ctx,
      actor_id,
      "provider.selected",
      "ROUTING",
      updated.id,
      providerId,
      client as Prisma.TransactionClient,
    );
    return this.mapTransaction(updated);
  }

  async executeTransaction(ctx: TenantContext,
    paymentId: string,
    dto: ExecutePaymentDto,
    actor_id: string,
    tx?: Prisma.TransactionClient,
  ): Promise<PaymentTransaction> {
    const client = tx ?? this.prisma;
    // Composite-key read of the CURRENT state inside the Atomic_Operation,
    // scoped by tenant_id, BEFORE any write (Requirements 12.3, 12.4, 4.5, 4.6).
    const payment = await client.payment_transactions.findFirst({
      where: { id: paymentId, tenant_id: ctx.tenant_id },
    });
    if (!payment) throw new NotFoundException("Payment not found");

    const current = normPaymentState(payment.status);
    // Execution is legal only from the routed (provider-selected) state. The
    // edge resolves to SETTLEMENT_PENDING on success or FAILED on a forced
    // failure; both targets are reachable only from PROVIDER_SELECTED.
    if (current !== TXN_EXECUTE_FROM) {
      throw invalidPaymentTransition(
        "transaction",
        paymentId,
        current,
        dto.forceFail ? "FAILED" : "SETTLEMENT_PENDING",
      );
    }

    const success = !dto.forceFail;

    if (!success) {
      const updated = await client.payment_transactions.update({
        where: { id: paymentId },
        data: {
          status: "FAILED",
          payment_retry_attempts: {
            create: {
              tenant_id: ctx.tenant_id,
              company_id: ctx.company_id ?? null,
              id: uuidv4(),
              attempt: 1,
              result: "FAILED",
              provider_id: payment.provider_id!,
            },
          },
        },
      });
      await this.addAudit(
        ctx,
        actor_id,
        "execution.failed",
        "TRANSACTION",
        updated.id,
        "Simulated Failure",
        client as Prisma.TransactionClient,
      );
      return this.mapTransaction(updated as PrismaTransaction);
    }

    const settlement = await client.payment_settlements.create({
      data: {
        id: uuidv4(),
        tenant_id: ctx.tenant_id,
        company_id: ctx.company_id ?? null,
        payment_id: paymentId,
        provider_reference: `${payment.provider_id}-${Date.now()}`,
        status: "PENDING",
      },
    });

    const updated = await client.payment_transactions.update({
      where: { id: paymentId },
      data: {
        status: "SETTLEMENT_PENDING",
        settlement_id: settlement.id,
        payment_retry_attempts: {
          create: {
            tenant_id: ctx.tenant_id,
            company_id: ctx.company_id ?? null,
            id: uuidv4(),
            attempt: 1,
            result: "SUCCESS",
            provider_id: payment.provider_id!,
          },
        },
      },
    });

    await this.addAudit(
      ctx,
      actor_id,
      "execution.sent",
      "TRANSACTION",
      updated.id,
      settlement.provider_reference,
      client as Prisma.TransactionClient,
    );
    return this.mapTransaction(updated);
  }

  async settleTransaction(ctx: TenantContext,
    paymentId: string,
    actor_id: string,
    tx?: Prisma.TransactionClient,
  ): Promise<PaymentTransaction> {
    const client = tx ?? this.prisma;
    // Composite-key read of the CURRENT state inside the Atomic_Operation,
    // scoped by tenant_id, BEFORE any write (Requirements 12.3, 12.4, 4.5, 4.6).
    const payment = await client.payment_transactions.findFirst({
      where: { id: paymentId, tenant_id: ctx.tenant_id },
    });
    if (!payment) throw new NotFoundException("Payment not found");

    const current = normPaymentState(payment.status);
    // Settlement is legal only from the executed (settlement-pending) state.
    // NOTE: the Finance settlement record is wired in task 10.4; this method
    // makes the state transition atomic and validated only.
    if (current !== TXN_SETTLE_FROM) {
      throw invalidPaymentTransition("transaction", paymentId, current, "SETTLED");
    }
    if (!payment.settlement_id) throw new NotFoundException("Settlement not found");

    const settlement = await client.payment_settlements.update({
      where: { id: payment.settlement_id },
      data: {
        status: "CONFIRMED",
        confirmed_at: new Date(),
      },
    });

    const evidence = await client.payment_evidence_packs.create({
      data: {
        id: uuidv4(),
        tenant_id: ctx.tenant_id,
        company_id: ctx.company_id ?? null,
        payment_id: paymentId,
        provider_proof: settlement.provider_reference,
        approval_signatures: [payment.created_by, actor_id],
        checksum: this.checksum(settlement.provider_reference),
        payload: JSON.stringify({ settlementId: settlement.id }),
      },
    });

    const updated = await client.payment_transactions.update({
      where: { id: paymentId },
      data: {
        status: "SETTLED",
        evidence_pack_id: evidence.id,
        ledger_sync_triggered_at: new Date(),
      },
    });

    await this.addAudit(
      ctx,
      actor_id,
      "settlement.confirmed",
      "SETTLEMENT",
      settlement.id,
      "Sync Triggered",
      client as Prisma.TransactionClient,
    );
    return this.mapTransaction(updated);
  }

  async getProviders(ctx: ScopeLike): Promise<PaymentProvider[]> {
    const providers = await this.prisma.payment_providers.findMany({
      where: MultiTenancyUtil.getScope(ctx),
    });
    return providers.map((p: PrismaProvider) => ({
      id: p.id,
      tenant_id: p.tenant_id,
      name: p.name,
      channels: p.channels as any,
      status: p.status as any,
      max_amount_per_txn: Number(p.max_amount_per_txn),
      settlement_sla_hours: p.settlement_sla_hours,
      priority: p.priority,
      lastHeartbeatAt: p.last_heartbeat_at || undefined,
    }));
  }

  async updateProviderStatus(ctx: TenantContext,
    providerId: string,
    dto: UpdateProviderStatusDto,
    actor_id: string,
  ): Promise<PaymentProvider> {
    const updated = await this.prisma.payment_providers.update({
      where: { id: providerId, tenant_id: ctx.tenant_id },
      data: { status: dto.status, last_heartbeat_at: new Date() },
    });
    await this.addAudit(
      ctx,
      actor_id,
      "provider.status_changed",
      "ROUTING",
      updated.id,
      dto.status,
    );
    return {
      id: updated.id,
      tenant_id: updated.tenant_id,
      name: updated.name,
      status: updated.status as any,
      channels: updated.channels as any,
      max_amount_per_txn: Number(updated.max_amount_per_txn),
      settlement_sla_hours: updated.settlement_sla_hours,
      priority: updated.priority,
      lastHeartbeatAt: updated.last_heartbeat_at || undefined,
    };
  }

  async runProviderHealthSweep(ctx: TenantContext,
    actor_id: string,
  ): Promise<PaymentProvider[]> {
    await this.prisma.payment_providers.updateMany({
      where: { ...MultiTenancyUtil.getScope(ctx), status: "DOWN" },
      data: { status: "DEGRADED", last_heartbeat_at: new Date() },
    });

    const providers = await this.prisma.payment_providers.findMany({
      where: MultiTenancyUtil.getScope(ctx),
    });
    await this.addAudit(
      ctx,
      actor_id,
      "provider.health_sweep",
      "ROUTING",
      "ALL",
      "Sweep Completed",
    );

    return providers.map((p: PrismaProvider) => ({
      id: p.id,
      tenant_id: p.tenant_id,
      name: p.name,
      channels: p.channels as any,
      status: p.status as any,
      max_amount_per_txn: Number(p.max_amount_per_txn),
      settlement_sla_hours: p.settlement_sla_hours,
      priority: p.priority,
      lastHeartbeatAt: p.last_heartbeat_at || undefined,
    }));
  }

  async getRoutingPolicies(ctx: ScopeLike): Promise<PaymentRoutingPolicy[]> {
    const policies = await this.prisma.payment_routing_policies.findMany({
      where: MultiTenancyUtil.getScope(ctx),
    });
    return policies.map((p: PrismaRoutingPolicy) => ({
      id: p.id,
      tenant_id: p.tenant_id,
      name: p.name,
      enabled: p.enabled,
      priorities: p.priorities as string[],
      fallbackProviders: p.fallback_providers as string[],
      maxRetries: p.max_retries,
      exponentialBackoffSeconds: p.exponential_backoff_seconds,
      created_at: p.created_at,
      updated_at: p.updated_at,
    }));
  }

  async getDevices(ctx: ScopeLike): Promise<PaymentDevice[]> {
    const devices = await this.prisma.payment_pos_devices.findMany({
      where: MultiTenancyUtil.getScope(ctx),
    });
    return devices.map((d: PrismaPosDevice) => ({
      id: d.id,
      tenant_id: d.tenant_id,
      location: d.location_id,
      deviceCode: d.device_code,
      approved: d.approved,
      status: d.status as any,
      providerId: d.provider_id,
      lastUsedAt: d.last_used_at || undefined,
    }));
  }

  async getDevicePools(ctx: ScopeLike): Promise<PaymentDevicePool[]> {
    return [];
  }

  async updateDeviceStatus(ctx: TenantContext,
    device_id: string,
    dto: UpdateDeviceStatusDto,
    actor_id: string,
  ): Promise<PaymentDevice> {
    const updated = await this.prisma.payment_pos_devices.update({
      where: { id: device_id, tenant_id: ctx.tenant_id },
      data: { status: dto.status },
    });
    await this.addAudit(
      ctx,
      actor_id,
      "device.status_changed",
      "DEVICE",
      updated.id,
      dto.status,
    );

    return {
      id: updated.id,
      tenant_id: updated.tenant_id,
      location: updated.location_id,
      deviceCode: updated.device_code,
      approved: updated.approved,
      status: updated.status as any,
      providerId: updated.provider_id,
      lastUsedAt: updated.last_used_at || undefined,
    };
  }

  async getRefunds(ctx: ScopeLike): Promise<PaymentRefund[]> {
    const refunds = await this.prisma.payment_refunds.findMany({
      where: MultiTenancyUtil.getScope(ctx),
    });
    return refunds.map((r: PrismaRefund) => this.mapRefund(r));
  }

  async createRefund(ctx: TenantContext,
    dto: CreateRefundDto,
    actor_id: string,
  ): Promise<PaymentRefund> {
    const created = await this.prisma.payment_refunds.create({
      data: {
        id: uuidv4(),
        ...MultiTenancyUtil.getScope(ctx),
        payment_id: dto.paymentId,
        type: dto.type,
        amount: dto.amount,
        reason: dto.reason,
        status: "REQUESTED",
        requested_by: actor_id,
        scheduled_at: dto.scheduledAt ? new Date(dto.scheduledAt) : undefined,
      },
    });
    await this.addAudit(
      ctx,
      actor_id,
      "refund.requested",
      "REFUND",
      created.id,
      created.type,
    );
    return this.mapRefund(created as PrismaRefund);
  }

  async approveRefund(ctx: TenantContext,
    refundId: string,
    actor_id: string,
    tx?: Prisma.TransactionClient,
  ): Promise<PaymentRefund> {
    const client = tx ?? this.prisma;
    // Read the CURRENT state inside the Atomic_Operation, scoped by tenant_id,
    // BEFORE any write (Requirements 12.7, 12.8, 4.6, 4.7).
    const refund = await client.payment_refunds.findFirst({
      where: { id: refundId, tenant_id: ctx.tenant_id },
    });
    if (!refund) throw new NotFoundException("Refund not found");

    const current = normPaymentState(refund.status);
    // A refund may be approved only from the requested (create) state.
    if (current !== REFUND_APPROVE_FROM) {
      throw invalidPaymentTransition("refund", refundId, current, "APPROVED");
    }

    const updated = await client.payment_refunds.update({
      where: { id: refundId },
      data: {
        status: "APPROVED",
        approved_by: actor_id,
      },
    });
    await this.addAudit(
      ctx,
      actor_id,
      "refund.approved",
      "REFUND",
      updated.id,
      "APPROVED",
      client as Prisma.TransactionClient,
    );
    return this.mapRefund(updated);
  }

  async executeRefund(ctx: TenantContext,
    refundId: string,
    actor_id: string,
    tx?: Prisma.TransactionClient,
  ): Promise<PaymentRefund> {
    const client = tx ?? this.prisma;
    // Read the CURRENT state inside the Atomic_Operation, scoped by tenant_id,
    // BEFORE any write (Requirements 12.7, 12.8, 4.6, 4.7).
    const refund = await client.payment_refunds.findFirst({
      where: { id: refundId, tenant_id: ctx.tenant_id },
    });
    if (!refund) throw new NotFoundException("Refund not found");

    const current = normPaymentState(refund.status);
    // A refund may be executed only from the approved state.
    if (current !== REFUND_EXECUTE_FROM) {
      throw invalidPaymentTransition("refund", refundId, current, "SETTLED");
    }

    const updated = await client.payment_refunds.update({
      where: { id: refundId },
      data: {
        status: "SETTLED",
        provider_reference: `RFD-${Date.now()}`,
      },
    });
    await this.addAudit(
      ctx,
      actor_id,
      "refund.settled",
      "REFUND",
      updated.id,
      updated.provider_reference!,
      client as Prisma.TransactionClient,
    );
    return this.mapRefund(updated);
  }

  async getDisputes(ctx: ScopeLike): Promise<PaymentDispute[]> {
    const disputes = await this.prisma.payment_disputes.findMany({
      where: MultiTenancyUtil.getScope(ctx),
    });
    return disputes.map((d: PrismaDispute) => this.mapDispute(d));
  }

  async createDispute(ctx: TenantContext,
    dto: CreateDisputeDto,
    actor_id: string,
  ): Promise<PaymentDispute> {
    const created = await this.prisma.payment_disputes.create({
      data: {
        id: uuidv4(),
        ...MultiTenancyUtil.getScope(ctx),
        payment_id: dto.paymentId,
        amount: dto.amount,
        reason: dto.reason,
        status: "OPENED",
        opened_by: actor_id,
      },
    });
    await this.addAudit(
      ctx,
      actor_id,
      "dispute.opened",
      "DISPUTE",
      created.id,
      created.reason,
    );
    return this.mapDispute(created as PrismaDispute);
  }

  async attachDisputeEvidence(ctx: TenantContext,
    disputeId: string,
    dto: AttachDisputeEvidenceDto,
    actor_id: string,
  ): Promise<PaymentDispute> {
    const dispute = await this.prisma.payment_disputes.findUnique({
      where: { id: disputeId, tenant_id: ctx.tenant_id },
    });
    if (!dispute) throw new Error("Dispute not found");

    const evidence = [...(dispute.evidence as string[]), dto.evidence];

    const updated = await this.prisma.payment_disputes.update({
      where: { id: disputeId },
      data: {
        evidence: evidence,
        status: "EVIDENCE_ATTACHED",
      },
    });
    await this.addAudit(
      ctx,
      actor_id,
      "dispute.evidence_attached",
      "DISPUTE",
      updated.id,
      dto.evidence,
    );
    return this.mapDispute(updated);
  }

  async progressDispute(ctx: TenantContext,
    disputeId: string,
    dto: ProgressDisputeDto,
    actor_id: string,
    tx?: Prisma.TransactionClient,
  ): Promise<PaymentDispute> {
    const client = tx ?? this.prisma;
    // Read the CURRENT state inside the Atomic_Operation, scoped by tenant_id,
    // BEFORE any write (Requirements 12.9, 12.10, 4.6, 4.7).
    const dispute = await client.payment_disputes.findFirst({
      where: { id: disputeId, tenant_id: ctx.tenant_id },
    });
    if (!dispute) throw new NotFoundException("Dispute not found");

    const current = normPaymentState(dispute.status);
    const target = normPaymentState(dto.status);
    // A dispute may be progressed only while it is still open / in progress; a
    // dispute that is already resolved (or rejected) is terminal and cannot be
    // progressed (rejected naming current+target, leaving it unchanged).
    if (DISPUTE_TERMINAL_STATES.has(current)) {
      throw invalidPaymentTransition("dispute", disputeId, current, target);
    }

    const updated = await client.payment_disputes.update({
      where: { id: disputeId },
      data: {
        status: dto.status,
        provider_case_id:
          dto.status === "provider_submitted"
            ? `CASE-${Date.now()}`
            : undefined,
      },
    });
    await this.addAudit(
      ctx,
      actor_id,
      "dispute.status_changed",
      "DISPUTE",
      updated.id,
      dto.status,
      client as Prisma.TransactionClient,
    );
    return this.mapDispute(updated);
  }

  async resolveDispute(ctx: TenantContext,
    disputeId: string,
    dto: ResolveDisputeDto,
    actor_id: string,
    tx?: Prisma.TransactionClient,
  ): Promise<PaymentDispute> {
    const client = tx ?? this.prisma;
    // Read the CURRENT state inside the Atomic_Operation, scoped by tenant_id,
    // BEFORE any write (Requirements 12.9, 12.10, 4.6, 4.7).
    const dispute = await client.payment_disputes.findFirst({
      where: { id: disputeId, tenant_id: ctx.tenant_id },
    });
    if (!dispute) throw new NotFoundException("Dispute not found");

    const current = normPaymentState(dispute.status);
    // A dispute may be resolved only from a non-terminal (open / in-progress)
    // state; resolving an already-resolved dispute is rejected naming
    // current+target, leaving it unchanged.
    if (DISPUTE_TERMINAL_STATES.has(current)) {
      throw invalidPaymentTransition("dispute", disputeId, current, "RESOLVED");
    }

    const updated = await client.payment_disputes.update({
      where: { id: disputeId },
      data: {
        status: "RESOLVED",
        resolution: dto.resolution,
      },
    });

    // The resolution and its resulting chargeback record are written on the
    // same transaction client so both commit together or neither (Req 12.9).
    const chargeback = await client.payment_chargebacks.create({
      data: {
        id: uuidv4(),
        tenant_id: ctx.tenant_id,
        company_id: ctx.company_id ?? null,
        payment_id: updated.payment_id,
        dispute_id: updated.id,
        amount: updated.amount,
        status: dto.resolution.toLowerCase() as any,
      },
    });

    await this.addAudit(
      ctx,
      actor_id,
      "dispute.resolved",
      "CHARGEBACK",
      chargeback.id,
      dto.resolution,
      client as Prisma.TransactionClient,
    );
    return this.mapDispute(updated);
  }

  async getChargebacks(ctx: ScopeLike): Promise<PaymentChargeback[]> {
    const chargebacks = await this.prisma.payment_chargebacks.findMany({
      where: MultiTenancyUtil.getScope(ctx),
    });
    return chargebacks.map((c: PrismaChargeback) => ({
      id: c.id,
      tenant_id: c.tenant_id,
      paymentId: c.payment_id,
      disputeId: c.dispute_id,
      amount: Number(c.amount),
      status: c.status as any,
      created_at: c.created_at,
      updated_at: c.updated_at,
    }));
  }

  async getSettlements(ctx: ScopeLike): Promise<PaymentSettlement[]> {
    const settlements = await this.prisma.payment_settlements.findMany({
      where: MultiTenancyUtil.getScope(ctx),
    });
    return settlements.map((s: PrismaSettlement) => ({
      id: s.id,
      tenant_id: s.tenant_id,
      paymentId: s.payment_id,
      providerReference: s.provider_reference,
      status: s.status as any,
      confirmedAt: s.confirmed_at || undefined,
      retryAttempts: s.retry_attempts
        ? typeof s.retry_attempts === "string"
          ? JSON.parse(s.retry_attempts)
          : s.retry_attempts
        : [],
      ledgerSyncTriggeredAt: s.ledger_sync_triggered_at || undefined,
      created_at: s.created_at,
      updated_at: s.updated_at,
    }));
  }

  async getEvidencePacks(ctx: ScopeLike): Promise<PaymentEvidencePack[]> {
    const packs = await this.prisma.payment_evidence_packs.findMany({
      where: MultiTenancyUtil.getScope(ctx),
    });
    return packs.map((e: PrismaEvidencePack) => ({
      id: e.id,
      tenant_id: e.tenant_id,
      paymentId: e.payment_id,
      providerProof: e.provider_proof,
      approvalSignatures: e.approval_signatures as string[],
      checksum: e.checksum,
      payload: e.payload,
      created_at: e.created_at,
    }));
  }

  async getAuditEvents(ctx: ScopeLike): Promise<PaymentAuditEvent[]> {
    const audits = await this.prisma.payment_audit_events.findMany({
      where: MultiTenancyUtil.getScope(ctx),
      orderBy: { created_at: "desc" },
    });
    return audits.map((a: PrismaAuditEvent) => ({
      id: a.id,
      tenant_id: a.tenant_id,
      actor_id: a.actor_id,
      action: a.action,
      entity_type: a.entity_type as any,
      entity_id: a.entity_id,
      detail: a.detail,
      created_at: a.created_at,
    }));
  }

  private mapTransaction(t: PrismaTransaction): PaymentTransaction {
    return {
      id: t.id,
      tenant_id: t.tenant_id,
      externalReference: t.external_reference || undefined,
      type: t.type as any,
      amount: Number(t.amount),
      currency: t.currency as any,
      destination: t.destination,
      source: t.source || undefined,
      channel: t.channel as any,
      idempotency_key: t.idempotency_key,
      status: t.status as any,
      method: t.method as any,
      provider: t.provider_id as any,
      paymentStatus: t.payment_status as any,
      externalRef: t.external_ref || undefined,
      platformFee: t.platform_fee ? Number(t.platform_fee) : undefined,
      gatewayFee: t.gateway_fee ? Number(t.gateway_fee) : undefined,
      netAmount: t.net_amount ? Number(t.net_amount) : undefined,
      feeAbsorbedBy: t.fee_absorbed_by as any,
      retryAttempts: (t as any).payment_retry_attempts || [],
      settlementId: t.settlement_id || undefined,
      evidencePackId: t.evidence_pack_id || undefined,
      ledgerSyncTriggeredAt: t.ledger_sync_triggered_at || undefined,
      createdBy: t.created_by,
      approvedBy: t.approved_by || undefined,
      approvedAt: t.approved_at || undefined,
      created_at: t.created_at,
      updated_at: t.updated_at,
    };
  }

  private mapRefund(r: PrismaRefund): PaymentRefund {
    return {
      id: r.id,
      tenant_id: r.tenant_id,
      paymentId: r.payment_id,
      type: r.type as any,
      amount: Number(r.amount),
      reason: r.reason,
      status: r.status as any,
      requested_by: r.requested_by,
      approvedBy: r.approved_by || undefined,
      scheduledAt: r.scheduled_at || undefined,
      providerReference: r.provider_reference || undefined,
      created_at: r.created_at,
      updated_at: r.updated_at,
    };
  }

  private mapDispute(d: PrismaDispute): PaymentDispute {
    return {
      id: d.id,
      tenant_id: d.tenant_id,
      paymentId: d.payment_id,
      reason: d.reason,
      amount: Number(d.amount),
      status: d.status as any,
      openedBy: d.opened_by,
      evidence: d.evidence as string[],
      providerCaseId: d.provider_case_id || undefined,
      resolution: (d.resolution as any) || undefined,
      created_at: d.created_at,
      updated_at: d.updated_at,
    };
  }

  async getPaymentSettings(ctx: ScopeLike): Promise<any> {
    let settings = await this.prisma.payment_settings.findUnique({
      where: { tenant_id: ctx.tenant_id },
    });

    if (!settings) {
      settings = await this.prisma.payment_settings.create({
        data: {
          tenant_id: ctx.tenant_id,
          fee_absorption_mode: "MERCHANT",
          is_gateway_active: false,
        },
      });
    }

    return settings;
  }

  async updatePaymentSettings(ctx: TenantContext, data: any): Promise<any> {
    return this.prisma.payment_settings.upsert({
      where: { tenant_id: ctx.tenant_id },
      create: {
        tenant_id: ctx.tenant_id,
        ...data,
      },
      update: data,
    });
  }

  async getGatewayAccount(ctx: TenantContext, provider: string): Promise<any> {
    return this.prisma.payment_gateway_accounts.findUnique({
      where: { tenant_id: ctx.tenant_id },
    });
  }

  async upsertGatewayAccount(ctx: TenantContext, data: any): Promise<any> {
    return this.prisma.payment_gateway_accounts.upsert({
      where: { tenant_id: ctx.tenant_id },
      create: {
        tenant_id: ctx.tenant_id,
        ...data,
      },
      update: data,
    });
  }

  async updateTransactionStatus(ctx: TenantContext,
    id: string,
    data: {
      status: "PENDING" | "PAID" | "FAILED" | "SETTLED" | "REFUNDED";
      external_ref?: string;
      platform_fee_pending?: number;
      platform_fee_realized?: number;
      gateway_fee?: number;
      net_amount?: number;
      retry_count?: number;
      last_checked_at?: Date;
    },
    actor_id: string,
  ): Promise<PaymentTransaction> {
    const updated = await this.prisma.payment_transactions.update({
      where: { id, tenant_id: ctx.tenant_id },
      data: {
        payment_status: data.status,
        external_ref: data.external_ref,
        platform_fee_pending: data.platform_fee_pending,
        platform_fee_realized: data.platform_fee_realized,
        gateway_fee: data.gateway_fee,
        net_amount: data.net_amount,
        retry_count: data.retry_count,
        last_checked_at: data.last_checked_at,
        updated_at: new Date(),
      },
    });

    await this.addAudit(
      ctx,
      actor_id,
      "transaction.status_sync",
      "TRANSACTION",
      id,
      `${data.status} (by ${actor_id})`,
    );

    return this.mapTransaction(updated as PrismaTransaction);
  }

  async checkAndInsertWebhookEvent(
    event_id: string,
    provider: string,
    payload: any,
  ): Promise<boolean> {
    try {
      await this.prisma.payment_webhook_events.create({
        data: {
          id: uuidv4(),
          event_id,
          provider,
          payload: payload ? JSON.stringify(payload) : "{}",
        },
      });
      return true;
    } catch (error) {
      if (error.code === "P2002") {
        return false;
      }
      throw error;
    }
  }

  async createPlatformFeeLedger(ctx: TenantContext,
    transaction_id: string,
    amount: number,
    provider: string,
  ): Promise<void> {
    await this.prisma.platform_fee_ledger.create({
      data: {
        id: uuidv4(),
        tenant_id: ctx.tenant_id,
        payment_transaction_id: transaction_id,
        amount,
        provider,
      },
    });
  }

  async findPendingTransactions(): Promise<PaymentTransaction[]> {
    const txs = await this.prisma.payment_transactions.findMany({
      where: {
        payment_status: "PENDING",
        method: "GATEWAY",
      },
      include: {
        payment_retry_attempts: true,
      },
    });

    return txs.map((tx) => this.mapTransaction(tx));
  }

  async findTransactionByExternalRef(external_ref: string): Promise<PaymentTransaction | undefined> {
    const tx = await this.prisma.payment_transactions.findFirst({
      where: {
        OR: [
          { external_ref: external_ref },
          { id: external_ref }
        ]
      },
      include: {
        payment_retry_attempts: true
      }
    });

    return tx ? this.mapTransaction(tx) : undefined;
  }
}
