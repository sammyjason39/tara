import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { RetailPublicAuthService } from "../retail-public-auth.service";

@Injectable()
export class CustomerAuthGuard implements CanActivate {
  constructor(private readonly authService: RetailPublicAuthService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    if (request.method === "OPTIONS") return true;
    const authHeader = request.headers.authorization as string | undefined;
    const token = authHeader?.startsWith("Bearer ")
      ? authHeader.slice(7)
      : (request.headers["x-access-token"] as string | undefined);

    if (!token) {
      throw new UnauthorizedException("Missing access token");
    }

    try {
      const payload = this.authService.verifyAccessToken(token);
      request.customerAuth = payload;
      return true;
    } catch (error) {
      throw new UnauthorizedException("Invalid or expired access token");
    }
  }
}
