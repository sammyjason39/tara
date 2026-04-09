import { v4 as uuidv4 } from 'uuid';
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { PrismaService } from '../../persistence/prisma.service';
import { Request } from 'express';
import { TenantContext } from '../../gateway/tenant-context.interface';
import * as crypto from 'crypto';

interface RequestWithTenant extends Request {
  tenantContext: TenantContext;
}

@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  constructor(private readonly prisma: PrismaService) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest<RequestWithTenant>();
    const { method, headers, url, body } = request;

    // 1. Only apply to mutations
    if (!['POST', 'PATCH', 'DELETE'].includes(method)) {
      return next.handle();
    }

    // 2. Read x-idempotency-key from headers
    const idempotencyKey = headers['x-idempotency-key'] as string;
    
    // PHASE P1: ENFORCE MANDATORY IDEMPOTENCY FOR CRITICAL HR ENDPOINTS
    const isCriticalHREndpoint = 
      url.includes('/api/hr/candidates/') && url.endsWith('/hire') ||
      url.includes('/api/hr/payroll/') && url.includes('/calculate') ||
      url.includes('/api/hr/leave-requests') && method === 'POST' ||
      url.includes('/api/hr/employees') && method === 'POST';

    if (!idempotencyKey) {
      if (isCriticalHREndpoint) {
        throw new BadRequestException('x-idempotency-key is required for this critical HR operation.');
      }
      return next.handle();
    }

    const tenantId = request.tenantContext?.tenantId;
    if (!tenantId) {
      // If tenantId is missing, we can't safely scope the idempotency key.
      // We skip and let TenantGuard handle the missing context.
      return next.handle();
    }

    // 3. Optional: Request Hash for added safety
    const requestHash = crypto
      .createHash('sha256')
      .update(JSON.stringify(body || {}))
      .digest('hex');

    // 4. Check if key exists
    const existingEntry = await this.prisma.sysIdempotencyKey.findUnique({
      where: {
        tenantId_key: {
          tenantId,
          key: idempotencyKey,
        },
      },
    });

    if (existingEntry) {
      const now = new Date();
      // PHASE 2: Check for 5-minute guard period after expiry
      const isExpiredWithGrace = 
        existingEntry.expiresAt && 
        now.getTime() > existingEntry.expiresAt.getTime() + (5 * 60 * 1000);

      if (!isExpiredWithGrace) {
        // Return stored response (de-facto active)
        if (existingEntry.status === 'PENDING') {
          throw new ConflictException('Request with this idempotency key is already in progress.');
        }
        
        if (existingEntry.requestHash && existingEntry.requestHash !== requestHash) {
           throw new ConflictException('Idempotency key reuse detected with different request payload.');
        }

        return of(existingEntry.responseSnapshot);
      }
      
      // If de-facto expired (beyond 5m grace), we allow the record to be overwritten (by deletion first for unique constraint)
      await this.prisma.sysIdempotencyKey.delete({
        where: { id: existingEntry.id },
      });
    }

    // 5. Store PENDING entry
    await this.prisma.sysIdempotencyKey.create({
      data: {
        id: uuidv4(),
        
        tenantId,
        key: idempotencyKey,
        endpoint: url,
        requestHash,
        status: 'PENDING',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24h expiry
        responseSnapshot: {}, 
      },
    });

    // 6. Process request and store response
    return next.handle().pipe(
      tap({
        next: async (response) => {
          await this.prisma.sysIdempotencyKey.update({
            where: {
              tenantId_key: {
                tenantId,
                key: idempotencyKey,
              },
            },
            data: {
              status: 'COMPLETED',
              responseSnapshot: response || { success: true },
            },
          });
        },
        error: async (err) => {
          // On failure, remove the key so the user can actually retry the operation
          await this.prisma.sysIdempotencyKey.delete({
            where: {
              tenantId_key: {
                tenantId,
                key: idempotencyKey,
              },
            },
          }).catch(() => {}); // Ignore delete errors
        }
      })
    );
  }
}
