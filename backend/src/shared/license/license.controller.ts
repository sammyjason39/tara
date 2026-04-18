import { Controller, Get, Post, Body, Param, Req, UseGuards } from '@nestjs/common';
import { LicenseService } from './license.service';

@Controller('license')
export class LicenseController {
  constructor(private readonly licenseService: LicenseService) {}

  @Get('my-modules')
  async getMyModules(@Req() req: any) {
    return this.licenseService.getTenantLicenses(req.tenant_id);
  }

  @Get('check/:moduleCode')
  async checkLicense(@Req() req: any, @Param('moduleCode') moduleCode: string) {
    return this.licenseService.getLicense(req.tenant_id, moduleCode);
  }

  @Post('toggle/:moduleCode')
  async toggleModule(
    @Req() req: any,
    @Param('moduleCode') moduleCode: string,
    @Body('enabled') enabled: boolean,
  ) {
    return this.licenseService.toggleModule(
      req.tenant_id,
      moduleCode,
      enabled,
      req.user.user_id,
    );
  }
}
