import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
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

interface RequestWithTenant extends Request {
  tenantContext: TenantContext;
}

@Controller("procurement")
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
    const { tenantId } = request.tenantContext;
    const moduleContributions: any = {};

    if (await isModuleActive(this.prisma, tenantId, "retail")) {
      const pendingTransfers = await this.prisma.procurementRequisition.count({
        where: { tenantId, status: "SUBMITTED" },
      });
      moduleContributions.retail = { pendingStoreTransfers: pendingTransfers };
    }

    return { success: true, tenantId, data: { moduleContributions } };
  }

  // ─── SUPPLIERS ───────────────────────────────────────────────────────────────

  @Get("suppliers")
  async getSuppliers(@Req() request: RequestWithTenant) {
    const { tenantId } = request.tenantContext;
    const data = await this.procurementService.getSuppliers(tenantId);
    return { success: true, tenantId, count: data.length, data };
  }

  @Post("suppliers")
  async createSupplier(
    @Req() request: RequestWithTenant,
    @Body() dto: CreateSupplierDto,
  ) {
    const { tenantId, userId } = request.tenantContext;
    return {
      success: true,
      tenantId,
      message: "Supplier created and routed for compliance verification",
      data: await this.procurementService.createSupplier(tenantId, dto, userId),
    };
  }

  // ─── SUPPLIER BRANCHES ────────────────────────────────────────────────────────

  @Get("branches")
  async getBranches(@Req() request: RequestWithTenant) {
    const { tenantId } = request.tenantContext;
    const data = await this.procurementService.getSupplierBranches(tenantId);
    return { success: true, tenantId, count: data.length, data };
  }

  @Post("branches")
  async createBranch(
    @Req() request: RequestWithTenant,
    @Body() dto: CreateSupplierBranchDto,
  ) {
    const { tenantId, userId } = request.tenantContext;
    return {
      success: true,
      tenantId,
      message: "Supplier branch created",
      data: await this.procurementService.createSupplierBranch(tenantId, dto, userId),
    };
  }

  // ─── SUPPLIER PRODUCTS ────────────────────────────────────────────────────────

  @Get("supplier-products")
  getSupplierProducts(@Headers("x-tenant-id") tenantId: string) {
    return this.procurementService.getSupplierProducts(tenantId);
  }

  @Post("supplier-products/upsert")
  upsertSupplierProduct(
    @Headers("x-tenant-id") tenantId: string,
    @Body() data: UpsertSupplierProductDto,
    @Req() req: Request,
  ) {
    return this.procurementService.upsertSupplierProduct(tenantId, data, (req as any).user?.id);
  }

  @Get("supplier-recommendations")
  getSupplierRecommendations(
    @Headers("x-tenant-id") tenantId: string,
    @Query() params: any,
  ) {
    return this.procurementService.getSupplierRecommendations(tenantId, params);
  }

  // ─── CATEGORIES ───────────────────────────────────────────────────────────────

  @Get("categories")
  getCategories(@Headers("x-tenant-id") tenantId: string) {
    return this.procurementService.getCategories(tenantId);
  }

  @Post("categories/upsert")
  upsertCategory(
    @Headers("x-tenant-id") tenantId: string,
    @Body() data: CreateProcurementCategoryDto | UpdateProcurementCategoryDto,
    @Req() req: Request,
  ) {
    return this.procurementService.upsertCategory(tenantId, (req as any).user?.id || "system", data);
  }

  @Delete("categories/:id")
  deleteCategory(
    @Headers("x-tenant-id") tenantId: string,
    @Param("id") id: string,
    @Req() req: Request,
  ) {
    return this.procurementService.deleteCategory(tenantId, (req as any).user?.id || "system", id);
  }

  // ─── REQUISITIONS ─────────────────────────────────────────────────────────────

  @Get("requisitions")
  async getRequisitions(@Req() request: RequestWithTenant) {
    const { tenantId } = request.tenantContext;
    const data = await this.procurementService.getRequisitions(tenantId);
    return { success: true, tenantId, count: data.length, data };
  }

  @Post("requisitions")
  async createRequisition(
    @Req() request: RequestWithTenant,
    @Body() dto: CreateRequisitionDto,
  ) {
    const { tenantId, userId } = request.tenantContext;
    return {
      success: true,
      tenantId,
      message: "Requisition created and routed to HOD",
      data: await this.procurementService.createRequisition(tenantId, dto, userId),
    };
  }

  @Put("requisitions/:id/approve-requester-hod")
  async approveRequesterHod(
    @Req() request: RequestWithTenant,
    @Param("id") requisitionId: string,
  ) {
    const { tenantId, userId } = request.tenantContext;
    return {
      success: true,
      tenantId,
      message: "Requester HOD approval completed",
      data: await this.procurementService.approveRequesterHod(tenantId, requisitionId, userId),
    };
  }

  @Put("requisitions/:id/approve-final")
  async approveFinal(
    @Req() request: RequestWithTenant,
    @Param("id") requisitionId: string,
    @Body() dto: ApproveFinalDto,
  ) {
    const { tenantId, userId } = request.tenantContext;
    return {
      success: true,
      tenantId,
      message: `Final approval by ${dto.approver} recorded`,
      data: await this.procurementService.approveFinal(tenantId, requisitionId, dto, userId),
    };
  }

  // ─── DRAFT PURCHASE ORDERS ────────────────────────────────────────────────────

  @Get("draft-pos")
  async getDraftPurchaseOrders(@Req() request: RequestWithTenant) {
    const { tenantId } = request.tenantContext;
    const data = await this.procurementService.getDraftPurchaseOrders(tenantId);
    return { success: true, tenantId, count: data.length, data };
  }

  @Post("draft-pos")
  async createDraftPurchaseOrder(
    @Req() request: RequestWithTenant,
    @Body() dto: CreateDraftPoDto,
  ) {
    const { tenantId, userId } = request.tenantContext;
    return {
      success: true,
      tenantId,
      message: "Draft purchase order created",
      data: await this.procurementService.createDraftPurchaseOrder(tenantId, dto, userId),
    };
  }

  @Put("draft-pos/:id/approve")
  async approveDraftByProcurementHod(
    @Req() request: RequestWithTenant,
    @Param("id") draftPoId: string,
  ) {
    const { tenantId, userId } = request.tenantContext;
    return {
      success: true,
      tenantId,
      message: "Draft PO approved by Procurement HOD",
      data: await this.procurementService.approveDraftByProcurementHod(tenantId, draftPoId, userId),
    };
  }

  @Put("draft-pos/:id/confirm-quote")
  async confirmSupplierQuote(
    @Req() request: RequestWithTenant,
    @Param("id") draftPoId: string,
    @Body() dto: ConfirmQuoteDto,
  ) {
    const { tenantId, userId } = request.tenantContext;
    return {
      success: true,
      tenantId,
      message: "Supplier quote confirmed",
      data: await this.procurementService.confirmSupplierQuote(tenantId, draftPoId, dto, userId),
    };
  }

  // ─── PURCHASE ORDERS (FINAL) ──────────────────────────────────────────────────

  @Get("purchase-orders")
  async getPurchaseOrders(@Req() request: RequestWithTenant) {
    const { tenantId } = request.tenantContext;
    const data = await this.procurementService.getPurchaseOrders(tenantId);
    return { success: true, tenantId, count: data.length, data };
  }

  @Post("purchase-orders/release")
  async releasePo(
    @Req() request: RequestWithTenant,
    @Body() dto: ReleasePoDto,
  ) {
    const { tenantId, userId } = request.tenantContext;
    return {
      success: true,
      tenantId,
      message: "Purchase order released and payable synchronized",
      data: await this.procurementService.releasePurchaseOrder(tenantId, dto, userId),
    };
  }

  // ─── RECEIPTS ─────────────────────────────────────────────────────────────────

  @Post("receipts")
  async recordReceipt(
    @Req() request: RequestWithTenant,
    @Body() dto: CreateReceiptDto,
  ) {
    const { tenantId, userId } = request.tenantContext;
    return {
      success: true,
      tenantId,
      message: "Goods receipt recorded and supplier rating updated",
      data: await this.procurementService.createReceipt(tenantId, dto, userId),
    };
  }

  // ─── CONTRACTS ────────────────────────────────────────────────────────────────

  @Get("contracts")
  async getContracts(@Req() request: RequestWithTenant) {
    const { tenantId } = request.tenantContext;
    const data = await this.procurementService.getContracts(tenantId);
    return { success: true, tenantId, count: data.length, data };
  }

  @Post("contracts")
  async createContract(
    @Req() request: RequestWithTenant,
    @Body() dto: CreateContractDto,
  ) {
    const { tenantId, userId } = request.tenantContext;
    return {
      success: true,
      tenantId,
      message: "Contract packet created and routed to Legal",
      data: await this.procurementService.createContract(tenantId, dto, userId),
    };
  }

  @Put("contracts/:id/approve-legal")
  async approveLegalContract(
    @Req() request: RequestWithTenant,
    @Param("id") contractId: string,
  ) {
    const { tenantId, userId } = request.tenantContext;
    return {
      success: true,
      tenantId,
      message: "Legal approval recorded",
      data: await this.procurementService.approveLegalContract(tenantId, contractId, userId),
    };
  }

  @Put("contracts/:id/sign")
  async signContract(
    @Req() request: RequestWithTenant,
    @Param("id") contractId: string,
    @Body() dto: SignContractDto,
  ) {
    const { tenantId, userId } = request.tenantContext;
    return {
      success: true,
      tenantId,
      message: `Contract signed by ${dto.party}`,
      data: await this.procurementService.signContract(tenantId, contractId, dto, userId),
    };
  }

  // ─── RISK MANAGEMENT ──────────────────────────────────────────────────────────

  @Get("risk-signals")
  async getRiskSignals(@Req() request: RequestWithTenant) {
    const { tenantId } = request.tenantContext;
    const data = await this.procurementService.getRiskSignals(tenantId);
    return { success: true, tenantId, count: data.length, data };
  }

  @Post("risk-signals")
  async createRiskSignal(
    @Req() request: RequestWithTenant,
    @Body() dto: CreateRiskSignalDto,
  ) {
    const { tenantId, userId } = request.tenantContext;
    return {
      success: true,
      tenantId,
      message: "Risk signal created",
      data: await this.procurementService.createRiskSignal(tenantId, dto, userId),
    };
  }

  @Put("risk-signals/:id/status")
  async updateRiskSignalStatus(
    @Req() request: RequestWithTenant,
    @Param("id") riskSignalId: string,
    @Body() dto: UpdateRiskSignalStatusDto,
  ) {
    const { tenantId, userId } = request.tenantContext;
    return {
      success: true,
      tenantId,
      message: `Risk signal status updated to ${dto.status}`,
      data: await this.procurementService.updateRiskSignalStatus(tenantId, riskSignalId, dto.status, userId),
    };
  }

  @Post("risk-scan")
  async runRiskScan(@Req() request: RequestWithTenant) {
    const { tenantId, userId } = request.tenantContext;
    const data = await this.procurementService.runRiskScan(tenantId, userId);
    return { success: true, tenantId, message: "Risk scan completed", count: data.length, data };
  }

  // ─── PORTAL MESSAGES ──────────────────────────────────────────────────────────

  @Get("portal-messages")
  async getPortalMessages(@Req() request: RequestWithTenant) {
    const { tenantId } = request.tenantContext;
    const data = await this.procurementService.getPortalMessages(tenantId);
    return { success: true, tenantId, count: data.length, data };
  }

  @Post("portal-messages")
  async createPortalMessage(
    @Req() request: RequestWithTenant,
    @Body() dto: CreatePortalMessageDto,
  ) {
    const { tenantId, userId } = request.tenantContext;
    return {
      success: true,
      tenantId,
      message: "Portal message created",
      data: await this.procurementService.createPortalMessage(tenantId, dto, userId),
    };
  }

  // ─── AUDIT EVENTS ─────────────────────────────────────────────────────────────

  @Get("audit-events")
  async getAuditEvents(@Req() request: RequestWithTenant) {
    const { tenantId } = request.tenantContext;
    const data = await this.procurementService.getAuditEvents(tenantId);
    return { success: true, tenantId, count: data.length, data };
  }

  @Post("audit-events")
  async createAuditEvent(
    @Req() request: RequestWithTenant,
    @Body() body: any,
  ) {
    const { tenantId, userId } = request.tenantContext;
    const data = await this.procurementService.createAuditEventDirect(tenantId, body, userId);
    return { success: true, tenantId, data };
  }

  // ─── SPEND INSIGHTS ────────────────────────────────────────────────────────────

  @Get("spend-insights")
  async getSpendInsights(@Req() request: RequestWithTenant) {
    const { tenantId } = request.tenantContext;
    const data = await this.procurementService.getSpendInsights(tenantId);
    return { success: true, tenantId, count: data.length, data };
  }
}
