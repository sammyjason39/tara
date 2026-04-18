import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Req,
  UseInterceptors,
  UseGuards,
} from "@nestjs/common";
import { Request } from "express";
import { TenantContext } from "../../gateway/tenant-context.interface";
import { TenantInterceptor } from "../../gateway/tenant.interceptor";
import { ModuleStateGuard } from "../auth/guards/module-state.guard";
import { BranchGatingGuard } from "../auth/guards/branch-gating.guard";
import { RequiredModule } from "../../shared/decorators/required-module.decorator";
import { TenantGuard } from "../../shared/guards/tenant.guard";
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
import { PaymentService } from "./payment.service";
import { PrismaService } from "../../persistence/prisma.service";
import { isModuleActive } from "../../shared/helpers/module-active.helper";

interface RequestWithTenant extends Request {
  tenantContext: TenantContext;
}

@Controller("payment")
@UseInterceptors(TenantInterceptor)
@UseGuards(ModuleStateGuard, BranchGatingGuard, TenantGuard)
@RequiredModule("payment")
export class PaymentController {
  constructor(
    private readonly paymentService: PaymentService,
    private readonly prisma: PrismaService,
  ) {}

  private actor_id(request: RequestWithTenant) {
    const value = request.headers["x-actor-id"];
    return typeof value === "string" && value.trim().length > 0
      ? value
      : "system";
  }

  @Get("dashboard")
  async getDashboard(@Req() request: RequestWithTenant) {
    const { tenant_id } = request.tenantContext;
    const dashboardData = await this.paymentService.getDashboard(tenant_id);

    const moduleContributions: any = {};
    if (await isModuleActive(this.prisma, tenant_id, "retail")) {
      const activeDevices = await this.prisma.payment_pos_devices.count({
        where: { tenant_id: tenant_id, status: "ONLINE" },
      });
      const totalDisputes = await this.prisma.payment_disputes.count({
        where: { tenant_id: tenant_id, status: "OPEN" },
      });
      moduleContributions.retail = {
        activeDevices,
        totalDisputes,
      };
    }

    return {
      success: true,
      tenant_id,
      data: {
        ...dashboardData,
        moduleContributions,
      },
    };
  }

  @Get("transactions")
  async getTransactions(@Req() request: RequestWithTenant) {
    const { tenant_id } = request.tenantContext;
    const data = await this.paymentService.getTransactions(tenant_id);
    return { success: true, tenant_id, count: data.length, data };
  }

  @Post("transactions")
  async createTransaction(
    @Req() request: RequestWithTenant,
    @Body() dto: CreatePaymentTransactionDto,
  ) {
    const { tenant_id } = request.tenantContext;
    return {
      success: true,
      tenant_id,
      message: "Payment request created",
      data: await this.paymentService.createTransaction(
        tenant_id,
        dto,
        this.actor_id(request),
      ),
    };
  }

  @Put("transactions/:id/approve")
  async approveTransaction(
    @Req() request: RequestWithTenant,
    @Param("id") paymentId: string,
  ) {
    const { tenant_id } = request.tenantContext;
    return {
      success: true,
      tenant_id,
      message: "Payment approved",
      data: await this.paymentService.approveTransaction(
        tenant_id,
        paymentId,
        this.actor_id(request),
      ),
    };
  }

  @Put("transactions/:id/reject")
  async rejectTransaction(
    @Req() request: RequestWithTenant,
    @Param("id") paymentId: string,
  ) {
    const { tenant_id } = request.tenantContext;
    return {
      success: true,
      tenant_id,
      message: "Payment rejected",
      data: await this.paymentService.rejectTransaction(
        tenant_id,
        paymentId,
        this.actor_id(request),
      ),
    };
  }

  @Put("transactions/:id/route")
  async routeTransaction(
    @Req() request: RequestWithTenant,
    @Param("id") paymentId: string,
    @Body() dto: RoutePaymentDto,
  ) {
    const { tenant_id } = request.tenantContext;
    return {
      success: true,
      tenant_id,
      message: "Provider selected",
      data: await this.paymentService.routeTransaction(
        tenant_id,
        paymentId,
        dto,
        this.actor_id(request),
      ),
    };
  }

