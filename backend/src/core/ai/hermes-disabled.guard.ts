import { Injectable, CanActivate, ExecutionContext, ServiceUnavailableException } from '@nestjs/common';

/**
 * Returns 503 for all Hermes routes when HERMES_ENABLED is not explicitly 'true'.
 * Option B: hide + disable Hermes integration.
 */
@Injectable()
export class HermesDisabledGuard implements CanActivate {
  canActivate(_context: ExecutionContext): boolean {
    if (process.env.HERMES_ENABLED === 'true') {
      return true;
    }
    throw new ServiceUnavailableException({
      success: false,
      message: 'Hermes integration is disabled. Use TARA AI Assistant instead.',
      code: 'HERMES_DISABLED',
    });
  }
}
