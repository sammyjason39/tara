import {
  Injectable,
  NestMiddleware,
  BadRequestException,
  UnauthorizedException,
} from "@nestjs/common";
import { Request, Response, NextFunction } from "express";
import { TenantContext } from "./tenant-context.interface";
import { AuthService } from "../core/auth/auth.service";

/**
 * Tenant Middleware
 * Extracts tenant context from request headers and attaches to request object
 * Enforces multi-tenancy by requiring x-tenant-id header
 * Verifies JWT token if present to prevent header spoofing
 */
@Injectable()
export class TenantMiddleware implements NestMiddleware {
  constructor(private readonly authService: AuthService) {}

  async use(req: any, res: Response, next: NextFunction) {
    // 1. Extract tenant ID from header (REQUIRED for multi-tenancy)
    const tenant_id = req.headers["x-tenant-id"];
    const bypass = req.headers["x-dev-bypass"];

    console.log(
      `[V3001] URL: ${req.url}, Tenant: ${tenant_id}, Bypass: ${bypass}`,
    );

    if (!tenant_id) {
      throw new BadRequestException(
        "Missing required header: x-tenant-id. All requests must include a tenant identifier.",
      );
    }

    // 2. JWT Verification (HARDENING)
    const authHeader = req.headers.authorization;
    let verifiedUser: any = null;

    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.split(" ")[1];
      try {
        verifiedUser = await this.authService.verifyAndGetProfile(token);
      } catch (e) {
        throw new UnauthorizedException(
          "Invalid or expired authentication token",
        );
      }
    }

    // 3. Context Construction
    if (!verifiedUser) {
      throw new UnauthorizedException(
        "Valid authentication token required for this resource.",
      );
    }

    const user_id = verifiedUser.id;
    const location_id = req.headers["x-location-id"];
    const company_id = req.headers["x-company-id"] || tenant_id;

    // 4. Role Extraction & Verification (STRICT MODE)
    const userCompanies = verifiedUser.userCompanies || [];
    let activeRole: string | null = null;

    // Check for Global Superadmin first
    const isSuperAdmin = userCompanies.some(
      (uc: any) => uc.role === "SUPERADMIN",
    );

    if (isSuperAdmin) {
      activeRole = "SUPERADMIN";
      console.log(`[RBAC] User ${user_id} detected as GLOBAL SUPERADMIN. Granting access to tenant ${tenant_id}`);
    } else {
      // Strict matching for other roles (OWNER, ADMIN, etc)
      const tenantAssoc = userCompanies.find(
        (uc: any) => uc.tenant_id === tenant_id,
      );

      if (!tenantAssoc) {
        throw new UnauthorizedException(
          `Access Denied: User ${user_id} is not associated with tenant ${tenant_id}`,
        );
      }

      activeRole = tenantAssoc.role;
      console.log(`[RBAC] User ${user_id} authorized for tenant ${tenant_id} with role ${activeRole}`);
    }

    // Attach tenant context to request object
    req.tenantContext = {
      tenant_id: tenant_id as string,
      company_id: company_id as string,
      location_id: location_id as string | undefined,
      user_id,
      role: activeRole,
    };

    req.user = verifiedUser;
    next();
  }
}
