import {
  Body,
  Controller,
  Delete,
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
import { RequiredModule } from "../../shared/decorators/required-module.decorator";
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

@Controller('procurement')
@UseInterceptors(TenantInterceptor)
@UseGuards(ModuleStateGuard, BranchGatingGuard, TenantGuard)
@RequiredModule("procurement")
export class ProcurementController {
  constructor(
    private readonly procurementService: ProcurementService,
    private readonly prisma: PrismaService,
  ) {}

  // ─── OVERVIEW ────────────────────────────────────────────────────────────────

  @Get("overview")
  async getOverview(@Req() request: RequestWithTenant) {
    const { tenant_id } = request.tenantContext;
    const moduleContributions: any = {};

    if (await isModuleActive(this.prisma, tenant_id, "retail")) {
      const pendingTransfers = await this.prisma.procurement_requisitions.count({
        where: { ...MultiTenancyUtil.getScope(request.tenantContext), status: "SUBMITTED" },
      });
      moduleContributions.retail = { pendingStoreTransfers: pendingTransfers };
    }

    return { success: true, tenant_id, data: { moduleContributions } };
  }

  // ─── SUPPLIERS ───────────────────────────────────────────────────────────────

  @Get("suppliers")
  async getSuppliers(@Req() request: RequestWithTenant) {
    const { tenant_id } = request.tenantContext;
    const data = await this.procurementService.getSuppliers(request.tenantContext);
    return { success: true, tenant_id, count: data.length, data };
  }

  @Post("suppliers")
  async createSupplier(
    @Req() request: RequestWithTenant,
    @Body() dto: CreateSupplierDto,
  ) {
    const { tenant_id, user_id } = request.tenantContext;
    return {
      success: true,
      tenant_id,
      message: "Supplier created and routed for compliance verification",
      data: await this.procurementService.createSupplier(request.tenantContext, dto, user_id),
    };
  }

  // ─── SUPPLIER BRANCHES ────────────────────────────────────────────────────────

  @Get("branches")
  async getBranches(@Req() request: RequestWithTenant) {
    const { tenant_id } = request.tenantContext;
    const data = await this.procurementService.getSupplierBranches(request.tenantContext);
    return { success: true, tenant_id, count: data.length, data };
  }

  @Post("branches")
  async createBranch(
    @Req() request: RequestWithTenant,
    @Body() dto: CreateSupplierBranchDto,
  ) {
    const { tenant_id, user_id } = request.tenantContext;
    return {
      success: true,
      tenant_id,
      message: "Supplier branch created",
      data: await this.procurementService.createSupplierBranch(request.tenantContext, dto, user_id),
    };
  }

  // ─── SUPPLIER PRODUCTS ────────────────────────────────────────────────────────

  @Get("supplier-products")
  getSupplierProducts(@Req() request: RequestWithTenant) {
    return this.procurementService.getSupplierProducts(request.tenantContext);
  }

  @Post("supplier-products/upsert")
  upsertSupplierProduct(
    @Req() request: RequestWithTenant,
    @Body() data: UpsertSupplierProductDto,
  ) {
    const { user_id } = request.tenantContext;
    return this.procurementService.upsertSupplierProduct(request.tenantContext, data, user_id);
  }

  @Get("recommendations")
  getSupplierRecommendations(
    @Req() request: RequestWithTenant,
    @Query() params: any,
  ) {
    return this.procurementService.getSupplierRecommendations(request.tenantContext, params);
  }

  // ─── CATEGORIES ───────────────────────────────────────────────────────────────

  @Get("categories")
  getCategories(@Req() request: RequestWithTenant) {
    return this.procurementService.getCategories(request.tenantContext);
  }

  @Post("categories/upsert")
  upsertCategory(
    @Req() request: RequestWithTenant,
    @Body() data: CreateProcurementCategoryDto | UpdateProcurementCategoryDto,
  ) {
    const { user_id } = request.tenantContext;
    return this.procurementService.upsertCategory(request.tenantContext, user_id || "system", data);
  }

  @Delete("categories/:id")
  deleteCategory(
    @Req() request: RequestWithTenant,
    @Param("id") id: string,
  ) {
    const { user_id } = request.tenantContext;
    return this.procurementService.deleteCategory(request.tenantContext, user_id || "system", id);
  }

  // ─── REQUISITIONS ─────────────────────────────────────────────────────────────

  @Get("requisitions")
  async getRequisitions(@Req() request: RequestWithTenant) {
    const { tenant_id } = request.tenantContext;
    const data = await this.procurementService.getRequisitions(request.tenantContext);
    return { success: true, tenant_id, count: data.length, data };
  }

  @Post("requisitions")
  async createRequisition(
    @Req() request: RequestWithTenant,
    @Body() dto: CreateRequisitionDto,
  ) {
    const { tenant_id, user_id } = request.tenantContext;
    return {
      success: true,
      tenant_id,
      message: "Requisition created and routed to HOD",
      data: await this.procurementService.createRequisition(request.tenantContext, dto, user_id),
    };
  }

  @Put("requisitions/:id/approve-requester-hod")
  async approveRequesterHod(
    @Req() request: RequestWithTenant,
    @Param("id") requisitionId: string,
  ) {
    const { tenant_id, user_id } = request.tenantContext;
    return {
      success: true,
      tenant_id,
      message: "Requester HOD approval completed",
      data: await this.procurementService.approveRequesterHod(request.tenantContext, requisitionId, user_id),
    };
  }

  @Put("requisitions/:id/approve-final")
  async approveFinal(
    @Req() request: RequestWithTenant,
    @Param("id") requisitionId: string,
    @Body() dto: ApproveFinalDto,
  ) {
    const { tenant_id, user_id } = request.tenantContext;
    return {
      success: true,
      tenant_id,
      message: `Final approval by ${dto.approver} recorded`,
      data: await this.procurementService.approveFinal(request.tenantContext, requisitionId, dto, user_id),
    };
  }

  // ─── DRAFT PURCHASE ORDERS ────────────────────────────────────────────────────

  @Get("draft-pos")
  async getDraftPurchaseOrders(@Req() request: RequestWithTenant) {
    const { tenant_id } = request.tenantContext;
    const data = await this.procurementService.getDraftPurchaseOrders(request.tenantContext);
    return { success: true, tenant_id, count: data.length, data };
  }

  @Post("draft-pos")
  async createDraftPurchaseOrder(
    @Req() request: RequestWithTenant,
    @Body() dto: CreateDraftPoDto,
  ) {
    const { tenant_id, user_id } = request.tenantContext;
    return {
      success: true,
      tenant_id,
      message: "Draft purchase order created",
      data: await this.procurementService.createDraftPurchaseOrder(request.tenantContext, dto, user_id),
    };
  }

  @Put("draft-pos/:id/approve")
  async approveDraftByProcurementHod(
    @Req() request: RequestWithTenant,
    @Param("id") draftPoId: string,
  ) {
    const { tenant_id, user_id } = request.tenantContext;
    return {
      success: true,
      tenant_id,
      message: "Draft PO approved by Procurement HOD",
      data: await this.procurementService.approveDraftByProcurementHod(request.tenantContext, draftPoId, user_id),
    };
  }

  @Put("draft-pos/:id/confirm-quote")
  async confirmSupplierQuote(
    @Req() request: RequestWithTenant,
    @Param("id") draftPoId: string,
    @Body() dto: ConfirmQuoteDto,
  ) {
    const { tenant_id, user_id } = request.tenantContext;
    return {
      success: true,
      tenant_id,
      message: "Supplier quote confirmed",
      data: await this.procurementService.confirmSupplierQuote(request.tenantContext, draftPoId, dto, user_id),
    };
  }

  // ─── PURCHASE ORDERS (FINAL) ──────────────────────────────────────────────────

  @Get("purchase-orders")
  async getPurchaseOrders(@Req() request: RequestWithTenant) {
    const { tenant_id } = request.tenantContext;
    const data = await this.procurementService.getPurchaseOrders(request.tenantContext);
    return { success: true, tenant_id, count: data.length, data };
  }

  @Post("purchase-orders/release")
  async releasePo(
    @Req() request: RequestWithTenant,
    @Body() dto: ReleasePoDto,
  ) {
    const { tenant_id, user_id } = request.tenantContext;
    return {
      success: true,
      tenant_id,
      message: "Purchase order released and payable synchronized",
      data: await this.procurementService.releasePurchaseOrder(request.tenantContext, dto, user_id),
    };
  }

  // ─── RECEIPTS ─────────────────────────────────────────────────────────────────

  @Post("receipts")
  async recordReceipt(
    @Req() request: RequestWithTenant,
    @Body() dto: CreateReceiptDto,
  ) {
    const { tenant_id, user_id } = request.tenantContext;
    return {
      success: true,
      tenant_id,
      message: "Goods receipt recorded and supplier rating updated",
      data: await this.procurementService.createReceipt(request.tenantContext, dto, user_id),
    };
  }

  @Post("purchase-orders/:id/process-receipt")
  async processProcurementReceipt(
    @Req() request: RequestWithTenant,
    @Param("id") finalPoId: string,
    @Body() body: {
      location_id: string;
      items: Array<{ sku: string; quantity: number; unitCost?: number }>;
      receiptType?: "FULL" | "PARTIAL";
    },
  ) {
    const { tenant_id, user_id } = request.tenantContext;
    return await this.procurementService.processReceipt(request.tenantContext, finalPoId, body, user_id);
  }

  // ─── CONTRACTS ────────────────────────────────────────────────────────────────

  @Get("contracts")
  async getContracts(@Req() request: RequestWithTenant) {
    const { tenant_id } = request.tenantContext;
    const data = await this.procurementService.getContracts(request.tenantContext);
    return { success: true, tenant_id, count: data.length, data };
  }

  @Post("contracts")
  async createContract(
    @Req() request: RequestWithTenant,
    @Body() dto: CreateContractDto,
  ) {
    const { tenant_id, user_id } = request.tenantContext;
    return {
      success: true,
      tenant_id,
      message: "Contract packet created and routed to Legal",
      data: await this.procurementService.createContract(request.tenantContext, dto, user_id),
    };
  }

  @Put("contracts/:id/approve-legal")
  async approveLegalContract(
    @Req() request: RequestWithTenant,
    @Param("id") contractId: string,
  ) {
    const { tenant_id, user_id } = request.tenantContext;
    return {
      success: true,
      tenant_id,
      message: "Legal approval recorded",
      data: await this.procurementService.approveLegalContract(request.tenantContext, contractId, user_id),
    };
  }

  @Put("contracts/:id/sign")
  async signContract(
    @Req() request: RequestWithTenant,
    @Param("id") contractId: string,
    @Body() dto: SignContractDto,
  ) {
    const { tenant_id, user_id } = request.tenantContext;
    return {
      success: true,
      tenant_id,
      message: `Contract signed by ${dto.party}`,
      data: await this.procurementService.signContract(request.tenantContext, contractId, dto, user_id),
    };
  }

  // ─── RISK MANAGEMENT ──────────────────────────────────────────────────────────

  @Get("risk-signals")
  async getRiskSignals(@Req() request: RequestWithTenant) {
    const { tenant_id } = request.tenantContext;
    const data = await this.procurementService.getRiskSignals(request.tenantContext);
    return { success: true, tenant_id, count: data.length, data };
  }

  @Post("risk-signals")
  async createRiskSignal(
    @Req() request: RequestWithTenant,
    @Body() dto: CreateRiskSignalDto,
  ) {
    const { tenant_id, user_id } = request.tenantContext;
    return {
      success: true,
      tenant_id,
      message: "Risk signal created",
      data: await this.procurementService.createRiskSignal(request.tenantContext, dto, user_id),
    };
  }

  @Put("risk-signals/:id/status")
  async updateRiskSignalStatus(
    @Req() request: RequestWithTenant,
    @Param("id") riskSignalId: string,
    @Body() dto: UpdateRiskSignalStatusDto,
  ) {
    const { tenant_id, user_id } = request.tenantContext;
    return {
      success: true,
      tenant_id,
      message: `Risk signal status updated to ${dto.status}`,
      data: await this.procurementService.updateRiskSignalStatus(request.tenantContext, riskSignalId, dto.status, user_id),
    };
  }

  @Post("risk-scan")
  async runRiskScan(@Req() request: RequestWithTenant) {
    const { tenant_id, user_id } = request.tenantContext;
    const data = await this.procurementService.runRiskScan(request.tenantContext, user_id);
    return { success: true, tenant_id, message: "Risk scan completed", count: data.length, data };
  }

  // ─── PORTAL MESSAGES ──────────────────────────────────────────────────────────

  @Get("portal-messages")
  async getPortalMessages(@Req() request: RequestWithTenant) {
    const { tenant_id } = request.tenantContext;
    const data = await this.procurementService.getPortalMessages(request.tenantContext);
    return { success: true, tenant_id, count: data.length, data };
  }

  @Post("portal-messages")
  async createPortalMessage(
    @Req() request: RequestWithTenant,
    @Body() dto: CreatePortalMessageDto,
  ) {
    const { tenant_id, user_id } = request.tenantContext;
    return {
      success: true,
      tenant_id,
      message: "Portal message created",
      data: await this.procurementService.createPortalMessage(request.tenantContext, dto, user_id),
    };
  }

  // ─── AUDIT EVENTS ─────────────────────────────────────────────────────────────

  @Get("audit-events")
  async getAuditEvents(@Req() request: RequestWithTenant) {
    const { tenant_id } = request.tenantContext;
    const data = await this.procurementService.getAuditEvents(request.tenantContext);
    return { success: true, tenant_id, count: data.length, data };
  }

  @Post("audit-events")
  async createAuditEvent(
    @Req() request: RequestWithTenant,
    @Body() body: any,
  ) {
    const { tenant_id, user_id } = request.tenantContext;
    const data = await this.procurementService.createAuditEventDirect(request.tenantContext, body, user_id);
    return { success: true, tenant_id, data };
  }

  // ─── SPEND INSIGHTS ────────────────────────────────────────────────────────────

  @Get("spend-insights")
  async getSpendInsights(@Req() request: RequestWithTenant) {
    const { tenant_id } = request.tenantContext;
    const data = await this.procurementService.getSpendInsights(request.tenantContext);
    return { success: true, tenant_id, count: data.length, data };
  }
}
