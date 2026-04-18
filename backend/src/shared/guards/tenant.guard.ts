import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from "@nestjs/common";
import { UserRole } from "../roles";

/**
 * Tenant Guard
 * Enforces multi-tenant isolation and role-based access to company data.
 * - SUPERADMIN: Global access to any tenant.
 * - OWNER: Full access but strictly limited to their own company (tenant_id).
 * - Other Roles: Gated by their respective permissions within their company.
 */
@Injectable()
export class TenantGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const { tenantContext, user } = request;

    if (!tenantContext || !tenantContext.tenant_id) {
      throw new ForbiddenException("Tenant context missing");
    }

    if (!user) {
      throw new ForbiddenException("User authentication required");
    }

    const { tenant_id, role } = tenantContext;
    console.log(
      `[TenantGuard] Checking access for user ${user.id}, Role: ${role}, Tenant: ${tenant_id}`,
    );

    // 1. SUPERADMIN has omnipotent access
    if (role === UserRole.SUPERADMIN) {
      console.log(`[TenantGuard] SUPERADMIN bypass allowed for ${tenant_id}`);
      return true;
    }

    // 2. OWNER & ALL OTHERS: Verify tenant association
    const userCompanies = user.userCompanies || [];
    const tenantAssoc = userCompanies.find(
      (uc: any) => uc.tenant_id === tenant_id,
    );

    if (!tenantAssoc) {
      console.warn(
        `[TenantGuard] Access DENIED: No association found for user ${user.id} on tenant ${tenant_id}`,
      );
      console.log(
        `[TenantGuard] Available associations: ${JSON.stringify(userCompanies.map((uc: any) => uc.tenant_id))}`,
      );
      throw new ForbiddenException(
        `Access Denied: You do not have a registered association with company context '${tenant_id}'.`,
      );
    }

    console.log(
      `[TenantGuard] Access GRANTED for user ${user.id} on tenant ${tenant_id} (Role in assoc: ${tenantAssoc.role})`,
    );
    return true;
  }
}
