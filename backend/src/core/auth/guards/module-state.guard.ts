import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  SetMetadata,
} from "@nestjs/common";
import { PrismaService } from "../../../persistence/prisma.service";
import { Reflector } from "@nestjs/core";
export const REQUIRE_MODULE = "requireModule";
export const RequireModule = (moduleKey: string) =>
  SetMetadata(REQUIRE_MODULE, moduleKey);

@Injectable()
export class ModuleStateGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredModule = this.reflector.getAllAndOverride<string>(
      REQUIRE_MODULE,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredModule) {
      return true; // No module requirement
    }

    const request = context.switchToHttp().getRequest();
    const tenantContext = request.tenantContext;

    if (!tenantContext || !tenantContext.tenantId) {
      // Let TenantInterceptor handle missing tenant, or block if missing
      return true;
    }

    const tenantId = tenantContext.tenantId;

    const moduleStatus = await this.prisma.adminModuleStatus.findUnique({
      where: {
        tenantId_moduleKey: {
          tenantId,
          moduleKey: requiredModule,
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
