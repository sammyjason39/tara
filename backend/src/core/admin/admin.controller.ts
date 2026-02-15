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
import { CreateAdminRequestDto } from './dto/create-admin-request.dto';
import { ToggleModuleDto } from './dto/toggle-module.dto';
import { AdminService } from './admin.service';

interface RequestWithTenant extends Request {
  tenantContext: TenantContext;
}

@Controller('admin')
@UseInterceptors(TenantInterceptor)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('modules')
  async getModules(@Req() request: RequestWithTenant) {
    const { tenantId } = request.tenantContext;
    const data = await this.adminService.getModuleStatuses(tenantId);
    return { success: true, tenantId, count: data.length, data };
  }

  @Put('modules/toggle')
  async toggleModule(@Req() request: RequestWithTenant, @Body() dto: ToggleModuleDto) {
    const { tenantId } = request.tenantContext;
    return {
      success: true,
      tenantId,
      message: 'Module status updated',
      data: await this.adminService.toggleModule(tenantId, dto),
    };
  }

  @Get('requests')
  async getRequests(@Req() request: RequestWithTenant) {
    const { tenantId } = request.tenantContext;
    const data = await this.adminService.getRequests(tenantId);
    return { success: true, tenantId, count: data.length, data };
  }

  @Post('requests')
  async createRequest(@Req() request: RequestWithTenant, @Body() dto: CreateAdminRequestDto) {
    const { tenantId } = request.tenantContext;
    return {
      success: true,
      tenantId,
      message: 'Admin request created',
      data: await this.adminService.createRequest(tenantId, dto),
    };
  }

  @Put('requests/:id/resolve')
  async resolveRequest(
    @Req() request: RequestWithTenant,
    @Param('id') requestId: string,
    @Body() body: { resolvedBy: string },
  ) {
    const { tenantId } = request.tenantContext;
    return {
      success: true,
      tenantId,
      message: 'Admin request resolved',
      data: await this.adminService.resolveRequest(tenantId, requestId, body.resolvedBy || 'system'),
    };
  }

  @Get('audit-events')
  async getAuditEvents(@Req() request: RequestWithTenant) {
    const { tenantId } = request.tenantContext;
    const data = await this.adminService.getAuditEvents(tenantId);
    return { success: true, tenantId, count: data.length, data };
  }
}

