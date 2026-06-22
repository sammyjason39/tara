import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Post,
  Put,
  Req,
  UseInterceptors,
  UseGuards,
  Query,
} from "@nestjs/common";
import { Request } from "express";
import { TenantContext } from "../../gateway/tenant-context.interface";
import { TenantInterceptor } from "../../gateway/tenant.interceptor";
import { ModuleStateGuard } from "../auth/guards/module-state.guard";
import { BranchGatingGuard } from "../auth/guards/branch-gating.guard";
import { TenantGuard } from "../../shared/guards/tenant.guard";
import { RolesGuard } from "../../shared/guards/roles.guard";
import { Roles } from "../../shared/decorators/roles.decorator";
import { UserRole } from "../../shared/roles";
import { RequiredModule } from "../../shared/decorators/required-module.decorator";
import { TenantScopeResolver } from "../../shared/scope/tenant-scope.resolver";
import { CreateRequisitionDto } from "./dto/create-requisition.dto";
import { CreateSupplierDto } from "./dto/create-supplier.dto";
import { CreateSupplierBranchDto } from "./dto/create-supplier-branch.dto";
import { CreateDraftPoDto } from "./dto/create-draft-po.dto";
import { ConfirmQuoteDto } from "./dto/confirm-quote.dto";
import { CreateContractDto } from "./dto/create-contract.dto";
import { SignContractDto } from "./dto/sign-contract.dto";
import { ApproveFinalDto } from "./dto/approve-final.dto";
import { CreatePortalMessageDto } from "./dto/create-portal-message.dto";
import { CreateReceiptDto } from "./dto/create-receipt.dto";
import { UpsertSupplierProductDto } from "./dto/upsert-supplier-product.dto";
import { CreateRiskSignalDto, UpdateRiskSignalStatusDto } from "./dto/create-risk-signal.dto";
import { CreateProcurementCategoryDto } from "./dto/create-procurement-category.dto";
import { UpdateProcurementCategoryDto } from "./dto/update-procurement-category.dto";
import { ReleasePoDto } from "./dto/release-po.dto";
import { ProcurementService } from "./procurement.service";
import { PrismaService } from "../../persistence/prisma.service";
import { isModuleActive } from "../../shared/helpers/module-active.helper";
import { MultiTenancyUtil } from "../../shared/utils/multi-tenancy.util";

interface RequestWithTenant extends Request {
  tenantContext: TenantContext;
}

/**
 * Procurement Controller (Phase 2)
 *
 * Identity and scope are derived exclusively from the verified
 * `request.tenantContext` (populated by `TenantInterceptor` after the
 * JWT-bearing tenant middleware), never from client-supplied headers or body
 * fields (Requirements 2.1, 2.2, 2.5, 2.10). Each request resolves a validated
 * `TenantScope` via the shared `TenantScopeResolver` and passes that scope into
 * the Procurement service, which filters every read/write by the scope's
 * `tenant_id`. `RolesGuard` plus a `@Roles(...)` gate on every mutating handler
 * (create/update/approve/release/sign) enforces role-based access control;
 * `ModuleStateGuard` rejects requests when the Procurement module is inactive
 * for the tenant (Requirements 3.1, 3.2, 3.5, 3.6).
 */
@Controller('procurement')
@UseInterceptors(TenantInterceptor)
@UseGuards(ModuleStateGuard, BranchGatingGuard, TenantGuard, RolesGuard)
@RequiredModule("procurement")
export class ProcurementController {
  constructor(
    private readonly procurementService: ProcurementService,
    private readonly prisma: PrismaService,
    private readonly scopeResolver: TenantScopeResolver,
  ) {}

