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
import { PaymentTransaction } from '../entities/payment-transaction.entity';

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
  abstract getDashboard(tenantId: string): Promise<PaymentDashboard>;

  abstract getTransactions(tenantId: string): Promise<PaymentTransaction[]>;
  abstract createTransaction(
    tenantId: string,
    dto: CreatePaymentTransactionDto,
    actorId: string,
  ): Promise<PaymentTransaction>;
  abstract approveTransaction(
    tenantId: string,
    paymentId: string,
    actorId: string,
  ): Promise<PaymentTransaction>;
  abstract rejectTransaction(
    tenantId: string,
    paymentId: string,
    actorId: string,
  ): Promise<PaymentTransaction>;
  abstract routeTransaction(
    tenantId: string,
    paymentId: string,
    dto: RoutePaymentDto,
    actorId: string,
  ): Promise<PaymentTransaction>;
  abstract executeTransaction(
    tenantId: string,
    paymentId: string,
    dto: ExecutePaymentDto,
    actorId: string,
  ): Promise<PaymentTransaction>;
  abstract settleTransaction(
    tenantId: string,
    paymentId: string,
    actorId: string,
  ): Promise<PaymentTransaction>;

  abstract getProviders(tenantId: string): Promise<PaymentProvider[]>;
  abstract updateProviderStatus(
    tenantId: string,
    providerId: string,
    dto: UpdateProviderStatusDto,
    actorId: string,
  ): Promise<PaymentProvider>;
  abstract runProviderHealthSweep(tenantId: string, actorId: string): Promise<PaymentProvider[]>;

  abstract getRoutingPolicies(tenantId: string): Promise<PaymentRoutingPolicy[]>;
  abstract getDevices(tenantId: string): Promise<PaymentDevice[]>;
  abstract getDevicePools(tenantId: string): Promise<PaymentDevicePool[]>;
  abstract updateDeviceStatus(
    tenantId: string,
    deviceId: string,
    dto: UpdateDeviceStatusDto,
    actorId: string,
  ): Promise<PaymentDevice>;

  abstract getRefunds(tenantId: string): Promise<PaymentRefund[]>;
  abstract createRefund(
    tenantId: string,
    dto: CreateRefundDto,
    actorId: string,
  ): Promise<PaymentRefund>;
  abstract approveRefund(
    tenantId: string,
    refundId: string,
    actorId: string,
  ): Promise<PaymentRefund>;
  abstract executeRefund(
    tenantId: string,
    refundId: string,
    actorId: string,
  ): Promise<PaymentRefund>;

  abstract getDisputes(tenantId: string): Promise<PaymentDispute[]>;
  abstract createDispute(
    tenantId: string,
    dto: CreateDisputeDto,
    actorId: string,
  ): Promise<PaymentDispute>;
  abstract attachDisputeEvidence(
    tenantId: string,
    disputeId: string,
    dto: AttachDisputeEvidenceDto,
    actorId: string,
  ): Promise<PaymentDispute>;
  abstract progressDispute(
    tenantId: string,
    disputeId: string,
    dto: ProgressDisputeDto,
    actorId: string,
  ): Promise<PaymentDispute>;
  abstract resolveDispute(
    tenantId: string,
    disputeId: string,
    dto: ResolveDisputeDto,
    actorId: string,
  ): Promise<PaymentDispute>;

  abstract getChargebacks(tenantId: string): Promise<PaymentChargeback[]>;
  abstract getSettlements(tenantId: string): Promise<PaymentSettlement[]>;
  abstract getEvidencePacks(tenantId: string): Promise<PaymentEvidencePack[]>;
  abstract getAuditEvents(tenantId: string): Promise<PaymentAuditEvent[]>;
}

