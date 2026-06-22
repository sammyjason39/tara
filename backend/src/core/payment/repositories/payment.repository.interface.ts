import { TenantContext } from "../../../gateway/tenant-context.interface";
import { ScopeLike } from "../../../shared/utils/multi-tenancy.util";
import { Prisma } from "@prisma/client";
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

export type PaymentDashboard = {
  pendingApprovals: number;
  executingPayments: number;
  settlementPending: number;
  settledToday: number;
  failedTransactions: number;
  openDisputes: number;
  openChargebacks: number;
  refundPending: number;
};

export abstract class IPaymentRepository {
  abstract getDashboard( scope: ScopeLike): Promise<PaymentDashboard>;

  abstract getTransactions( scope: ScopeLike): Promise<PaymentTransaction[]>;
  abstract createTransaction( ctx: TenantContext,
    dto: CreatePaymentTransactionDto,
    actor_id: string,
  ): Promise<PaymentTransaction>;
  abstract approveTransaction( ctx: TenantContext,
    paymentId: string,
    actor_id: string,
    tx?: Prisma.TransactionClient,
  ): Promise<PaymentTransaction>;
  abstract rejectTransaction( ctx: TenantContext,
    paymentId: string,
    actor_id: string,
    tx?: Prisma.TransactionClient,
  ): Promise<PaymentTransaction>;
  abstract routeTransaction( ctx: TenantContext,
    paymentId: string,
    dto: RoutePaymentDto,
    actor_id: string,
    tx?: Prisma.TransactionClient,
  ): Promise<PaymentTransaction>;
  abstract executeTransaction( ctx: TenantContext,
    paymentId: string,
    dto: ExecutePaymentDto,
    actor_id: string,
    tx?: Prisma.TransactionClient,
  ): Promise<PaymentTransaction>;
  abstract settleTransaction( ctx: TenantContext,
    paymentId: string,
    actor_id: string,
    tx?: Prisma.TransactionClient,
  ): Promise<PaymentTransaction>;

  abstract getProviders( scope: ScopeLike): Promise<PaymentProvider[]>;
  abstract updateProviderStatus( ctx: TenantContext,
    providerId: string,
    dto: UpdateProviderStatusDto,
    actor_id: string,
  ): Promise<PaymentProvider>;
  abstract runProviderHealthSweep( ctx: TenantContext,
    actor_id: string,
  ): Promise<PaymentProvider[]>;

  abstract getRoutingPolicies( scope: ScopeLike,
  ): Promise<PaymentRoutingPolicy[]>;
  abstract getDevices( scope: ScopeLike): Promise<PaymentDevice[]>;
  abstract getDevicePools( scope: ScopeLike): Promise<PaymentDevicePool[]>;
  abstract updateDeviceStatus( ctx: TenantContext,
    device_id: string,
    dto: UpdateDeviceStatusDto,
    actor_id: string,
  ): Promise<PaymentDevice>;

  abstract getRefunds( scope: ScopeLike): Promise<PaymentRefund[]>;
  abstract createRefund( ctx: TenantContext,
    dto: CreateRefundDto,
    actor_id: string,
  ): Promise<PaymentRefund>;
  abstract approveRefund( ctx: TenantContext,
    refundId: string,
    actor_id: string,
    tx?: Prisma.TransactionClient,
  ): Promise<PaymentRefund>;
  abstract executeRefund( ctx: TenantContext,
    refundId: string,
    actor_id: string,
    tx?: Prisma.TransactionClient,
  ): Promise<PaymentRefund>;

  abstract getDisputes( scope: ScopeLike): Promise<PaymentDispute[]>;
  abstract createDispute( ctx: TenantContext,
    dto: CreateDisputeDto,
    actor_id: string,
  ): Promise<PaymentDispute>;
  abstract attachDisputeEvidence( ctx: TenantContext,
    disputeId: string,
    dto: AttachDisputeEvidenceDto,
    actor_id: string,
  ): Promise<PaymentDispute>;
  abstract progressDispute( ctx: TenantContext,
    disputeId: string,
    dto: ProgressDisputeDto,
    actor_id: string,
    tx?: Prisma.TransactionClient,
  ): Promise<PaymentDispute>;
  abstract resolveDispute( ctx: TenantContext,
    disputeId: string,
    dto: ResolveDisputeDto,
    actor_id: string,
    tx?: Prisma.TransactionClient,
  ): Promise<PaymentDispute>;

  abstract getChargebacks( scope: ScopeLike): Promise<PaymentChargeback[]>;
  abstract getSettlements( scope: ScopeLike): Promise<PaymentSettlement[]>;
  abstract getEvidencePacks( scope: ScopeLike): Promise<PaymentEvidencePack[]>;
  abstract getAuditEvents( scope: ScopeLike): Promise<PaymentAuditEvent[]>;

  // Unified Gateway & Settings
  abstract getPaymentSettings( scope: ScopeLike): Promise<any>;
  abstract updatePaymentSettings( ctx: TenantContext, data: any): Promise<any>;
  abstract getGatewayAccount( ctx: TenantContext,
    provider: string,
  ): Promise<any>;
  abstract upsertGatewayAccount( ctx: TenantContext, data: any): Promise<any>;
  abstract updateTransactionStatus( ctx: TenantContext,
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
  ): Promise<PaymentTransaction>;

  abstract checkAndInsertWebhookEvent(
    event_id: string,
    provider: string,
    payload: any,
  ): Promise<boolean>;

  abstract createPlatformFeeLedger( ctx: TenantContext,
    transaction_id: string,
    amount: number,
    provider: string,
  ): Promise<void>;

  abstract findPendingTransactions(): Promise<PaymentTransaction[]>;
  abstract findTransactionByExternalRef(external_ref: string): Promise<PaymentTransaction | undefined>;
}
