import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from "@nestjs/common";
import { UserRole } from "../roles";

/**
 * Location Guard
 * Ensures that the actor has permission to access the requested location context
 * - Owners/Admins have global access
 * - Managers are restricted to their assigned location
 */
@Injectable()
export class LocationGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const { tenant_id, location_id, role } = request.tenantContext || {};

    if (!tenant_id) {
      throw new ForbiddenException("Tenant context missing");
    }

    // 1. Owners and Admins have global visibility
    if (
      role === UserRole.SUPERADMIN ||
      role === UserRole.OWNER ||
      role === UserRole.ADMIN
    ) {
      return true;
    }

    // 2. Identify target location from request (params take priority over context headers)
    const targetLocationId =
      request.params.location_id ||
      request.params.id ||
      request.headers["x-location-id"];

    if (!targetLocationId) {
      // If no target location is specified, and user is not admin,
      // they should not be performing location-specific actions.
      // However, some list operations might be filtered by service logic instead.
      return true;
    }

    // 3. Enforce location match for Managers/Members
    if (location_id && targetLocationId !== location_id) {
      throw new ForbiddenException(
        `Access Denied: You are assigned to location '${location_id}' and cannot perform actions for location '${targetLocationId}'.`,
      );
    }

    return true;
  }
}