  @Put("transactions/:id/execute")
  async executeTransaction(
    @Req() request: RequestWithTenant,
    @Param("id") paymentId: string,
    @Body() dto: ExecutePaymentDto,
  ) {
    const { tenant_id } = request.tenantContext;
    return {
      success: true,
      tenant_id,
      message: "Execution processed",
      data: await this.paymentService.executeTransaction(
        tenant_id,
        paymentId,
        dto,
        this.actor_id(request),
      ),
    };
  }

  @Put("transactions/:id/settle")
  async settleTransaction(
    @Req() request: RequestWithTenant,
    @Param("id") paymentId: string,
  ) {
    const { tenant_id } = request.tenantContext;
    return {
      success: true,
      tenant_id,
      message: "Settlement confirmed",
      data: await this.paymentService.settleTransaction(
        tenant_id,
        paymentId,
        this.actor_id(request),
      ),
    };
  }

  @Get("providers")
  async getProviders(@Req() request: RequestWithTenant) {
    const { tenant_id } = request.tenantContext;
    const data = await this.paymentService.getProviders(tenant_id);
    return { success: true, tenant_id, count: data.length, data };
  }

  @Put("providers/:id/status")
  async updateProviderStatus(
    @Req() request: RequestWithTenant,
    @Param("id") providerId: string,
    @Body() dto: UpdateProviderStatusDto,
  ) {
    const { tenant_id } = request.tenantContext;
    return {
      success: true,
      tenant_id,
      message: "Provider status updated",
      data: await this.paymentService.updateProviderStatus(
        tenant_id,
        providerId,
        dto,
        this.actor_id(request),
      ),
    };
  }

  @Post("providers/health-sweep")
  async runProviderHealthSweep(@Req() request: RequestWithTenant) {
    const { tenant_id } = request.tenantContext;
    const data = await this.paymentService.runProviderHealthSweep(
      tenant_id,
      this.actor_id(request),
    );
    return {
      success: true,
      tenant_id,
      message: "Provider health sweep completed",
      count: data.length,
      data,
    };
  }

  @Get("routing-policies")
  async getRoutingPolicies(@Req() request: RequestWithTenant) {
    const { tenant_id } = request.tenantContext;
    const data = await this.paymentService.getRoutingPolicies(tenant_id);
    return { success: true, tenant_id, count: data.length, data };
  }

  @Get("devices")
  async getDevices(@Req() request: RequestWithTenant) {
    const { tenant_id } = request.tenantContext;
    const data = await this.paymentService.getDevices(tenant_id);
    return { success: true, tenant_id, count: data.length, data };
  }

  @Get("device-pools")
  async getDevicePools(@Req() request: RequestWithTenant) {
    const { tenant_id } = request.tenantContext;
    const data = await this.paymentService.getDevicePools(tenant_id);
    return { success: true, tenant_id, count: data.length, data };
  }

  @Put("devices/:id/status")
  async updateDeviceStatus(
    @Req() request: RequestWithTenant,
    @Param("id") device_id: string,
    @Body() dto: UpdateDeviceStatusDto,
  ) {
    const { tenant_id } = request.tenantContext;
    return {
      success: true,
      tenant_id,
      message: "Device status updated",
      data: await this.paymentService.updateDeviceStatus(
        tenant_id,
        device_id,
        dto,
        this.actor_id(request),
      ),
    };
  }

  @Get("refunds")
  async getRefunds(@Req() request: RequestWithTenant) {
    const { tenant_id } = request.tenantContext;
    const data = await this.paymentService.getRefunds(tenant_id);
    return { success: true, tenant_id, count: data.length, data };
  }

  @Post("refunds")
  async createRefund(
    @Req() request: RequestWithTenant,
    @Body() dto: CreateRefundDto,
  ) {
    const { tenant_id } = request.tenantContext;
    return {
      success: true,
      tenant_id,
      message: "Refund requested",
      data: await this.paymentService.createRefund(
        tenant_id,
        dto,
        this.actor_id(request),
      ),
    };
  }

