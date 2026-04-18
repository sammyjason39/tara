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
    const request_id = uuidv4();
    const start = Date.now();

    const tenant_id: string | undefined = req.tenant_id ?? undefined;
    const user_id: string | undefined = req.user?.user_id ?? undefined;
    const ip_address: string | undefined = req.ip ?? undefined;
    const urlParts = (req.url as string)?.split('/').filter(Boolean);
    const module = urlParts?.[0] ?? 'unknown';

    req.request_id = request_id;

    return next.handle().pipe(
      tap(() => {
        this.loggerService.log({
          tenant_id,
          user_id,
          ip_address,
          module,
          request_id,
          level: 'INFO',
          event: 'HTTP_REQUEST',
          message: `${req.method} ${req.url}`,
          durationMs: Date.now() - start,
        });
      }),
      catchError((err: any) => {
        this.loggerService.log({
          tenant_id,
          user_id,
          ip_address,
          module,
          request_id,
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
