import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { LoggerService } from './logger.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class HttpLogInterceptor implements NestInterceptor {
  constructor(private readonly loggerService: LoggerService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const requestId = uuidv4();
    const start = Date.now();

    const tenantId: string | undefined = req.tenantId ?? undefined;
    const userId: string | undefined = req.user?.userId ?? undefined;
    const ipAddress: string | undefined = req.ip ?? undefined;
    const urlParts = (req.url as string)?.split('/').filter(Boolean);
    const module = urlParts?.[0] ?? 'unknown';

    req.requestId = requestId;

    return next.handle().pipe(
      tap(() => {
        this.loggerService.log({
          tenantId,
          userId,
          ipAddress,
          module,
          requestId,
          level: 'INFO',
          event: 'HTTP_REQUEST',
          message: `${req.method} ${req.url}`,
          durationMs: Date.now() - start,
        });
      }),
      catchError((err: any) => {
        this.loggerService.log({
          tenantId,
          userId,
          ipAddress,
          module,
          requestId,
          level: 'ERROR',
          event: 'HTTP_ERROR',
          message: err?.message ?? 'Unknown error',
          errorStack: err?.stack ?? undefined,
          durationMs: Date.now() - start,
        });
        return throwError(() => err);
      }),
    );
  }
}
