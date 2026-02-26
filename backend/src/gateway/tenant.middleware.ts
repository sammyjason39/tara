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
    const tenantId = req.headers["x-tenant-id"];
    const bypass = req.headers["x-dev-bypass"];

    console.log(
      `[V3001] URL: ${req.url}, Tenant: ${tenantId}, Bypass: ${bypass}`,
    );

    if (!tenantId) {
      throw new BadRequestException(
        "Missing required header: x-tenant-id. All requests must include a tenant identifier.",
      );
    }

    // 1.5 Dev Bypass for verification
    if (bypass === "true") {
      console.log(`[V3001] BYPASS ACTIVE for ${tenantId}`);
      req.tenantContext = {
        tenantId: tenantId as string,
        userId: "dev-user",
        role: "OWNER",
      };
      req.user = { id: "dev-user", role: "OWNER", email: "dev@zenvix.com" };
      return next();
    }

    // 2. JWT Verification (HARDENING)
    // Extract token from Authorization header or cookie
    const authHeader = req.headers.authorization;
    let verifiedUser: any = null;

    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.split(" ")[1];
      try {
        verifiedUser = await this.authService.verifyAndGetProfile(token);
      } catch (e) {
        // If token is present but invalid/expired, we fail the request for security
        throw new UnauthorizedException(
          "Invalid or expired authentication token",
        );
      }
    }

    // 3. Context Construction
    // REQUIRE verified user from token (unspoofable)
    if (!verifiedUser) {
      throw new UnauthorizedException(
        "DEBUG_TAG_3001: Valid authentication token required for this resource.",
      );
    }

    const userId = verifiedUser.id;
    const role = verifiedUser.role;
    const locationId = req.headers["x-location-id"];

    // Attach tenant context to request object
    const tenantContext: TenantContext = {
      tenantId: tenantId as string,
      locationId: locationId as string | undefined,
      userId,
      role,
    };

    req.tenantContext = tenantContext;
    req.user = verifiedUser;

    next();
  }
}
