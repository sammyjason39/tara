import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { UserRole } from "../roles";
import { ROLES_KEY } from "../decorators/roles.decorator";

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // If no roles are defined on the route, allow access (but still subject to TenantMiddleware)
    if (!requiredRoles) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const { tenantContext } = request;

    if (!tenantContext) {
      throw new ForbiddenException("Security Context missing. Request must pass through TenantMiddleware.");
    }

    const userRole = tenantContext.role;

    // 1. SUPERADMIN BYPASS (As requested: Superadmin can bypass all in the apps)
    if (userRole === UserRole.SUPERADMIN) {
      return true;
    }

    // 2. Check for required roles
    const hasRole = requiredRoles.includes(userRole as UserRole);

    if (!hasRole) {
      throw new ForbiddenException(`Insufficient permissions. Required roles: [${requiredRoles.join(", ")}]. Your role: ${userRole}`);
    }

    return true;
  }
}
