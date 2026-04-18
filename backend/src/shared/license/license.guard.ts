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
    const tenant_id = request.tenant_id;

    if (!tenant_id) {
      return false; // Cannot verify license without tenant_id
    }

    await this.licenseService.verifyLicense(tenant_id, moduleCode);
    return true;
  }
}