  @Put("refunds/:id/approve")
  async approveRefund(
    @Req() request: RequestWithTenant,
    @Param("id") refundId: string,
  ) {
    const { tenant_id } = request.tenantContext;
    return {
      success: true,
      tenant_id,
      message: "Refund approved",
      data: await this.paymentService.approveRefund(
        tenant_id,
        refundId,
        this.actor_id(request),
      ),
    };
  }

  @Put("refunds/:id/execute")
  async executeRefund(
    @Req() request: RequestWithTenant,
    @Param("id") refundId: string,
  ) {
    const { tenant_id } = request.tenantContext;
    return {
      success: true,
      tenant_id,
      message: "Refund executed",
      data: await this.paymentService.executeRefund(
        tenant_id,
        refundId,
        this.actor_id(request),
      ),
    };
  }

  @Get("disputes")
  async getDisputes(@Req() request: RequestWithTenant) {
    const { tenant_id } = request.tenantContext;
    const data = await this.paymentService.getDisputes(tenant_id);
    return { success: true, tenant_id, count: data.length, data };
  }

  @Post("disputes")
  async createDispute(
    @Req() request: RequestWithTenant,
    @Body() dto: CreateDisputeDto,
  ) {
    const { tenant_id } = request.tenantContext;
    return {
      success: true,
      tenant_id,
      message: "Dispute opened",
      data: await this.paymentService.createDispute(
        tenant_id,
        dto,
        this.actor_id(request),
      ),
    };
  }

  @Put("disputes/:id/evidence")
  async attachDisputeEvidence(
    @Req() request: RequestWithTenant,
    @Param("id") disputeId: string,
    @Body() dto: AttachDisputeEvidenceDto,
  ) {
    const { tenant_id } = request.tenantContext;
    return {
      success: true,
      tenant_id,
      message: "Evidence attached",
      data: await this.paymentService.attachDisputeEvidence(
        tenant_id,
        disputeId,
        dto,
        this.actor_id(request),
      ),
    };
  }

  @Put("disputes/:id/progress")
  async progressDispute(
    @Req() request: RequestWithTenant,
    @Param("id") disputeId: string,
    @Body() dto: ProgressDisputeDto,
  ) {
    const { tenant_id } = request.tenantContext;
    return {
      success: true,
      tenant_id,
      message: "Dispute stage updated",
      data: await this.paymentService.progressDispute(
        tenant_id,
        disputeId,
        dto,
        this.actor_id(request),
      ),
    };
  }

  @Put("disputes/:id/resolve")
  async resolveDispute(
    @Req() request: RequestWithTenant,
    @Param("id") disputeId: string,
    @Body() dto: ResolveDisputeDto,
  ) {
    const { tenant_id } = request.tenantContext;
    return {
      success: true,
      tenant_id,
      message: "Dispute resolved",
      data: await this.paymentService.resolveDispute(
        tenant_id,
        disputeId,
        dto,
        this.actor_id(request),
      ),
    };
  }

  @Get("chargebacks")
  async getChargebacks(@Req() request: RequestWithTenant) {
    const { tenant_id } = request.tenantContext;
    const data = await this.paymentService.getChargebacks(tenant_id);
    return { success: true, tenant_id, count: data.length, data };
  }

  @Get("settlements")
  async getSettlements(@Req() request: RequestWithTenant) {
    const { tenant_id } = request.tenantContext;
    const data = await this.paymentService.getSettlements(tenant_id);
    return { success: true, tenant_id, count: data.length, data };
  }

  @Get("evidence-packs")
  async getEvidencePacks(@Req() request: RequestWithTenant) {
    const { tenant_id } = request.tenantContext;
    const data = await this.paymentService.getEvidencePacks(tenant_id);
    return { success: true, tenant_id, count: data.length, data };
  }

  @Get("audit-events")
  async getAuditEvents(@Req() request: RequestWithTenant) {
    const { tenant_id } = request.tenantContext;
    const data = await this.paymentService.getAuditEvents(tenant_id);
    return { success: true, tenant_id, count: data.length, data };
  }
}
