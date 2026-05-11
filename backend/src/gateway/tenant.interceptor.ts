import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  BadRequestException,
} from "@nestjs/common";
import { Observable } from "rxjs";
import { TenantContext } from "./tenant-context.interface";

/**
 * Tenant Interceptor
 * Extracts tenant context from request headers and attaches to request object
 * Enforces multi-tenancy by requiring x-tenant-id header
 */
@Injectable()
export class TenantInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();

    // Skip validation for preflight OPTIONS requests
    if (request.method === "OPTIONS") {
      return next.handle();
    }

    console.log(`[TenantInterceptor] URL: ${request.url}`);

    // Bypass for public inventory images
    if (request.url.includes("/inventory/images/")) {
       console.log(`[TenantInterceptor] Bypassing for image: ${request.url}`);
       return next.handle();
    }

    // Extract tenant ID from header (required)
    const tenant_id = request.headers["x-tenant-id"];

    if (!tenant_id) {
      throw new BadRequestException(
        "Missing required header: x-tenant-id. All requests must include a tenant identifier.",
      );
    }

    // Extract valid headers
    const location_id = request.headers["x-location-id"];
    const user_id = request.headers["x-actor-id"];
    const role = request.headers["x-user-role"];

    // Attach tenant context to request object
    // NOTE: company_id falls back to tenant_id so it always resolves to a valid
    // record — never the literal string "default" which breaks FK constraints.
    const companyIdHeader = request.headers["x-company-id"] as string | undefined;
    const tenantContext: TenantContext = {
      tenant_id: tenant_id as string,
      company_id: companyIdHeader || (tenant_id as string),
      location_id: location_id as string | undefined,
      user_id: user_id as string | undefined,
      role: role as string | undefined,
    };

    request.tenantContext = tenantContext;

    return next.handle();
  }
}
