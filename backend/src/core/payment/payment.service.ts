import { Injectable } from "@nestjs/common";
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

@Injectable()
export class PaymentService {
  constructor(private readonly repository: IPaymentRepository) {}

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
}
