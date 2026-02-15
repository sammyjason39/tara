import { Body, Controller, Get, Param, Post, Put, Req, UseInterceptors } from '@nestjs/common';
import { Request } from 'express';
import { TenantContext } from '../../gateway/tenant-context.interface';
import { TenantInterceptor } from '../../gateway/tenant.interceptor';
import { CreateProvisioningRequestDto } from './dto/create-provisioning-request.dto';
import { ITService } from './it.service';

interface RequestWithTenant extends Request {
  tenantContext: TenantContext;
}

@Controller('it')
@UseInterceptors(TenantInterceptor)
export class ITController {
  constructor(private readonly itService: ITService) {}

  @Get('provisioning')
  async getProvisioningRequests(@Req() request: RequestWithTenant) {
    const { tenantId } = request.tenantContext;
    const data = await this.itService.getProvisioningRequests(tenantId);
    return { success: true, tenantId, count: data.length, data };
  }

  @Post('provisioning')
  async createProvisioningRequest(
    @Req() request: RequestWithTenant,
    @Body() dto: CreateProvisioningRequestDto,
  ) {
    const { tenantId } = request.tenantContext;
    return {
      success: true,
      tenantId,
      message: 'Provisioning request created',
      data: await this.itService.createProvisioningRequest(tenantId, dto),
    };
  }

  @Put('provisioning/:id/provision')
  async markProvisioned(
    @Req() request: RequestWithTenant,
    @Param('id') requestId: string,
    @Body() body: { provisionedBy: string },
  ) {
    const { tenantId } = request.tenantContext;
    return {
      success: true,
      tenantId,
      message: 'Provisioning request marked as provisioned',
      data: await this.itService.markProvisioned(tenantId, requestId, body.provisionedBy || 'system'),
    };
  }

  @Get('system-health')
  async getSystemHealth(@Req() request: RequestWithTenant) {
    const { tenantId } = request.tenantContext;
    const data = await this.itService.getSystemHealth(tenantId);
    return { success: true, tenantId, count: data.length, data };
  }
}

