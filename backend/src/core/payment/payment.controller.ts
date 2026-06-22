import {
  Body,
  Controller,
  ForbiddenException,
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
import { RolesGuard } from "../../shared/guards/roles.guard";
import { Roles } from "../../shared/decorators/roles.decorator";
import { UserRole } from "../../shared/roles";
import { TenantScopeResolver } from "../../shared/scope/tenant-scope.resolver";
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
import { MultiTenancyUtil } from "../../shared/utils/multi-tenancy.util";

interface RequestWithTenant extends Request {
  tenantContext: TenantContext;
}

/**
 * Payment Controller (Phase 5)
 *
 * Identity and scope are derived exclusively from the verified
 * `request.tenantContext` (populated by `TenantInterceptor` after the
 * JWT-bearing tenant middleware), never from client-supplied headers
 * (Requirements 2.10, 3.1, 3.2, 3.5). This closes bug-class #1: the previous
 * `actor_id()` helper read a spoofable `x-actor-id` header and fell back to the
 * literal `"system"`; every mutating handler now sources the actor from
 * `request.tenantContext.user_id` via {@link requireActor} and rejects a request
 * that carries no verified user identity.
 *
 * Each request resolves a validated `TenantScope` through the shared
 * {@link TenantScopeResolver} and passes that scope into the Payment service.
 * `RolesGuard` plus a `@Roles(...)` gate on every mutating handler enforces
 * role-based access control; `ModuleStateGuard` (via `@RequiredModule("payment")`)
 * rejects requests when the Payment module is inactive for the tenant.
 *
 * Provider webhooks / gateway callbacks are handled by the separate
 * `PaymentWebhookController` and are intentionally NOT role-gated here: their
 * caller is the payment provider, not an authenticated platform user.
 */
@Controller('payment')
@UseInterceptors(TenantInterceptor)
@UseGuards(ModuleStateGuard, BranchGatingGuard, TenantGuard, RolesGuard)
@RequiredModule("payment")
export class PaymentController {
  constructor(
    private readonly paymentService: PaymentService,
    private readonly prisma: PrismaService,
    private readonly scopeResolver: TenantScopeResolver,
  ) {}

  /**
   * Resolve the verified actor `user_id` from the tenant context, rejecting a
   * mutating request that carries no verified user identity (Requirements 2.10,
   * 3.5). Actor identity is never taken from a client-supplied `x-actor-id`
   * header nor a `"system"` fallback (bug-class #1).
   */
  private requireActor(request: RequestWithTenant): string {
    const user_id = request.tenantContext.user_id;
    if (!user_id) {
      throw new ForbiddenException(
        "A verified user identity is required to perform this action.",
      );
    }
    return user_id;
  }

  @Get("dashboard")
  async getDashboard(@Req() request: RequestWithTenant) {
    const scope = await this.scopeResolver.resolve(request.tenantContext);
    const dashboardData = await this.paymentService.getDashboard(scope);

    const moduleContributions: any = {};
    if (await isModuleActive(this.prisma, scope.tenant_id, "retail")) {
      const activeDevices = await this.prisma.payment_pos_devices.count({
        where: { ...MultiTenancyUtil.getScope(scope), status: "ONLINE" },
      });
      const totalDisputes = await this.prisma.payment_disputes.count({
        where: { ...MultiTenancyUtil.getScope(scope), status: "OPEN" },
      });
      moduleContributions.retail = {
        activeDevices,
        totalDisputes,
      };
    }

    return {
      success: true,
      tenant_id: scope.tenant_id,
      data: {
        ...dashboardData,
        moduleContributions,
      },
    };
  }

  @Get("status")
  async getPaymentStatus(@Req() request: RequestWithTenant) {
    const scope = await this.scopeResolver.resolve(request.tenantContext);
    return {
      success: true,
      tenant_id: scope.tenant_id,
      data: await this.paymentService.getPaymentStatus(scope),
    };
  }

  @Get("transactions")
  async getTransactions(@Req() request: RequestWithTenant) {
    const scope = await this.scopeResolver.resolve(request.tenantContext);
    const data = await this.paymentService.getTransactions(scope);
    return { success: true, tenant_id: scope.tenant_id, count: data.length, data };
  }

  @Post("transactions")
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.MEMBER)
  async createTransaction(
    @Req() request: RequestWithTenant,
    @Body() dto: CreatePaymentTransactionDto,
  ) {
    const scope = await this.scopeResolver.resolve(request.tenantContext);
    const user_id = this.requireActor(request);
    return {
      success: true,
      tenant_id: scope.tenant_id,
      message: "Payment request created",
      data: await this.paymentService.createTransaction(scope, dto, user_id),
    };
  }

  @Put("transactions/:id/approve")
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  async approveTransaction(
    @Req() request: RequestWithTenant,
    @Param("id") paymentId: string,
  ) {
    const scope = await this.scopeResolver.resolve(request.tenantContext);
    const user_id = this.requireActor(request);
    return {
      success: true,
      tenant_id: scope.tenant_id,
      message: "Payment approved",
      data: await this.paymentService.approveTransaction(scope, paymentId, user_id),
    };
  }

  @Put("transactions/:id/reject")
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  async rejectTransaction(
    @Req() request: RequestWithTenant,
    @Param("id") paymentId: string,
  ) {
    const scope = await this.scopeResolver.resolve(request.tenantContext);
    const user_id = this.requireActor(request);
    return {
      success: true,
      tenant_id: scope.tenant_id,
      message: "Payment rejected",
      data: await this.paymentService.rejectTransaction(scope, paymentId, user_id),
    };
  }

  @Put("transactions/:id/route")
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  async routeTransaction(
    @Req() request: RequestWithTenant,
    @Param("id") paymentId: string,
    @Body() dto: RoutePaymentDto,
  ) {
    const scope = await this.scopeResolver.resolve(request.tenantContext);
    const user_id = this.requireActor(request);
    return {
      success: true,
      tenant_id: scope.tenant_id,
      message: "Provider selected",
      data: await this.paymentService.routeTransaction(scope, paymentId, dto, user_id),
    };
  }

  @Put("transactions/:id/execute")
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  async executeTransaction(
    @Req() request: RequestWithTenant,
    @Param("id") paymentId: string,
    @Body() dto: ExecutePaymentDto,
  ) {
    const scope = await this.scopeResolver.resolve(request.tenantContext);
    const user_id = this.requireActor(request);
    return {
      success: true,
      tenant_id: scope.tenant_id,
      message: "Execution processed",
      data: await this.paymentService.executeTransaction(scope, paymentId, dto, user_id),
    };
  }

  @Put("transactions/:id/settle")
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  async settleTransaction(
    @Req() request: RequestWithTenant,
    @Param("id") paymentId: string,
  ) {
    const scope = await this.scopeResolver.resolve(request.tenantContext);
    const user_id = this.requireActor(request);
    return {
      success: true,
      tenant_id: scope.tenant_id,
      message: "Settlement confirmed",
      data: await this.paymentService.settleTransaction(scope, paymentId, user_id),
    };
  }

  @Post("transactions/settle-batch")
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  async settleBatch(
    @Req() request: RequestWithTenant,
    @Body() dto: { transactionIds: string[] },
  ) {
    const scope = await this.scopeResolver.resolve(request.tenantContext);
    const user_id = this.requireActor(request);
    return {
      success: true,
      tenant_id: scope.tenant_id,
      message: "Batch settlement processed",
      data: await this.paymentService.settleBatch(scope, dto, user_id),
    };
  }

  @Get("providers")
  async getProviders(@Req() request: RequestWithTenant) {
    const scope = await this.scopeResolver.resolve(request.tenantContext);
    const data = await this.paymentService.getProviders(scope);
    return { success: true, tenant_id: scope.tenant_id, count: data.length, data };
  }

  @Put("providers/:id/status")
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  async updateProviderStatus(
    @Req() request: RequestWithTenant,
    @Param("id") providerId: string,
    @Body() dto: UpdateProviderStatusDto,
  ) {
    const scope = await this.scopeResolver.resolve(request.tenantContext);
    const user_id = this.requireActor(request);
    return {
      success: true,
      tenant_id: scope.tenant_id,
      message: "Provider status updated",
      data: await this.paymentService.updateProviderStatus(scope, providerId, dto, user_id),
    };
  }

  @Post("providers/health-sweep")
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  async runProviderHealthSweep(@Req() request: RequestWithTenant) {
    const scope = await this.scopeResolver.resolve(request.tenantContext);
    const user_id = this.requireActor(request);
    const data = await this.paymentService.runProviderHealthSweep(scope, user_id);
    return {
      success: true,
      tenant_id: scope.tenant_id,
      message: "Provider health sweep completed",
      count: data.length,
      data,
    };
  }

  @Get("routing-policies")
  async getRoutingPolicies(@Req() request: RequestWithTenant) {
    const scope = await this.scopeResolver.resolve(request.tenantContext);
    const data = await this.paymentService.getRoutingPolicies(scope);
    return { success: true, tenant_id: scope.tenant_id, count: data.length, data };
  }

  @Get("devices")
  async getDevices(@Req() request: RequestWithTenant) {
    const scope = await this.scopeResolver.resolve(request.tenantContext);
    const data = await this.paymentService.getDevices(scope);
    return { success: true, tenant_id: scope.tenant_id, count: data.length, data };
  }

  @Get("device-pools")
  async getDevicePools(@Req() request: RequestWithTenant) {
    const scope = await this.scopeResolver.resolve(request.tenantContext);
    const data = await this.paymentService.getDevicePools(scope);
    return { success: true, tenant_id: scope.tenant_id, count: data.length, data };
  }

  @Put("devices/:id/status")
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  async updateDeviceStatus(
    @Req() request: RequestWithTenant,
    @Param("id") device_id: string,
    @Body() dto: UpdateDeviceStatusDto,
  ) {
    const scope = await this.scopeResolver.resolve(request.tenantContext);
    const user_id = this.requireActor(request);
    return {
      success: true,
      tenant_id: scope.tenant_id,
      message: "Device status updated",
      data: await this.paymentService.updateDeviceStatus(scope, device_id, dto, user_id),
    };
  }

  @Get("refunds")
  async getRefunds(@Req() request: RequestWithTenant) {
    const scope = await this.scopeResolver.resolve(request.tenantContext);
    const data = await this.paymentService.getRefunds(scope);
    return { success: true, tenant_id: scope.tenant_id, count: data.length, data };
  }

  @Post("refunds")
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.MEMBER)
  async createRefund(
    @Req() request: RequestWithTenant,
    @Body() dto: CreateRefundDto,
  ) {
    const scope = await this.scopeResolver.resolve(request.tenantContext);
    const user_id = this.requireActor(request);
    return {
      success: true,
      tenant_id: scope.tenant_id,
      message: "Refund requested",
      data: await this.paymentService.createRefund(scope, dto, user_id),
    };
  }

  @Put("refunds/:id/approve")
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  async approveRefund(
    @Req() request: RequestWithTenant,
    @Param("id") refundId: string,
  ) {
    const scope = await this.scopeResolver.resolve(request.tenantContext);
    const user_id = this.requireActor(request);
    return {
      success: true,
      tenant_id: scope.tenant_id,
      message: "Refund approved",
      data: await this.paymentService.approveRefund(scope, refundId, user_id),
    };
  }

  @Put("refunds/:id/execute")
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  async executeRefund(
    @Req() request: RequestWithTenant,
    @Param("id") refundId: string,
  ) {
    const scope = await this.scopeResolver.resolve(request.tenantContext);
    const user_id = this.requireActor(request);
    return {
      success: true,
      tenant_id: scope.tenant_id,
      message: "Refund executed",
      data: await this.paymentService.executeRefund(scope, refundId, user_id),
    };
  }

  @Get("disputes")
  async getDisputes(@Req() request: RequestWithTenant) {
    const scope = await this.scopeResolver.resolve(request.tenantContext);
    const data = await this.paymentService.getDisputes(scope);
    return { success: true, tenant_id: scope.tenant_id, count: data.length, data };
  }

  @Post("disputes")
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.MEMBER)
  async createDispute(
    @Req() request: RequestWithTenant,
    @Body() dto: CreateDisputeDto,
  ) {
    const scope = await this.scopeResolver.resolve(request.tenantContext);
    const user_id = this.requireActor(request);
    return {
      success: true,
      tenant_id: scope.tenant_id,
      message: "Dispute opened",
      data: await this.paymentService.createDispute(scope, dto, user_id),
    };
  }

  @Put("disputes/:id/evidence")
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.MEMBER)
  async attachDisputeEvidence(
    @Req() request: RequestWithTenant,
    @Param("id") disputeId: string,
    @Body() dto: AttachDisputeEvidenceDto,
  ) {
    const scope = await this.scopeResolver.resolve(request.tenantContext);
    const user_id = this.requireActor(request);
    return {
      success: true,
      tenant_id: scope.tenant_id,
      message: "Evidence attached",
      data: await this.paymentService.attachDisputeEvidence(scope, disputeId, dto, user_id),
    };
  }

  @Put("disputes/:id/progress")
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  async progressDispute(
    @Req() request: RequestWithTenant,
    @Param("id") disputeId: string,
    @Body() dto: ProgressDisputeDto,
  ) {
    const scope = await this.scopeResolver.resolve(request.tenantContext);
    const user_id = this.requireActor(request);
    return {
      success: true,
      tenant_id: scope.tenant_id,
      message: "Dispute stage updated",
      data: await this.paymentService.progressDispute(scope, disputeId, dto, user_id),
    };
  }

  @Put("disputes/:id/resolve")
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  async resolveDispute(
    @Req() request: RequestWithTenant,
    @Param("id") disputeId: string,
    @Body() dto: ResolveDisputeDto,
  ) {
    const scope = await this.scopeResolver.resolve(request.tenantContext);
    const user_id = this.requireActor(request);
    return {
      success: true,
      tenant_id: scope.tenant_id,
      message: "Dispute resolved",
      data: await this.paymentService.resolveDispute(scope, disputeId, dto, user_id),
    };
  }

  @Get("chargebacks")
  async getChargebacks(@Req() request: RequestWithTenant) {
    const scope = await this.scopeResolver.resolve(request.tenantContext);
    const data = await this.paymentService.getChargebacks(scope);
    return { success: true, tenant_id: scope.tenant_id, count: data.length, data };
  }

  @Get("settlements")
  async getSettlements(@Req() request: RequestWithTenant) {
    const scope = await this.scopeResolver.resolve(request.tenantContext);
    const data = await this.paymentService.getSettlements(scope);
    return { success: true, tenant_id: scope.tenant_id, count: data.length, data };
  }

  @Get("evidence-packs")
  async getEvidencePacks(@Req() request: RequestWithTenant) {
    const scope = await this.scopeResolver.resolve(request.tenantContext);
    const data = await this.paymentService.getEvidencePacks(scope);
    return { success: true, tenant_id: scope.tenant_id, count: data.length, data };
  }

  @Get("audit-events")
  async getAuditEvents(@Req() request: RequestWithTenant) {
    const scope = await this.scopeResolver.resolve(request.tenantContext);
    const data = await this.paymentService.getAuditEvents(scope);
    return { success: true, tenant_id: scope.tenant_id, count: data.length, data };
  }

  @Get("settings")
  async getSettings(@Req() request: RequestWithTenant) {
    const scope = await this.scopeResolver.resolve(request.tenantContext);
    return {
      success: true,
      tenant_id: scope.tenant_id,
      data: await this.paymentService.getPaymentSettings(scope),
    };
  }

  @Put("settings")
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  async updateSettings(
    @Req() request: RequestWithTenant,
    @Body() data: any,
  ) {
    const scope = await this.scopeResolver.resolve(request.tenantContext);
    // Actor identity is verified even though the underlying settings update does
    // not yet attribute an actor; rejecting an unauthenticated mutating request
    // here preserves bug-class #1's guarantee (Requirement 2.10).
    this.requireActor(request);
    return {
      success: true,
      tenant_id: scope.tenant_id,
      message: "Payment settings updated",
      data: await this.paymentService.updatePaymentSettings(scope, data),
    };
  }

  @Post("cash")
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.MEMBER)
  async processCash(
    @Req() request: RequestWithTenant,
    @Body() dto: CreatePaymentTransactionDto,
  ) {
    const scope = await this.scopeResolver.resolve(request.tenantContext);
    const user_id = this.requireActor(request);
    return {
      success: true,
      tenant_id: scope.tenant_id,
      message: "Cash payment confirmed",
      data: await this.paymentService.processCash(scope, dto, user_id),
    };
  }

  @Post("edc")
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.MEMBER)
  async confirmEDC(
    @Req() request: RequestWithTenant,
    @Body() dto: CreatePaymentTransactionDto,
  ) {
    const scope = await this.scopeResolver.resolve(request.tenantContext);
    const user_id = this.requireActor(request);
    return {
      success: true,
      tenant_id: scope.tenant_id,
      message: "EDC payment confirmed",
      data: await this.paymentService.confirmEDC(scope, dto, user_id),
    };
  }

  @Post("gateway/init")
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.MEMBER)
  async initGateway(
    @Req() request: RequestWithTenant,
    @Body() dto: CreatePaymentTransactionDto,
  ) {
    const scope = await this.scopeResolver.resolve(request.tenantContext);
    const user_id = this.requireActor(request);
    return {
      success: true,
      tenant_id: scope.tenant_id,
      message: "Gateway sequence started",
      data: await this.paymentService.createGatewayPayment(scope, dto, user_id),
    };
  }
}
