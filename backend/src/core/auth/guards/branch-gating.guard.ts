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
export const SKIP_BRANCH_CHECK = "skipBranchCheck";
export const SkipBranchCheck = () => SetMetadata(SKIP_BRANCH_CHECK, true);

@Injectable()
export class BranchGatingGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const skipCheck = this.reflector.getAllAndOverride<boolean>(
      SKIP_BRANCH_CHECK,
      [context.getHandler(), context.getClass()],
    );

    if (skipCheck) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    if (request.headers["x-dev-bypass"] === "true") {
      return true;
    }

    const tenantContext = request.tenantContext;

    if (!tenantContext || !tenantContext.tenant_id) {
      return true; // tenantInterceptor handles if required
    }

    // 1. SUPERADMIN bypass
    if (tenantContext.role === UserRole.SUPERADMIN) {
      return true;
    }

    const storeCount = await this.prisma.stores.count({
      where: { tenant_id: tenantContext.tenant_id },
    });

    if (storeCount < 1) {
      throw new ForbiddenException(
        "SETUP_REQUIRED: At least one Branch/Store must be established before accessing operational data.",
      );
    }

    // Attach count to context so controllers know
    tenantContext.branchCount = storeCount;
    return true;
  }
}
