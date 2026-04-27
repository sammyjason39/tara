import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from "@nestjs/common";

@Injectable()
export class JVReadOnlyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const tenantContext = request.tenantContext;

    if (tenantContext?.is_jv_read_only) {
      const method = request.method;
      // Block mutating methods in mirror mode
      if (['POST', 'PATCH', 'PUT', 'DELETE'].includes(method)) {
        // Exception: Allow specifically marked "JV Action" endpoints if needed
        // For now, strict read-only
        throw new ForbiddenException(
          "ACCESS_DENIED: Mirror Mode is read-only. You cannot modify host tenant data."
        );
      }
    }

    return true;
  }
}
