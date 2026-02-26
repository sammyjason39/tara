import { prisma } from "@/core/persistence/database/client";
import { createHash } from "crypto";
import type { EcommerceConnector } from "@prisma/client";

export type EcommerceConnectorRecord = Pick<
  EcommerceConnector,
  "id" | "tenantId" | "branchId" | "domain" | "status" | "apiKey"
>;

const hashSecret = (secret: string) =>
  createHash("sha256").update(secret).digest("hex");

export const ecommerceConnectorRepo = {
  async findByClientCredentials(
    clientId: string,
    clientSecret: string,
  ): Promise<EcommerceConnectorRecord | null> {
    const apiKeyHash = hashSecret(clientSecret);
    const channels = await prisma.retailChannel.findMany({
      where: {
        credentials: {
          not: null,
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const match = channels.find((channel) => {
      const credentials = channel.credentials as
        | { clientId?: string; clientSecretHash?: string; revoked?: boolean }
        | null;
      if (!credentials?.clientId || !credentials?.clientSecretHash || credentials.revoked) {
        return false;
      }
      return credentials.clientId === clientId && credentials.clientSecretHash === apiKeyHash;
    });

    if (!match) {
      return null;
    }

    const credentials = match.credentials as
      | { branchId?: string; domain?: string }
      | null;

    return {
      id: match.id,
      tenantId: match.tenantId,
      branchId: credentials?.branchId ?? "branch_main",
      domain: credentials?.domain ?? match.name ?? "",
      status: match.status,
      apiKey: clientSecret,
    };
  },
  async findByApiKey(apiKey: string): Promise<EcommerceConnectorRecord | null> {
    const direct = await prisma.ecommerceConnector.findFirst({
      where: {
        apiKey,
        deletedAt: null,
      },
      select: {
        id: true,
        tenantId: true,
        branchId: true,
        domain: true,
        status: true,
        apiKey: true,
      },
    });

    if (direct) {
      return direct;
    }

    const apiKeyHash = hashSecret(apiKey);
    const channels = await prisma.retailChannel.findMany({
      where: {
        credentials: {
          not: null,
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const match = channels.find((channel) => {
      const credentials = channel.credentials as
        | { clientSecretHash?: string; revoked?: boolean }
        | null;
      if (!credentials?.clientSecretHash || credentials.revoked) {
        return false;
      }
      return credentials.clientSecretHash === apiKeyHash;
    });

    if (!match) {
      return null;
    }

    const credentials = match.credentials as
      | { branchId?: string; domain?: string }
      | null;

    return {
      id: match.id,
      tenantId: match.tenantId,
      branchId: credentials?.branchId ?? "branch_main",
      domain: credentials?.domain ?? match.name ?? "",
      status: match.status,
      apiKey,
    };
  },
};
