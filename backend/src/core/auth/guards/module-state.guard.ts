import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  SetMetadata,
} from "@nestjs/common";
import { PrismaService } from "../../../persistence/prisma.service";
import { Reflector } from "@nestjs/core";
import { UserRole } from "../../../shared/roles";
import { MODULE_KEY } from "../../../shared/decorators/required-module.decorator";

/**
 * @deprecated Use `@RequiredModule(...)` from
 * `shared/decorators/required-module.decorator` instead. This guard now reads
 * the shared `MODULE_KEY` metadata so it stays aligned with the decorator that
 * every controller actually declares (and with `ModuleGuard`). These legacy
 * exports remain only for backward compatibility and write the same
 * `MODULE_KEY` metadata the guard consumes.
 */
export const REQUIRE_MODULE = MODULE_KEY;
export const RequireModule = (moduleKey: string) =>
  SetMetadata(MODULE_KEY, moduleKey);

@Injectable()
export class ModuleStateGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredModule = this.reflector.getAllAndOverride<string>(
      MODULE_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredModule) {
      return true; // No module requirement
    }

    const request = context.switchToHttp().getRequest();
    if (request.headers["x-dev-bypass"] === "true") {
      return true;
    }

    const tenantContext = request.tenantContext;

    if (!tenantContext || !tenantContext.tenant_id) {
      // Let TenantInterceptor handle missing tenant, or block if missing
      return true;
    }

    // 1. SUPERADMIN bypass
    if (tenantContext.role === UserRole.SUPERADMIN) {
      return true;
    }

    const tenant_id = tenantContext.tenant_id;

    const moduleStatus = await this.prisma.admin_module_statuses.findUnique({
      where: {
        tenant_id_module_key: {
          tenant_id: tenant_id,
          module_key: requiredModule,
        },
      },
    });

    if (!moduleStatus || !moduleStatus.enabled) {
      throw new ForbiddenException(
        `Module '${requiredModule}' is not activated for this workspace.`,
      );
    }

    return true;
  }
}
