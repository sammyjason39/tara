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
import { CreateRequisitionDto } from './dto/create-requisition.dto';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { ReleasePoDto } from './dto/release-po.dto';
import { ProcurementService } from './procurement.service';

interface RequestWithTenant extends Request {
  tenantContext: TenantContext;
}

@Controller('procurement')
@UseInterceptors(TenantInterceptor)
export class ProcurementController {
  constructor(private readonly procurementService: ProcurementService) {}

  @Get('suppliers')
  async getSuppliers(@Req() request: RequestWithTenant) {
    const { tenantId } = request.tenantContext;
    const data = await this.procurementService.getSuppliers(tenantId);
    return { success: true, tenantId, count: data.length, data };
  }

  @Post('suppliers')
  async createSupplier(@Req() request: RequestWithTenant, @Body() dto: CreateSupplierDto) {
    const { tenantId } = request.tenantContext;
    return {
      success: true,
      tenantId,
      message: 'Supplier created',
      data: await this.procurementService.createSupplier(tenantId, dto),
    };
  }

  @Get('requisitions')
  async getRequisitions(@Req() request: RequestWithTenant) {
    const { tenantId } = request.tenantContext;
    const data = await this.procurementService.getRequisitions(tenantId);
    return { success: true, tenantId, count: data.length, data };
  }

  @Post('requisitions')
  async createRequisition(@Req() request: RequestWithTenant, @Body() dto: CreateRequisitionDto) {
    const { tenantId } = request.tenantContext;
    return {
      success: true,
      tenantId,
      message: 'Requisition created',
      data: await this.procurementService.createRequisition(tenantId, dto),
    };
  }

  @Put('requisitions/:id/approve-requester-hod')
  async approveRequesterHod(@Req() request: RequestWithTenant, @Param('id') requisitionId: string) {
    const { tenantId } = request.tenantContext;
    return {
      success: true,
      tenantId,
      message: 'Requester HOD approval completed',
      data: await this.procurementService.approveRequesterHod(tenantId, requisitionId),
    };
  }

  @Get('purchase-orders')
  async getPurchaseOrders(@Req() request: RequestWithTenant) {
    const { tenantId } = request.tenantContext;
    const data = await this.procurementService.getPurchaseOrders(tenantId);
    return { success: true, tenantId, count: data.length, data };
  }

  @Post('purchase-orders/release')
  async releasePo(@Req() request: RequestWithTenant, @Body() dto: ReleasePoDto) {
    const { tenantId } = request.tenantContext;
    return {
      success: true,
      tenantId,
      message: 'Purchase order released',
      data: await this.procurementService.releasePurchaseOrder(tenantId, dto),
    };
  }

  @Get('risk-signals')
  async getRiskSignals(@Req() request: RequestWithTenant) {
    const { tenantId } = request.tenantContext;
    const data = await this.procurementService.getRiskSignals(tenantId);
    return { success: true, tenantId, count: data.length, data };
  }

  @Post('risk-scan')
  async runRiskScan(@Req() request: RequestWithTenant) {
    const { tenantId } = request.tenantContext;
    const data = await this.procurementService.runRiskScan(tenantId);
    return {
      success: true,
      tenantId,
      message: 'Risk scan completed',
      count: data.length,
      data,
    };
  }
}

