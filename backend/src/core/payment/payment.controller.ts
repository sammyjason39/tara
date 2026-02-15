import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Req,
  UseInterceptors,
} from '@nestjs/common';
import { Request } from 'express';
import { TenantContext } from '../../gateway/tenant-context.interface';
import { TenantInterceptor } from '../../gateway/tenant.interceptor';
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
import { PaymentService } from './payment.service';

interface RequestWithTenant extends Request {
  tenantContext: TenantContext;
}

@Controller('payment')
@UseInterceptors(TenantInterceptor)
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  private actorId(request: RequestWithTenant) {
    const value = request.headers['x-actor-id'];
    return typeof value === 'string' && value.trim().length > 0 ? value : 'system';
  }

  @Get('dashboard')
  async getDashboard(@Req() request: RequestWithTenant) {
    const { tenantId } = request.tenantContext;
    return { success: true, tenantId, data: await this.paymentService.getDashboard(tenantId) };
  }

  @Get('transactions')
  async getTransactions(@Req() request: RequestWithTenant) {
    const { tenantId } = request.tenantContext;
    const data = await this.paymentService.getTransactions(tenantId);
    return { success: true, tenantId, count: data.length, data };
  }

  @Post('transactions')
  async createTransaction(
    @Req() request: RequestWithTenant,
    @Body() dto: CreatePaymentTransactionDto,
  ) {
    const { tenantId } = request.tenantContext;
    return {
      success: true,
      tenantId,
      message: 'Payment request created',
      data: await this.paymentService.createTransaction(tenantId, dto, this.actorId(request)),
    };
  }

  @Put('transactions/:id/approve')
  async approveTransaction(@Req() request: RequestWithTenant, @Param('id') paymentId: string) {
    const { tenantId } = request.tenantContext;
    return {
      success: true,
      tenantId,
      message: 'Payment approved',
      data: await this.paymentService.approveTransaction(tenantId, paymentId, this.actorId(request)),
    };
  }

  @Put('transactions/:id/reject')
  async rejectTransaction(@Req() request: RequestWithTenant, @Param('id') paymentId: string) {
    const { tenantId } = request.tenantContext;
    return {
      success: true,
      tenantId,
      message: 'Payment rejected',
      data: await this.paymentService.rejectTransaction(tenantId, paymentId, this.actorId(request)),
    };
  }

  @Put('transactions/:id/route')
  async routeTransaction(
    @Req() request: RequestWithTenant,
    @Param('id') paymentId: string,
    @Body() dto: RoutePaymentDto,
  ) {
    const { tenantId } = request.tenantContext;
    return {
      success: true,
      tenantId,
      message: 'Provider selected',
      data: await this.paymentService.routeTransaction(tenantId, paymentId, dto, this.actorId(request)),
    };
  }

  @Put('transactions/:id/execute')
  async executeTransaction(
    @Req() request: RequestWithTenant,
    @Param('id') paymentId: string,
    @Body() dto: ExecutePaymentDto,
  ) {
    const { tenantId } = request.tenantContext;
    return {
      success: true,
      tenantId,
      message: 'Execution processed',
      data: await this.paymentService.executeTransaction(tenantId, paymentId, dto, this.actorId(request)),
    };
  }

  @Put('transactions/:id/settle')
  async settleTransaction(@Req() request: RequestWithTenant, @Param('id') paymentId: string) {
    const { tenantId } = request.tenantContext;
    return {
      success: true,
      tenantId,
      message: 'Settlement confirmed',
      data: await this.paymentService.settleTransaction(tenantId, paymentId, this.actorId(request)),
    };
  }

  @Get('providers')
  async getProviders(@Req() request: RequestWithTenant) {
    const { tenantId } = request.tenantContext;
    const data = await this.paymentService.getProviders(tenantId);
    return { success: true, tenantId, count: data.length, data };
  }

  @Put('providers/:id/status')
  async updateProviderStatus(
    @Req() request: RequestWithTenant,
    @Param('id') providerId: string,
    @Body() dto: UpdateProviderStatusDto,
  ) {
    const { tenantId } = request.tenantContext;
    return {
      success: true,
      tenantId,
      message: 'Provider status updated',
      data: await this.paymentService.updateProviderStatus(
        tenantId,
        providerId,
        dto,
        this.actorId(request),
      ),
    };
  }

  @Post('providers/health-sweep')
  async runProviderHealthSweep(@Req() request: RequestWithTenant) {
    const { tenantId } = request.tenantContext;
    const data = await this.paymentService.runProviderHealthSweep(tenantId, this.actorId(request));
    return {
      success: true,
      tenantId,
      message: 'Provider health sweep completed',
      count: data.length,
      data,
    };
  }

  @Get('routing-policies')
  async getRoutingPolicies(@Req() request: RequestWithTenant) {
    const { tenantId } = request.tenantContext;
    const data = await this.paymentService.getRoutingPolicies(tenantId);
    return { success: true, tenantId, count: data.length, data };
  }

  @Get('devices')
  async getDevices(@Req() request: RequestWithTenant) {
    const { tenantId } = request.tenantContext;
    const data = await this.paymentService.getDevices(tenantId);
    return { success: true, tenantId, count: data.length, data };
  }

  @Get('device-pools')
  async getDevicePools(@Req() request: RequestWithTenant) {
    const { tenantId } = request.tenantContext;
    const data = await this.paymentService.getDevicePools(tenantId);
    return { success: true, tenantId, count: data.length, data };
  }

  @Put('devices/:id/status')
  async updateDeviceStatus(
    @Req() request: RequestWithTenant,
    @Param('id') deviceId: string,
    @Body() dto: UpdateDeviceStatusDto,
  ) {
    const { tenantId } = request.tenantContext;
    return {
      success: true,
      tenantId,
      message: 'Device status updated',
      data: await this.paymentService.updateDeviceStatus(
        tenantId,
        deviceId,
        dto,
        this.actorId(request),
      ),
    };
  }

  @Get('refunds')
  async getRefunds(@Req() request: RequestWithTenant) {
    const { tenantId } = request.tenantContext;
    const data = await this.paymentService.getRefunds(tenantId);
    return { success: true, tenantId, count: data.length, data };
  }

  @Post('refunds')
  async createRefund(@Req() request: RequestWithTenant, @Body() dto: CreateRefundDto) {
    const { tenantId } = request.tenantContext;
    return {
      success: true,
      tenantId,
      message: 'Refund requested',
      data: await this.paymentService.createRefund(tenantId, dto, this.actorId(request)),
    };
  }

  @Put('refunds/:id/approve')
  async approveRefund(@Req() request: RequestWithTenant, @Param('id') refundId: string) {
    const { tenantId } = request.tenantContext;
    return {
      success: true,
      tenantId,
      message: 'Refund approved',
      data: await this.paymentService.approveRefund(tenantId, refundId, this.actorId(request)),
    };
  }

  @Put('refunds/:id/execute')
  async executeRefund(@Req() request: RequestWithTenant, @Param('id') refundId: string) {
    const { tenantId } = request.tenantContext;
    return {
      success: true,
      tenantId,
      message: 'Refund executed',
      data: await this.paymentService.executeRefund(tenantId, refundId, this.actorId(request)),
    };
  }

  @Get('disputes')
  async getDisputes(@Req() request: RequestWithTenant) {
    const { tenantId } = request.tenantContext;
    const data = await this.paymentService.getDisputes(tenantId);
    return { success: true, tenantId, count: data.length, data };
  }

  @Post('disputes')
  async createDispute(@Req() request: RequestWithTenant, @Body() dto: CreateDisputeDto) {
    const { tenantId } = request.tenantContext;
    return {
      success: true,
      tenantId,
      message: 'Dispute opened',
      data: await this.paymentService.createDispute(tenantId, dto, this.actorId(request)),
    };
  }

  @Put('disputes/:id/evidence')
  async attachDisputeEvidence(
    @Req() request: RequestWithTenant,
    @Param('id') disputeId: string,
    @Body() dto: AttachDisputeEvidenceDto,
  ) {
    const { tenantId } = request.tenantContext;
    return {
      success: true,
      tenantId,
      message: 'Evidence attached',
      data: await this.paymentService.attachDisputeEvidence(
        tenantId,
        disputeId,
        dto,
        this.actorId(request),
      ),
    };
  }

  @Put('disputes/:id/progress')
  async progressDispute(
    @Req() request: RequestWithTenant,
    @Param('id') disputeId: string,
    @Body() dto: ProgressDisputeDto,
  ) {
    const { tenantId } = request.tenantContext;
    return {
      success: true,
      tenantId,
      message: 'Dispute stage updated',
      data: await this.paymentService.progressDispute(
        tenantId,
        disputeId,
        dto,
        this.actorId(request),
      ),
    };
  }

  @Put('disputes/:id/resolve')
  async resolveDispute(
    @Req() request: RequestWithTenant,
    @Param('id') disputeId: string,
    @Body() dto: ResolveDisputeDto,
  ) {
    const { tenantId } = request.tenantContext;
    return {
      success: true,
      tenantId,
      message: 'Dispute resolved',
      data: await this.paymentService.resolveDispute(
        tenantId,
        disputeId,
        dto,
        this.actorId(request),
      ),
    };
  }

  @Get('chargebacks')
  async getChargebacks(@Req() request: RequestWithTenant) {
    const { tenantId } = request.tenantContext;
    const data = await this.paymentService.getChargebacks(tenantId);
    return { success: true, tenantId, count: data.length, data };
  }

  @Get('settlements')
  async getSettlements(@Req() request: RequestWithTenant) {
    const { tenantId } = request.tenantContext;
    const data = await this.paymentService.getSettlements(tenantId);
    return { success: true, tenantId, count: data.length, data };
  }

  @Get('evidence-packs')
  async getEvidencePacks(@Req() request: RequestWithTenant) {
    const { tenantId } = request.tenantContext;
    const data = await this.paymentService.getEvidencePacks(tenantId);
    return { success: true, tenantId, count: data.length, data };
  }

  @Get('audit-events')
  async getAuditEvents(@Req() request: RequestWithTenant) {
    const { tenantId } = request.tenantContext;
    const data = await this.paymentService.getAuditEvents(tenantId);
    return { success: true, tenantId, count: data.length, data };
  }
}

