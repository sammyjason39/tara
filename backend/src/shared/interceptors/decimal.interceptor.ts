import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from "@nestjs/common";
import { Observable } from "rxjs";
import { map } from "rxjs/operators";
import { Prisma } from "@prisma/client";

/**
 * DecimalSerializationInterceptor
 * Recursively converts Prisma.Decimal values to numbers for API responses.
 * This ensures that the frontend receives numeric types while the backend
 * maintains high precision using Decimal.js.
 */
@Injectable()
export class DecimalSerializationInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(map((data) => this.transform(data)));
  }

  private transform(data: any, visited = new WeakSet()): any {
    if (data === null || data === undefined) {
      return data;
    }

    if (data instanceof Prisma.Decimal) {
      return data.toNumber();
    }

    if (typeof data === "object") {
      if (visited.has(data)) {
        return "[Circular]";
      }
      visited.add(data);

      if (Array.isArray(data)) {
        return data.map((item) => this.transform(item, visited));
      }

      const transformed: any = {};
      for (const key in data) {
        if (Object.prototype.hasOwnProperty.call(data, key)) {
          transformed[key] = this.transform(data[key], visited);
        }
      }
      return transformed;
    }

    return data;
  }
}
