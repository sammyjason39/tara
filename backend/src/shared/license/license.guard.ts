import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { LicenseService } from './license.service';

@Injectable()
export class LicenseGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private licenseService: LicenseService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const moduleCode = this.reflector.get<string>('module', context.getHandler());
    if (!moduleCode) {
      return true; // No module specified, skip license check
    }

    const request = context.switchToHttp().getRequest();
    const tenantId = request.tenantId;

    if (!tenantId) {
      return false; // Cannot verify license without tenantId
    }

    await this.licenseService.verifyLicense(tenantId, moduleCode);
    return true;
  }
}
