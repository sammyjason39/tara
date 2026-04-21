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
    const url = request.url;

    // Explicit System Route Blacklist for OWNER role
    const SYSTEM_ROUTES = [
      '/v1/audit/repair',
      '/v1/admin/infra',
      '/v1/admin/audit',
      '/v1/license',
      '/v1/logs',
      '/v1/sync',
      '/v1/audit/verify'
    ];

    const isSystemRoute = SYSTEM_ROUTES.some(route => url.startsWith(route));

    // 1. RBAC BYPASS LOGIC
    
    // SUPERADMIN: Global platform-wide bypass
    if (userRole === UserRole.SUPERADMIN) {
      return true;
    }

    // OWNER: Restricted bypass
    if (userRole === UserRole.OWNER) {
      // REQUIREMENT: OWNER bypass must be STRICTLY scoped
      // 1. Block access to system-level endpoints
      if (isSystemRoute) {
        throw new ForbiddenException("OWNER role is restricted from system-level infrastructure routes.");
      }
      // 2. Ensure tenant isolation (guaranteed by TenantInterceptor/Context in current stack)
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
