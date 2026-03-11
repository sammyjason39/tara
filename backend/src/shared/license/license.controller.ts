import { Controller, Get, Post, Body, Param, Req, UseGuards } from '@nestjs/common';
import { LicenseService } from './license.service';

@Controller('license')
export class LicenseController {
  constructor(private readonly licenseService: LicenseService) {}

  @Get('my-modules')
  async getMyModules(@Req() req: any) {
    return this.licenseService.getTenantLicenses(req.tenantId);
  }

  @Get('check/:moduleCode')
  async checkLicense(@Req() req: any, @Param('moduleCode') moduleCode: string) {
    return this.licenseService.getLicense(req.tenantId, moduleCode);
  }

  @Post('toggle/:moduleCode')
  async toggleModule(
    @Req() req: any,
    @Param('moduleCode') moduleCode: string,
    @Body('enabled') enabled: boolean,
  ) {
    return this.licenseService.toggleModule(
      req.tenantId,
      moduleCode,
      enabled,
      req.user.userId,
    );
  }
}