  /**
   * Resolve the verified actor `user_id` from the tenant context, rejecting a
   * mutating request that carries no verified user identity (Requirements 2.3,
   * 2.10). Actor identity is never taken from a client-supplied header.
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

  // ─── OVERVIEW ────────────────────────────────────────────────────────────────

  @Get("overview")
  async getOverview(@Req() request: RequestWithTenant) {
    const scope = await this.scopeResolver.resolve(request.tenantContext);
    const moduleContributions: any = {};

    if (await isModuleActive(this.prisma, scope.tenant_id, "retail")) {
      const pendingTransfers = await this.prisma.procurement_requisitions.count({
        where: { ...MultiTenancyUtil.getScope(scope), status: "SUBMITTED" },
      });
      moduleContributions.retail = { pendingStoreTransfers: pendingTransfers };
    }

    return { success: true, tenant_id: scope.tenant_id, data: { moduleContributions } };
  }

  // ─── SUPPLIERS ───────────────────────────────────────────────────────────────

  @Get("suppliers")
  async getSuppliers(@Req() request: RequestWithTenant) {
    const scope = await this.scopeResolver.resolve(request.tenantContext);
    const data = await this.procurementService.getSuppliers(scope);
    return { success: true, tenant_id: scope.tenant_id, count: data.length, data };
  }

  @Post("suppliers")
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  async createSupplier(
    @Req() request: RequestWithTenant,
    @Body() dto: CreateSupplierDto,
  ) {
    const scope = await this.scopeResolver.resolve(request.tenantContext);
    const user_id = this.requireActor(request);
    return {
      success: true,
      tenant_id: scope.tenant_id,
      message: "Supplier created and routed for compliance verification",
      data: await this.procurementService.createSupplier(scope, dto, user_id),
    };
  }

  // ─── SUPPLIER BRANCHES ────────────────────────────────────────────────────────

  @Get("branches")
  async getBranches(@Req() request: RequestWithTenant) {
    const scope = await this.scopeResolver.resolve(request.tenantContext);
    const data = await this.procurementService.getSupplierBranches(scope);
    return { success: true, tenant_id: scope.tenant_id, count: data.length, data };
  }

  @Post("branches")
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  async createBranch(
    @Req() request: RequestWithTenant,
    @Body() dto: CreateSupplierBranchDto,
  ) {
    const scope = await this.scopeResolver.resolve(request.tenantContext);
    const user_id = this.requireActor(request);
    return {
      success: true,
      tenant_id: scope.tenant_id,
      message: "Supplier branch created",
      data: await this.procurementService.createSupplierBranch(scope, dto, user_id),
    };
  }

  // ─── SUPPLIER PRODUCTS ────────────────────────────────────────────────────────

  @Get("supplier-products")
  async getSupplierProducts(@Req() request: RequestWithTenant) {
    const scope = await this.scopeResolver.resolve(request.tenantContext);
    return this.procurementService.getSupplierProducts(scope);
  }

  @Post("supplier-products/upsert")
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  async upsertSupplierProduct(
    @Req() request: RequestWithTenant,
    @Body() data: UpsertSupplierProductDto,
  ) {
    const scope = await this.scopeResolver.resolve(request.tenantContext);
    const user_id = this.requireActor(request);
    return this.procurementService.upsertSupplierProduct(scope, data, user_id);
  }

  @Get("recommendations")
  async getSupplierRecommendations(
    @Req() request: RequestWithTenant,
    @Query() params: any,
  ) {
    const scope = await this.scopeResolver.resolve(request.tenantContext);
    return this.procurementService.getSupplierRecommendations(scope, params);
  }

  // ─── CATEGORIES ───────────────────────────────────────────────────────────────

  @Get("categories")
  async getCategories(@Req() request: RequestWithTenant) {
    const scope = await this.scopeResolver.resolve(request.tenantContext);
    return this.procurementService.getCategories(scope);
  }

  @Post("categories/upsert")
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  async upsertCategory(
    @Req() request: RequestWithTenant,
    @Body() data: CreateProcurementCategoryDto | UpdateProcurementCategoryDto,
  ) {
    const scope = await this.scopeResolver.resolve(request.tenantContext);
    const user_id = this.requireActor(request);
    return this.procurementService.upsertCategory(scope, user_id, data);
  }

  @Delete("categories/:id")
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  async deleteCategory(
    @Req() request: RequestWithTenant,
    @Param("id") id: string,
  ) {
    const scope = await this.scopeResolver.resolve(request.tenantContext);
    const user_id = this.requireActor(request);
    return this.procurementService.deleteCategory(scope, user_id, id);
  }

  // ─── REQUISITIONS ─────────────────────────────────────────────────────────────

  @Get("requisitions")
  async getRequisitions(@Req() request: RequestWithTenant) {
    const scope = await this.scopeResolver.resolve(request.tenantContext);
    const data = await this.procurementService.getRequisitions(scope);
    return { success: true, tenant_id: scope.tenant_id, count: data.length, data };
  }

  @Post("requisitions")
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.MEMBER)
  async createRequisition(
    @Req() request: RequestWithTenant,
    @Body() dto: CreateRequisitionDto,
  ) {
    const scope = await this.scopeResolver.resolve(request.tenantContext);
    const user_id = this.requireActor(request);
    return {
      success: true,
      tenant_id: scope.tenant_id,
      message: "Requisition created and routed to HOD",
      data: await this.procurementService.createRequisition(scope, dto, user_id),
    };
  }

  @Put("requisitions/:id/approve-requester-hod")
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  async approveRequesterHod(
    @Req() request: RequestWithTenant,
    @Param("id") requisitionId: string,
  ) {
    const scope = await this.scopeResolver.resolve(request.tenantContext);
    const user_id = this.requireActor(request);
    return {
      success: true,
      tenant_id: scope.tenant_id,
      message: "Requester HOD approval completed",
      data: await this.procurementService.approveRequesterHod(scope, requisitionId, user_id),
    };
  }

  @Put("requisitions/:id/approve-final")
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  async approveFinal(
    @Req() request: RequestWithTenant,
    @Param("id") requisitionId: string,
    @Body() dto: ApproveFinalDto,
  ) {
    const scope = await this.scopeResolver.resolve(request.tenantContext);
    const user_id = this.requireActor(request);
    return {
      success: true,
      tenant_id: scope.tenant_id,
      message: `Final approval by ${dto.approver} recorded`,
      data: await this.procurementService.approveFinal(scope, requisitionId, dto, user_id),
    };
  }

  // ─── DRAFT PURCHASE ORDERS ────────────────────────────────────────────────────

  @Get("draft-pos")
  async getDraftPurchaseOrders(@Req() request: RequestWithTenant) {
    const scope = await this.scopeResolver.resolve(request.tenantContext);
    const data = await this.procurementService.getDraftPurchaseOrders(scope);
    return { success: true, tenant_id: scope.tenant_id, count: data.length, data };
  }

  @Post("draft-pos")
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  async createDraftPurchaseOrder(
    @Req() request: RequestWithTenant,
    @Body() dto: CreateDraftPoDto,
  ) {
    const scope = await this.scopeResolver.resolve(request.tenantContext);
    const user_id = this.requireActor(request);
    return {
      success: true,
      tenant_id: scope.tenant_id,
      message: "Draft purchase order created",
      data: await this.procurementService.createDraftPurchaseOrder(scope, dto, user_id),
    };
  }

  @Put("draft-pos/:id/approve")
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  async approveDraftByProcurementHod(
    @Req() request: RequestWithTenant,
    @Param("id") draftPoId: string,
  ) {
    const scope = await this.scopeResolver.resolve(request.tenantContext);
    const user_id = this.requireActor(request);
    return {
      success: true,
      tenant_id: scope.tenant_id,
      message: "Draft PO approved by Procurement HOD",
      data: await this.procurementService.approveDraftByProcurementHod(scope, draftPoId, user_id),
    };
  }

  @Put("draft-pos/:id/confirm-quote")
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  async confirmSupplierQuote(
    @Req() request: RequestWithTenant,
    @Param("id") draftPoId: string,
    @Body() dto: ConfirmQuoteDto,
  ) {
    const scope = await this.scopeResolver.resolve(request.tenantContext);
    const user_id = this.requireActor(request);
    return {
      success: true,
      tenant_id: scope.tenant_id,
      message: "Supplier quote confirmed",
      data: await this.procurementService.confirmSupplierQuote(scope, draftPoId, dto, user_id),
    };
  }

  // ─── PURCHASE ORDERS (FINAL) ──────────────────────────────────────────────────

  @Get("purchase-orders")
  async getPurchaseOrders(@Req() request: RequestWithTenant) {
    const scope = await this.scopeResolver.resolve(request.tenantContext);
    const data = await this.procurementService.getPurchaseOrders(scope);
    return { success: true, tenant_id: scope.tenant_id, count: data.length, data };
  }

  @Post("purchase-orders/release")
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  async releasePo(
    @Req() request: RequestWithTenant,
    @Body() dto: ReleasePoDto,
  ) {
    const scope = await this.scopeResolver.resolve(request.tenantContext);
    const user_id = this.requireActor(request);
    return {
      success: true,
      tenant_id: scope.tenant_id,
      message: "Purchase order released and payable synchronized",
      data: await this.procurementService.releasePurchaseOrder(scope, dto, user_id),
    };
  }

  // ─── RECEIPTS ─────────────────────────────────────────────────────────────────

  @Post("receipts")
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  async recordReceipt(
    @Req() request: RequestWithTenant,
    @Body() dto: CreateReceiptDto,
  ) {
    const scope = await this.scopeResolver.resolve(request.tenantContext);
    const user_id = this.requireActor(request);
    return {
      success: true,
      tenant_id: scope.tenant_id,
      message: "Goods receipt recorded and supplier rating updated",
      data: await this.procurementService.createReceipt(scope, dto, user_id),
    };
  }

  @Post("purchase-orders/:id/process-receipt")
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  async processProcurementReceipt(
    @Req() request: RequestWithTenant,
    @Param("id") finalPoId: string,
    @Body() body: {
      location_id: string;
      items: Array<{ sku: string; quantity: number; unitCost?: number }>;
      receiptType?: "FULL" | "PARTIAL";
    },
  ) {
    const scope = await this.scopeResolver.resolve(request.tenantContext);
    const user_id = this.requireActor(request);
    return await this.procurementService.processReceipt(scope, finalPoId, body, user_id);
  }

  // ─── CONTRACTS ────────────────────────────────────────────────────────────────

  @Get("contracts")
  async getContracts(@Req() request: RequestWithTenant) {
    const scope = await this.scopeResolver.resolve(request.tenantContext);
    const data = await this.procurementService.getContracts(scope);
    return { success: true, tenant_id: scope.tenant_id, count: data.length, data };
  }

  @Post("contracts")
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  async createContract(
    @Req() request: RequestWithTenant,
    @Body() dto: CreateContractDto,
  ) {
    const scope = await this.scopeResolver.resolve(request.tenantContext);
    const user_id = this.requireActor(request);
    return {
      success: true,
      tenant_id: scope.tenant_id,
      message: "Contract packet created and routed to Legal",
      data: await this.procurementService.createContract(scope, dto, user_id),
    };
  }

  @Put("contracts/:id/approve-legal")
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  async approveLegalContract(
    @Req() request: RequestWithTenant,
    @Param("id") contractId: string,
  ) {
    const scope = await this.scopeResolver.resolve(request.tenantContext);
    const user_id = this.requireActor(request);
    return {
      success: true,
      tenant_id: scope.tenant_id,
      message: "Legal approval recorded",
      data: await this.procurementService.approveLegalContract(scope, contractId, user_id),
    };
  }

  @Put("contracts/:id/sign")
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  async signContract(
    @Req() request: RequestWithTenant,
    @Param("id") contractId: string,
    @Body() dto: SignContractDto,
  ) {
    const scope = await this.scopeResolver.resolve(request.tenantContext);
    const user_id = this.requireActor(request);
    return {
      success: true,
      tenant_id: scope.tenant_id,
      message: `Contract signed by ${dto.party}`,
      data: await this.procurementService.signContract(scope, contractId, dto, user_id),
    };
  }

  // ─── RISK MANAGEMENT ──────────────────────────────────────────────────────────

  @Get("risk-signals")
  async getRiskSignals(@Req() request: RequestWithTenant) {
    const scope = await this.scopeResolver.resolve(request.tenantContext);
    const data = await this.procurementService.getRiskSignals(scope);
    return { success: true, tenant_id: scope.tenant_id, count: data.length, data };
  }

  @Post("risk-signals")
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.MEMBER)
  async createRiskSignal(
    @Req() request: RequestWithTenant,
    @Body() dto: CreateRiskSignalDto,
  ) {
    const scope = await this.scopeResolver.resolve(request.tenantContext);
    const user_id = this.requireActor(request);
    return {
      success: true,
      tenant_id: scope.tenant_id,
      message: "Risk signal created",
      data: await this.procurementService.createRiskSignal(scope, dto, user_id),
    };
  }

  @Put("risk-signals/:id/status")
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  async updateRiskSignalStatus(
    @Req() request: RequestWithTenant,
    @Param("id") riskSignalId: string,
    @Body() dto: UpdateRiskSignalStatusDto,
  ) {
    const scope = await this.scopeResolver.resolve(request.tenantContext);
    const user_id = this.requireActor(request);
    return {
      success: true,
      tenant_id: scope.tenant_id,
      message: `Risk signal status updated to ${dto.status}`,
      data: await this.procurementService.updateRiskSignalStatus(scope, riskSignalId, dto.status, user_id),
    };
  }

  @Post("risk-scan")
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  async runRiskScan(@Req() request: RequestWithTenant) {
    const scope = await this.scopeResolver.resolve(request.tenantContext);
    const user_id = this.requireActor(request);
    const data = await this.procurementService.runRiskScan(scope, user_id);
    return { success: true, tenant_id: scope.tenant_id, message: "Risk scan completed", count: data.length, data };
  }

  // ─── PORTAL MESSAGES ──────────────────────────────────────────────────────────

  @Get("portal-messages")
  async getPortalMessages(@Req() request: RequestWithTenant) {
    const scope = await this.scopeResolver.resolve(request.tenantContext);
    const data = await this.procurementService.getPortalMessages(scope);
    return { success: true, tenant_id: scope.tenant_id, count: data.length, data };
  }

  @Post("portal-messages")
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.MEMBER)
  async createPortalMessage(
    @Req() request: RequestWithTenant,
    @Body() dto: CreatePortalMessageDto,
  ) {
    const scope = await this.scopeResolver.resolve(request.tenantContext);
    const user_id = this.requireActor(request);
    return {
      success: true,
      tenant_id: scope.tenant_id,
      message: "Portal message created",
      data: await this.procurementService.createPortalMessage(scope, dto, user_id),
    };
  }

  // ─── AUDIT EVENTS ─────────────────────────────────────────────────────────────

  @Get("audit-events")
  async getAuditEvents(@Req() request: RequestWithTenant) {
    const scope = await this.scopeResolver.resolve(request.tenantContext);
    const data = await this.procurementService.getAuditEvents(scope);
    return { success: true, tenant_id: scope.tenant_id, count: data.length, data };
  }

  @Post("audit-events")
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  async createAuditEvent(
    @Req() request: RequestWithTenant,
    @Body() body: any,
  ) {
    const scope = await this.scopeResolver.resolve(request.tenantContext);
    const user_id = this.requireActor(request);
    const data = await this.procurementService.createAuditEventDirect(scope, body, user_id);
    return { success: true, tenant_id: scope.tenant_id, data };
  }

  // ─── SPEND INSIGHTS ────────────────────────────────────────────────────────────

  @Get("spend-insights")
  async getSpendInsights(@Req() request: RequestWithTenant) {
    const scope = await this.scopeResolver.resolve(request.tenantContext);
    const data = await this.procurementService.getSpendInsights(scope);
    return { success: true, tenant_id: scope.tenant_id, count: data.length, data };
  }
}
