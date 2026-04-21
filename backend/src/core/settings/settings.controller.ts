import { Controller, Get, Put, Body, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { SettingsService } from './settings.service';
import { TenantInterceptor } from '../../gateway/tenant.interceptor';
import { TenantContext } from '../../gateway/tenant-context.interface';
import { RolesGuard } from '../../shared/guards/roles.guard';
import { Roles } from '../../shared/decorators/roles.decorator';
import { UserRole } from '../../shared/roles';

interface RequestWithTenant extends Request {
  tenantContext: TenantContext;
}

@Controller('v1/settings')
@UseGuards(TenantInterceptor, RolesGuard)
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get('profile')
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  async getProfile(@Req() req: RequestWithTenant) {
    const { tenant_id } = req.tenantContext;
    return {
      success: true,
      data: await this.settingsService.getProfile(tenant_id),
    };
  }

  @Put('profile')
  @Roles(UserRole.OWNER)
  async updateProfile(@Req() req: RequestWithTenant, @Body() body: any) {
    const { tenant_id, user_id } = req.tenantContext;
    return {
      success: true,
      message: 'Profile updated',
      data: await this.settingsService.updateProfile(tenant_id, body, user_id || 'system'),
    };
  }

  @Get('preferences')
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  async getPreferences(@Req() req: RequestWithTenant) {
    const { tenant_id } = req.tenantContext;
    return {
      success: true,
      data: await this.settingsService.getPreferences(tenant_id),
    };
  }

  @Put('preferences')
  @Roles(UserRole.OWNER)
  async updatePreferences(@Req() req: RequestWithTenant, @Body() body: any) {
    const { tenant_id, user_id } = req.tenantContext;
    return {
      success: true,
      message: 'Preferences updated',
      data: await this.settingsService.updatePreferences(tenant_id, body, user_id || 'system'),
    };
  }
}
