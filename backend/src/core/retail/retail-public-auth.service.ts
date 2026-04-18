import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../../persistence/prisma.service";
import { RetailGatewayService } from "./retail-gateway.service";
import { createHash, randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

type ConnectorScope = {
  channelId: string;
  tenant_id: string;
  branch_id: string;
  connector?: string | null;
  gatewayUrl?: string | null;
};

type CustomerAuthPayload = {
  sub: string;
  tenant_id: string;
  connectorId: string;
  branch_id: string;
  scope: string;
};

@Injectable()
export class RetailPublicAuthService {
  private readonly jwtSecret =
    process.env.RETAIL_AUTH_JWT_SECRET ||
    process.env.JWT_SECRET ||
    "dev_retail_auth_secret";
  private readonly accessTokenTtl = "15m";
  private readonly refreshTokenTtlDays = 30;
  private readonly maxLoginAttempts = 5;
  private readonly lockoutMinutes = 15;

  constructor(
    private readonly prisma: PrismaService,
    private readonly gatewayService: RetailGatewayService,
  ) {}

  async validateConnector(
    tenant_id: string,
    clientId: string | undefined,
    clientSecret: string | undefined,
  ): Promise<ConnectorScope> {
    const channel = await this.gatewayService.authenticateChannel(
      tenant_id,
      clientId,
      clientSecret,
    );

    const credentials = channel.credentials as {
      branch_id?: string;
      connector?: string;
      gatewayUrl?: string;
    } | null;

    return {
      channelId: channel.id,
      tenant_id: channel.tenant_id,
      branch_id: credentials?.branch_id ?? "branch_main",
      connector: credentials?.connector ?? channel.name ?? null,
      gatewayUrl: credentials?.gatewayUrl ?? null,
    };
  }

  async registerCustomer(
    tenant_id: string,
    scope: ConnectorScope,
    payload: { name: string; email: string; password: string; phone?: string },
    meta: { ip?: string | null; user_agent?: string | null },
  ) {
    const normalizedEmail = payload.email.trim().toLowerCase();
    const passwordValue = payload.password.trim();

    if (passwordValue.length < 8) {
      throw new ForbiddenException("Password must be at least 8 characters");
    }

    const existing = await this.prisma.retail_customers.findFirst({
      where: { tenant_id: tenant_id, email: normalizedEmail },
    });
    if (existing) {
      throw new ForbiddenException("Email already registered");
    }

    const customer = await this.prisma.retail_customers.create({
      data: {
        id: '7wsfk54f',
        updated_at: new Date(),
        tenant_id: tenant_id,
        name: payload.name.trim(),
        email: normalizedEmail,
        phone: payload.phone?.trim() || null,
        address: "",
        tier: "regular",
        points: 0,
      },
    });

    const password_hash = await bcrypt.hash(passwordValue, 12);
    await this.prisma.retail_customer_auth.create({
      data: {
        id: '7jmki1z9',
        updated_at: new Date(),
        customer_id: customer.id,
        password_hash: password_hash,
        password_updated_at: new Date(),
      },
    });

    const tokens = await this.issueTokens(
      { id: customer.id, tenant_id: tenant_id },
      scope,
      meta,
    );

    return { customer, tokens };
  }

  async loginCustomer(
    tenant_id: string,
    scope: ConnectorScope,
    payload: { email: string; password: string },
    meta: { ip?: string | null; user_agent?: string | null },
  ) {
    const normalizedEmail = payload.email.trim().toLowerCase();
    const customer = await this.prisma.retail_customers.findFirst({
      where: { tenant_id: tenant_id, email: normalizedEmail },
    });
    if (!customer) {
      throw new UnauthorizedException("Invalid credentials");
    }

    const auth = await this.prisma.retail_customer_auth.findUnique({
      where: { customer_id: customer.id },
    });
    if (!auth) {
      throw new UnauthorizedException("Invalid credentials");
    }

    if (auth.locked_until && auth.locked_until > new Date()) {
      throw new ForbiddenException(
        "Account temporarily locked. Try again later.",
      );
    }

    const passwordMatch = await bcrypt.compare(
      payload.password,
      auth.password_hash,
    );
    if (!passwordMatch) {
      const nextAttempts = auth.failed_attempts + 1;
      const shouldLock = nextAttempts >= this.maxLoginAttempts;
      await this.prisma.retail_customer_auth.update({
        where: { customer_id: customer.id },
        data: {
          failed_attempts: nextAttempts,
          last_failed_at: new Date(),
          locked_until: shouldLock
            ? new Date(Date.now() + this.lockoutMinutes * 60 * 1000)
            : null,
        },
      });
      throw new UnauthorizedException("Invalid credentials");
    }

    await this.prisma.retail_customer_auth.update({
      where: { customer_id: customer.id },
      data: {
        failed_attempts: 0,
        last_failed_at: null,
        locked_until: null,
      },
    });

    const tokens = await this.issueTokens(
      { id: customer.id, tenant_id: tenant_id },
      scope,
      meta,
    );

    return { customer, tokens };
  }

  async refreshTokens(
    tenant_id: string,
    scope: ConnectorScope,
    refreshToken: string,
    meta: { ip?: string | null; user_agent?: string | null },
  ) {
    const refreshHash = this.hashToken(refreshToken);
    const session = await this.prisma.retail_customer_sessions.findFirst({
      where: {
        token_hash: refreshHash,
        revoked_at: null,
        expires_at: { gt: new Date() },
      },
    });
    if (!session) {
      throw new UnauthorizedException("Invalid refresh token");
    }

    const customer = await this.prisma.retail_customers.findFirst({
      where: { id: session.customer_id, tenant_id: tenant_id },
    });
    if (!customer) {
      throw new UnauthorizedException("Invalid session");
    }

    await this.prisma.retail_customer_sessions.update({
      where: { id: session.id },
      data: { revoked_at: new Date() },
    });

    const tokens = await this.issueTokens(
      { id: customer.id, tenant_id: tenant_id },
      scope,
      meta,
    );

    return tokens;
  }

  async logout(refreshToken?: string) {
    if (!refreshToken) {
      return { revoked: false };
    }
    await this.revokeRefreshToken(refreshToken);
    return { revoked: true };
  }

  verifyAccessToken(token: string): CustomerAuthPayload {
    return jwt.verify(token, this.jwtSecret) as CustomerAuthPayload;
  }

  async getCustomerFromToken(payload: CustomerAuthPayload) {
    const customer = await this.prisma.retail_customers.findFirst({
      where: { id: payload.sub, tenant_id: payload.tenant_id },
    });
    if (!customer) {
      throw new NotFoundException("Customer not found");
    }
    return customer;
  }

  private async issueTokens(
    customer: { id: string; tenant_id: string },
    scope: ConnectorScope,
    meta: { ip?: string | null; user_agent?: string | null },
  ) {
    const accessToken = (jwt.sign as any)(
      {
        sub: customer.id,
        tenant_id: customer.tenant_id,
        connectorId: scope.channelId,
        branch_id: scope.branch_id,
        scope: "retail.public",
      },
      this.jwtSecret,
      { expiresIn: this.accessTokenTtl },
    );

    const refreshToken = randomBytes(48).toString("hex");
    const refreshHash = this.hashToken(refreshToken);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + this.refreshTokenTtlDays);

    await this.prisma.retail_customer_sessions.create({
      data: {
        id: 'al4zz5uh',
        updated_at: new Date(),
        customer_id: customer.id,
        tenant_id: customer.tenant_id,
        token_hash: refreshHash,
        expires_at: expiresAt,
        ip_address: meta.ip ?? null,
        user_agent: meta.user_agent ?? null,
      },
    });

    return {
      accessToken,
      refreshToken,
      expiresAt: expiresAt.toISOString(),
    };
  }

  private async revokeRefreshToken(refreshToken: string) {
    const refreshHash = this.hashToken(refreshToken);
    await this.prisma.retail_customer_sessions.updateMany({
      where: { token_hash: refreshHash, revoked_at: null },
      data: { revoked_at: new Date() },
    });
  }

  private hashToken(token: string) {
    return createHash("sha256").update(token).digest("hex");
  }
}
