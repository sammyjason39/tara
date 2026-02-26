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
import { CreateRequisitionDto } from "./dto/create-requisition.dto";
import { CreateSupplierDto } from "./dto/create-supplier.dto";
import { ReleasePoDto } from "./dto/release-po.dto";
import { ProcurementService } from "./procurement.service";
import { Query } from "@nestjs/common";

interface RequestWithTenant extends Request {
  tenantContext: TenantContext;
}

@Controller("procurement")
@UseInterceptors(TenantInterceptor)
@UseGuards(ModuleStateGuard, BranchGatingGuard)
@RequiredModule("procurement")
export class ProcurementController {
  constructor(private readonly procurementService: ProcurementService) {}

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
    const { tenantId } = request.tenantContext;
    return {
      success: true,
      tenantId,
      message: "Supplier created",
      data: await this.procurementService.createSupplier(tenantId, dto),
    };
  }

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
    const { tenantId } = request.tenantContext;
    return {
      success: true,
      tenantId,
      message: "Requisition created",
      data: await this.procurementService.createRequisition(tenantId, dto),
    };
  }

  @Put("requisitions/:id/approve-requester-hod")
  async approveRequesterHod(
    @Req() request: RequestWithTenant,
    @Param("id") requisitionId: string,
  ) {
    const { tenantId } = request.tenantContext;
    return {
      success: true,
      tenantId,
      message: "Requester HOD approval completed",
      data: await this.procurementService.approveRequesterHod(
        tenantId,
        requisitionId,
      ),
    };
  }

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
    const { tenantId } = request.tenantContext;
    return {
      success: true,
      tenantId,
      message: "Purchase order released",
      data: await this.procurementService.releasePurchaseOrder(tenantId, dto),
    };
  }

  @Get("risk-signals")
  async getRiskSignals(@Req() request: RequestWithTenant) {
    const { tenantId } = request.tenantContext;
    const data = await this.procurementService.getRiskSignals(tenantId);
    return { success: true, tenantId, count: data.length, data };
  }

  @Post("risk-scan")
  async runRiskScan(@Req() request: RequestWithTenant) {
    const { tenantId } = request.tenantContext;
    const data = await this.procurementService.runRiskScan(tenantId);
    return {
      success: true,
      tenantId,
      message: "Risk scan completed",
      count: data.length,
      data,
    };
  }

  @Get("branches")
  async getBranches(@Req() request: RequestWithTenant) {
    const { tenantId } = request.tenantContext;
    const data = await this.procurementService.getSupplierBranches(tenantId);
    return { success: true, tenantId, count: data.length, data };
  }

  @Get("products")
  async getProducts(@Req() request: RequestWithTenant) {
    const { tenantId } = request.tenantContext;
    const data = await this.procurementService.getSupplierProducts(tenantId);
    return { success: true, tenantId, count: data.length, data };
  }

  @Get("recommendations")
  async getRecommendations(
    @Req() request: RequestWithTenant,
    @Query() params: any,
  ) {
    const { tenantId } = request.tenantContext;
    const data = await this.procurementService.getSupplierRecommendations(
      tenantId,
      params,
    );
    return { success: true, tenantId, count: data.length, data };
  }

  @Get("draft-pos")
  async getDraftPurchaseOrders(@Req() request: RequestWithTenant) {
    const { tenantId } = request.tenantContext;
    const data = await this.procurementService.getDraftPurchaseOrders(tenantId);
    return { success: true, tenantId, count: data.length, data };
  }

  @Get("contracts")
  async getContracts(@Req() request: RequestWithTenant) {
    const { tenantId } = request.tenantContext;
    const data = await this.procurementService.getContracts(tenantId);
    return { success: true, tenantId, count: data.length, data };
  }

  @Get("audit-events")
  async getAuditEvents(@Req() request: RequestWithTenant) {
    const { tenantId } = request.tenantContext;
    const data = await this.procurementService.getAuditEvents(tenantId);
    return { success: true, tenantId, count: data.length, data };
  }

  @Get("spend-insights")
  async getSpendInsights(@Req() request: RequestWithTenant) {
    const { tenantId } = request.tenantContext;
    const data = await this.procurementService.getSpendInsights(tenantId);
    return { success: true, tenantId, count: data.length, data };
  }
}
