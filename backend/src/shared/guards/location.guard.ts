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
    const { tenantId, locationId, role } = request.tenantContext || {};

    if (!tenantId) {
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
      request.params.locationId ||
      request.params.id ||
      request.headers["x-location-id"];

    if (!targetLocationId) {
      // If no target location is specified, and user is not admin,
      // they should not be performing location-specific actions.
      // However, some list operations might be filtered by service logic instead.
      return true;
    }

    // 3. Enforce location match for Managers/Members
    if (locationId && targetLocationId !== locationId) {
      throw new ForbiddenException(
        `Access Denied: You are assigned to location '${locationId}' and cannot perform actions for location '${targetLocationId}'.`,
      );
    }

    return true;
  }
}
