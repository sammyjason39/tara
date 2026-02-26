import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  SetMetadata,
} from "@nestjs/common";
import { PrismaService } from "../../../persistence/prisma.service";
import { Reflector } from "@nestjs/core";
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
    const tenantContext = request.tenantContext;

    if (!tenantContext || !tenantContext.tenantId) {
      return true; // tenantInterceptor handles if required
    }

    const storeCount = await this.prisma.store.count({
      where: { tenantId: tenantContext.tenantId },
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
