import { Controller, Get, Put, Body, Param, UseGuards } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { JwtGuard } from '../auth/guards/jwt.guard';
import { RolesGuard, Roles } from '../auth/guards/roles.guard';

/**
 * Internal settings API — category rows from system_settings.
 * Path is intentionally NOT `settings/:category` to avoid shadowing
 * WebApiController routes like GET /settings/company.
 */
@Controller('settings/system')
@UseGuards(JwtGuard, RolesGuard)
@Roles('HR_Admin', 'SuperAdmin')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  async getAll() {
    const settings = await this.settingsService.getAll();
    return { success: true, data: settings };
  }

  @Get(':category')
  async getByCategory(@Param('category') category: string) {
    const settings = await this.settingsService.getByCategory(category);
    return { success: true, data: settings };
  }
}
