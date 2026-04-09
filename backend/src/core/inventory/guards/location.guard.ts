import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../../persistence/prisma.service';

/**
 * LocationGuard
 * Enforces that the location_id provided in the request body, query, or headers
 * belongs to the specific tenant (tenant_id) identified in the context.
 */
@Injectable()
export class LocationGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const tenantId = request.tenantContext?.tenantId || request.tenantContext?.tenant_id;
    
    if (!tenantId) {
      throw new ForbiddenException('Tenant context missing');
    }

    // Extract location_id from Body, Query, or Header
    const location_id = 
      request.body?.location_id || 
      request.query?.location_id || 
      request.headers['x-location-id'];

    if (!location_id) {
      return true; 
    }

    // Verify location ownership
    const location = await this.prisma.location.findFirst({
      where: {
        id: location_id,
        tenantId: tenantId,
      },
    });

    if (!location) {
      throw new ForbiddenException(`Location ${location_id} does not belong to your organization or does not exist.`);
    }

    // Inject location into request for downstream use
    request['location'] = location;

    return true;
  }
}
