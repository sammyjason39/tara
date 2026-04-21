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
  abstract getDashboard(tenant_id: string): Promise<PaymentDashboard>;

  abstract getTransactions(tenant_id: string): Promise<PaymentTransaction[]>;
  abstract createTransaction(
    tenant_id: string,
    dto: CreatePaymentTransactionDto,
    actor_id: string,
  ): Promise<PaymentTransaction>;
  abstract approveTransaction(
    tenant_id: string,
    paymentId: string,
    actor_id: string,
  ): Promise<PaymentTransaction>;
  abstract rejectTransaction(
    tenant_id: string,
    paymentId: string,
    actor_id: string,
  ): Promise<PaymentTransaction>;
  abstract routeTransaction(
    tenant_id: string,
    paymentId: string,
    dto: RoutePaymentDto,
    actor_id: string,
  ): Promise<PaymentTransaction>;
  abstract executeTransaction(
    tenant_id: string,
    paymentId: string,
    dto: ExecutePaymentDto,
    actor_id: string,
  ): Promise<PaymentTransaction>;
  abstract settleTransaction(
    tenant_id: string,
    paymentId: string,
    actor_id: string,
  ): Promise<PaymentTransaction>;

  abstract getProviders(tenant_id: string): Promise<PaymentProvider[]>;
  abstract updateProviderStatus(
    tenant_id: string,
    providerId: string,
    dto: UpdateProviderStatusDto,
    actor_id: string,
  ): Promise<PaymentProvider>;
  abstract runProviderHealthSweep(
    tenant_id: string,
    actor_id: string,
  ): Promise<PaymentProvider[]>;

  abstract getRoutingPolicies(
    tenant_id: string,
  ): Promise<PaymentRoutingPolicy[]>;
  abstract getDevices(tenant_id: string): Promise<PaymentDevice[]>;
  abstract getDevicePools(tenant_id: string): Promise<PaymentDevicePool[]>;
  abstract updateDeviceStatus(
    tenant_id: string,
    device_id: string,
    dto: UpdateDeviceStatusDto,
    actor_id: string,
  ): Promise<PaymentDevice>;

  abstract getRefunds(tenant_id: string): Promise<PaymentRefund[]>;
  abstract createRefund(
    tenant_id: string,
    dto: CreateRefundDto,
    actor_id: string,
  ): Promise<PaymentRefund>;
  abstract approveRefund(
    tenant_id: string,
    refundId: string,
    actor_id: string,
  ): Promise<PaymentRefund>;
  abstract executeRefund(
    tenant_id: string,
    refundId: string,
    actor_id: string,
  ): Promise<PaymentRefund>;

  abstract getDisputes(tenant_id: string): Promise<PaymentDispute[]>;
  abstract createDispute(
    tenant_id: string,
    dto: CreateDisputeDto,
    actor_id: string,
  ): Promise<PaymentDispute>;
  abstract attachDisputeEvidence(
    tenant_id: string,
    disputeId: string,
    dto: AttachDisputeEvidenceDto,
    actor_id: string,
  ): Promise<PaymentDispute>;
  abstract progressDispute(
    tenant_id: string,
    disputeId: string,
    dto: ProgressDisputeDto,
    actor_id: string,
  ): Promise<PaymentDispute>;
  abstract resolveDispute(
    tenant_id: string,
    disputeId: string,
    dto: ResolveDisputeDto,
    actor_id: string,
  ): Promise<PaymentDispute>;

  abstract getChargebacks(tenant_id: string): Promise<PaymentChargeback[]>;
  abstract getSettlements(tenant_id: string): Promise<PaymentSettlement[]>;
  abstract getEvidencePacks(tenant_id: string): Promise<PaymentEvidencePack[]>;
  abstract getAuditEvents(tenant_id: string): Promise<PaymentAuditEvent[]>;

  // Unified Gateway & Settings
  abstract getPaymentSettings(tenant_id: string): Promise<any>;
  abstract updatePaymentSettings(tenant_id: string, data: any): Promise<any>;
  abstract getGatewayAccount(
    tenant_id: string,
    provider: string,
  ): Promise<any>;
  abstract upsertGatewayAccount(tenant_id: string, data: any): Promise<any>;
  abstract updateTransactionStatus(
    tenant_id: string,
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

  abstract createPlatformFeeLedger(
    tenant_id: string,
    transaction_id: string,
    amount: number,
    provider: string,
  ): Promise<void>;

  abstract findPendingTransactions(): Promise<PaymentTransaction[]>;
}
