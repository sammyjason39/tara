import { Injectable } from '@nestjs/common';
import { AttachDisputeEvidenceDto } from './dto/attach-dispute-evidence.dto';
import { CreateDisputeDto } from './dto/create-dispute.dto';
import { CreatePaymentTransactionDto } from './dto/create-payment-transaction.dto';
import { CreateRefundDto } from './dto/create-refund.dto';
import { ExecutePaymentDto } from './dto/execute-payment.dto';
import { ProgressDisputeDto } from './dto/progress-dispute.dto';
import { ResolveDisputeDto } from './dto/resolve-dispute.dto';
import { RoutePaymentDto } from './dto/route-payment.dto';
import { UpdateDeviceStatusDto } from './dto/update-device-status.dto';
import { UpdateProviderStatusDto } from './dto/update-provider-status.dto';
import { IPaymentRepository } from './repositories/payment.repository.interface';

@Injectable()
export class PaymentService {
  constructor(private readonly repository: IPaymentRepository) {}

  async getDashboard(tenantId: string) {
    return this.repository.getDashboard(tenantId);
  }

  async getTransactions(tenantId: string) {
    return this.repository.getTransactions(tenantId);
  }

  async createTransaction(tenantId: string, dto: CreatePaymentTransactionDto, actorId: string) {
    return this.repository.createTransaction(tenantId, dto, actorId);
  }

  async approveTransaction(tenantId: string, paymentId: string, actorId: string) {
    return this.repository.approveTransaction(tenantId, paymentId, actorId);
  }

  async rejectTransaction(tenantId: string, paymentId: string, actorId: string) {
    return this.repository.rejectTransaction(tenantId, paymentId, actorId);
  }

  async routeTransaction(
    tenantId: string,
    paymentId: string,
    dto: RoutePaymentDto,
    actorId: string,
  ) {
    return this.repository.routeTransaction(tenantId, paymentId, dto, actorId);
  }

  async executeTransaction(
    tenantId: string,
    paymentId: string,
    dto: ExecutePaymentDto,
    actorId: string,
  ) {
    return this.repository.executeTransaction(tenantId, paymentId, dto, actorId);
  }

  async settleTransaction(tenantId: string, paymentId: string, actorId: string) {
    return this.repository.settleTransaction(tenantId, paymentId, actorId);
  }

  async getProviders(tenantId: string) {
    return this.repository.getProviders(tenantId);
  }

  async updateProviderStatus(
    tenantId: string,
    providerId: string,
    dto: UpdateProviderStatusDto,
    actorId: string,
  ) {
    return this.repository.updateProviderStatus(tenantId, providerId, dto, actorId);
  }

  async runProviderHealthSweep(tenantId: string, actorId: string) {
    return this.repository.runProviderHealthSweep(tenantId, actorId);
  }

  async getRoutingPolicies(tenantId: string) {
    return this.repository.getRoutingPolicies(tenantId);
  }

  async getDevices(tenantId: string) {
    return this.repository.getDevices(tenantId);
  }

  async getDevicePools(tenantId: string) {
    return this.repository.getDevicePools(tenantId);
  }

  async updateDeviceStatus(
    tenantId: string,
    deviceId: string,
    dto: UpdateDeviceStatusDto,
    actorId: string,
  ) {
    return this.repository.updateDeviceStatus(tenantId, deviceId, dto, actorId);
  }

  async getRefunds(tenantId: string) {
    return this.repository.getRefunds(tenantId);
  }

  async createRefund(tenantId: string, dto: CreateRefundDto, actorId: string) {
    return this.repository.createRefund(tenantId, dto, actorId);
  }

  async approveRefund(tenantId: string, refundId: string, actorId: string) {
    return this.repository.approveRefund(tenantId, refundId, actorId);
  }

  async executeRefund(tenantId: string, refundId: string, actorId: string) {
    return this.repository.executeRefund(tenantId, refundId, actorId);
  }

  async getDisputes(tenantId: string) {
    return this.repository.getDisputes(tenantId);
  }

  async createDispute(tenantId: string, dto: CreateDisputeDto, actorId: string) {
    return this.repository.createDispute(tenantId, dto, actorId);
  }

  async attachDisputeEvidence(
    tenantId: string,
    disputeId: string,
    dto: AttachDisputeEvidenceDto,
    actorId: string,
  ) {
    return this.repository.attachDisputeEvidence(tenantId, disputeId, dto, actorId);
  }

  async progressDispute(
    tenantId: string,
    disputeId: string,
    dto: ProgressDisputeDto,
    actorId: string,
  ) {
    return this.repository.progressDispute(tenantId, disputeId, dto, actorId);
  }

  async resolveDispute(
    tenantId: string,
    disputeId: string,
    dto: ResolveDisputeDto,
    actorId: string,
  ) {
    return this.repository.resolveDispute(tenantId, disputeId, dto, actorId);
  }

  async getChargebacks(tenantId: string) {
    return this.repository.getChargebacks(tenantId);
  }

  async getSettlements(tenantId: string) {
    return this.repository.getSettlements(tenantId);
  }

  async getEvidencePacks(tenantId: string) {
    return this.repository.getEvidencePacks(tenantId);
  }

  async getAuditEvents(tenantId: string) {
    return this.repository.getAuditEvents(tenantId);
  }
}

