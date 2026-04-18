import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AuditService } from '../../../shared/audit/audit.service';
import { LoggerService } from '../../../shared/logger/logger.service';

/**
 * HRMutationInterceptor
 * Automatically captures ALL HR mutations (POST, PUT, PATCH, DELETE)
 * for dual-logging to AuditStore and SystemLog.
 */
@Injectable()
export class HRMutationInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HRMutationInterceptor');

  constructor(
    private readonly auditService: AuditService,
    private readonly loggerService: LoggerService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, path, body, headers } = request;
    const tenant_id = headers['x-tenant-id'] || body.tenant_id;
    const user_id = headers['x-user-id'] || 'system';

    // Only intercept mutations
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      return next.handle().pipe(
        tap({
          next: async (data) => {
            const entity_id = data?.id || body?.id || 'n/a';
            const entity_type = this.extractEntityType(path);

            // 1. Audit Logging (Compliance Trace)
            try {
              await this.auditService.log({
                tenant_id,
                user_id,
                module: 'HR',
                action: method === 'POST' ? 'CREATE' : method === 'DELETE' ? 'DELETE' : 'UPDATE',
                entity_type,
                entity_id,
                metadata: {
                  path,
                  method,
                  payload: body,
                },
              });
            } catch (err) {
              this.logger.error(`Audit logging failed: ${err.message}`);
            }

            // 2. System Logging (Observability)
            try {
              await this.loggerService.log({
                tenant_id,
                module: 'HR',
                level: 'INFO',
                event: `HR_${method}_MUTATION`,
                message: `HR Mutation: ${method} ${path} by ${user_id}`,
                payload: {
                  entity_type,
                  entity_id,
                  status: 'SUCCESS',
                },
                user_id,
              });
            } catch (err) {
              this.logger.error(`System logging failed: ${err.message}`);
            }
          },
          error: async (err) => {
             // Log failures too
             await this.loggerService.log({
                tenant_id,
                module: 'HR',
                level: 'ERROR',
                event: `HR_${method}_FAILURE`,
                message: `HR Mutation Failed: ${method} ${path} - ${err.message}`,
                payload: { body, error: err.message },
                user_id,
                errorStack: err.stack,
              });
          }
        }),
      );
    }

    return next.handle();
  }

  private extractEntityType(path: string): string {
    const segments = path.split('/').filter(s => s && s !== 'api' && s !== 'hr');
    return segments[0]?.toUpperCase() || 'UNKNOWN';
  }
}
