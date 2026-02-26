import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { AdminService } from "../../core/admin/admin.service";
import { MODULE_KEY } from "../decorators/required-module.decorator";

/**
 * Module Guard
 * Enforces that a module is enabled for the current tenant before allowing access
 */
@Injectable()
export class ModuleGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private adminService: AdminService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredModule = this.reflector.getAllAndOverride<string>(
      MODULE_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredModule) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const tenantId = request.tenantContext?.tenantId;

    if (!tenantId) {
      throw new ForbiddenException("Tenant context missing");
    }

    const modules = await this.adminService.getModuleStatuses(tenantId);
    const moduleStatus = modules.find((m) => m.moduleKey === requiredModule);

    if (!moduleStatus || !moduleStatus.enabled) {
      throw new ForbiddenException(
        `Module '${requiredModule}' is not enabled for this tenant.`,
      );
    }

    return true;
  }
}
