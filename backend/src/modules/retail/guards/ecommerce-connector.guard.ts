import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  ForbiddenException,
} from "@nestjs/common";
import { PrismaService } from "../../../persistence/prisma.service";
import { createHash } from "crypto";

@Injectable()
export class EcommerceConnectorGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  private hashSecret(secret: string) {
    return createHash("sha256").update(secret).digest("hex");
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const clientId = request.headers["x-client-id"] as string | undefined;
    const clientSecret = request.headers["x-client-secret"] as
      | string
      | undefined;
    const apiKey =
      (request.headers["x-ecommerce-key"] as string | undefined) ??
      (request.headers["x-api-key"] as string | undefined);

    if ((clientId && !clientSecret) || (!clientId && clientSecret)) {
      throw new UnauthorizedException("Missing x-client-id or x-client-secret");
    }

    if (!clientId && !clientSecret && !apiKey) {
      throw new UnauthorizedException(
        "Missing credentials (x-client-id/x-client-secret or x-ecommerce-key/x-api-key)",
      );
    }

    let scope: any = null;

    if (clientId && clientSecret) {
      // Path 1: Channel-based authentication
      const secretHash = this.hashSecret(clientSecret);

      const channels = await this.prisma.retail_channels.findMany({
        where: {
          NOT: { credentials: { equals: undefined } },
          status: "active",
        },
      });

      const match = channels.find((channel: any) => {
        const credentials = channel.credentials as {
          clientId?: string;
          clientSecretHash?: string;
          revoked?: boolean;
        } | null;
        if (
          !credentials?.clientId ||
          !credentials?.clientSecretHash ||
          credentials.revoked
        ) {
          return false;
        }
        return (
          credentials.clientId === clientId &&
          credentials.clientSecretHash === secretHash
        );
      });

      if (match) {
        const credentials = match.credentials as {
          branch_id?: string;
          domain?: string;
        } | null;
        scope = {
          ecommerceId: match.id,
          tenant_id: match.tenant_id,
          branch_id: credentials?.branch_id ?? "branch_main",
          domain: credentials?.domain ?? match.name ?? "",
          status: match.status,
        };
      }
    } else if (apiKey) {
      // Path 2: Gateway-based authentication (distinct from Channel)
      const apiKeyHash = this.hashSecret(apiKey);

      const connector = await this.prisma.ecommerce_connectors.findFirst({
        where: { api_key: apiKeyHash, deleted_at: null, status: "active" },
        include: { stores: { select: { id: true } } },
      });

      if (connector) {
        scope = {
          ecommerceId: connector.id,
          tenant_id: connector.tenant_id,
          branch_id: connector.stores[0]?.id || "branch_main",
          branchIds: connector.stores.map((b: any) => b.id),
          inventory_pool_id: connector.inventory_pool_id,
          domain: connector.domain,
          status: connector.status,
        };
      }
    }

    if (!scope) {
      throw new ForbiddenException("Invalid ecommerce credentials");
    }

    if (scope.status !== "active") {
      throw new ForbiddenException("Ecommerce site is frozen");
    }

    request.ecommerceScope = scope;

    if (request.body?.scope) {
      delete request.body.scope;
    }

    return true;
  }
}
