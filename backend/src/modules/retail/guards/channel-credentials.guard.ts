import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { RetailPublicAuthService } from "../retail-public-auth.service";

@Injectable()
export class ChannelCredentialsGuard implements CanActivate {
  constructor(private readonly authService: RetailPublicAuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    if (request.method === "OPTIONS") return true;
    const tenant_id = request.tenantContext?.tenant_id;
    const clientId = request.headers["x-client-id"] as string | undefined;
    const clientSecret = request.headers["x-client-secret"] as
      | string
      | undefined;

    if (!tenant_id) {
      throw new UnauthorizedException("Missing x-tenant-id");
    }

    if (!clientId || !clientSecret) {
      throw new UnauthorizedException("Missing x-client-id or x-client-secret");
    }

    const scope = await this.authService.validateEcommerceConnector(
      tenant_id,
      clientId,
      clientSecret,
    );

    request.connectorScope = scope;
    return true;
  }
}
