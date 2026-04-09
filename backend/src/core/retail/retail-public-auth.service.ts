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
  tenantId: string;
  branchId: string;
  connector?: string | null;
  gatewayUrl?: string | null;
};

type CustomerAuthPayload = {
  sub: string;
  tenantId: string;
  connectorId: string;
  branchId: string;
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
    tenantId: string,
    clientId: string | undefined,
    clientSecret: string | undefined,
  ): Promise<ConnectorScope> {
    const channel = await this.gatewayService.authenticateChannel(
      tenantId,
      clientId,
      clientSecret,
    );

    const credentials = channel.credentials as {
      branchId?: string;
      connector?: string;
      gatewayUrl?: string;
    } | null;

    return {
      channelId: channel.id,
      tenantId: channel.tenantId,
      branchId: credentials?.branchId ?? "branch_main",
      connector: credentials?.connector ?? channel.name ?? null,
      gatewayUrl: credentials?.gatewayUrl ?? null,
    };
  }

  async registerCustomer(
    tenantId: string,
    scope: ConnectorScope,
    payload: { name: string; email: string; password: string; phone?: string },
    meta: { ip?: string | null; userAgent?: string | null },
  ) {
    const normalizedEmail = payload.email.trim().toLowerCase();
    const passwordValue = payload.password.trim();

    if (passwordValue.length < 8) {
      throw new ForbiddenException("Password must be at least 8 characters");
    }

    const existing = await this.prisma.retailCustomer.findFirst({
      where: { tenantId: tenantId, email: normalizedEmail },
    });
    if (existing) {
      throw new ForbiddenException("Email already registered");
    }

    const customer = await this.prisma.retailCustomer.create({
      data: {
        id: '7wsfk54f',
        updatedAt: new Date(),
        tenantId: tenantId,
        name: payload.name.trim(),
        email: normalizedEmail,
        phone: payload.phone?.trim() || null,
        address: "",
        tier: "regular",
        points: 0,
      },
    });

    const passwordHash = await bcrypt.hash(passwordValue, 12);
    await this.prisma.retailCustomerAuth.create({
      data: {
        id: '7jmki1z9',
        updatedAt: new Date(),
        customerId: customer.id,
        passwordHash,
        passwordUpdatedAt: new Date(),
      },
    });

    const tokens = await this.issueTokens(
      { id: customer.id, tenantId: tenantId },
      scope,
      meta,
    );

    return { customer, tokens };
  }

  async loginCustomer(
    tenantId: string,
    scope: ConnectorScope,
    payload: { email: string; password: string },
    meta: { ip?: string | null; userAgent?: string | null },
  ) {
    const normalizedEmail = payload.email.trim().toLowerCase();
    const customer = await this.prisma.retailCustomer.findFirst({
      where: { tenantId: tenantId, email: normalizedEmail },
    });
    if (!customer) {
      throw new UnauthorizedException("Invalid credentials");
    }

    const auth = await this.prisma.retailCustomerAuth.findUnique({
      where: { customerId: customer.id },
    });
    if (!auth) {
      throw new UnauthorizedException("Invalid credentials");
    }

    if (auth.lockedUntil && auth.lockedUntil > new Date()) {
      throw new ForbiddenException(
        "Account temporarily locked. Try again later.",
      );
    }

    const passwordMatch = await bcrypt.compare(
      payload.password,
      auth.passwordHash,
    );
    if (!passwordMatch) {
      const nextAttempts = auth.failedAttempts + 1;
      const shouldLock = nextAttempts >= this.maxLoginAttempts;
      await this.prisma.retailCustomerAuth.update({
        where: { customerId: customer.id },
        data: {
          failedAttempts: nextAttempts,
          lastFailedAt: new Date(),
          lockedUntil: shouldLock
            ? new Date(Date.now() + this.lockoutMinutes * 60 * 1000)
            : null,
        },
      });
      throw new UnauthorizedException("Invalid credentials");
    }

    await this.prisma.retailCustomerAuth.update({
      where: { customerId: customer.id },
      data: {
        failedAttempts: 0,
        lastFailedAt: null,
        lockedUntil: null,
      },
    });

    const tokens = await this.issueTokens(
      { id: customer.id, tenantId: tenantId },
      scope,
      meta,
    );

    return { customer, tokens };
  }

  async refreshTokens(
    tenantId: string,
    scope: ConnectorScope,
    refreshToken: string,
    meta: { ip?: string | null; userAgent?: string | null },
  ) {
    const refreshHash = this.hashToken(refreshToken);
    const session = await this.prisma.retailCustomerSession.findFirst({
      where: {
        tokenHash: refreshHash,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
    });
    if (!session) {
      throw new UnauthorizedException("Invalid refresh token");
    }

    const customer = await this.prisma.retailCustomer.findFirst({
      where: { id: session.customerId, tenantId: tenantId },
    });
    if (!customer) {
      throw new UnauthorizedException("Invalid session");
    }

    await this.prisma.retailCustomerSession.update({
      where: { id: session.id },
      data: { revokedAt: new Date() },
    });

    const tokens = await this.issueTokens(
      { id: customer.id, tenantId: tenantId },
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
    const customer = await this.prisma.retailCustomer.findFirst({
      where: { id: payload.sub, tenantId: payload.tenantId },
    });
    if (!customer) {
      throw new NotFoundException("Customer not found");
    }
    return customer;
  }

  private async issueTokens(
    customer: { id: string; tenantId: string },
    scope: ConnectorScope,
    meta: { ip?: string | null; userAgent?: string | null },
  ) {
    const accessToken = jwt.sign(
      {
        sub: customer.id,
        tenantId: customer.tenantId,
        connectorId: scope.channelId,
        branchId: scope.branchId,
        scope: "retail.public",
      },
      this.jwtSecret,
      { expiresIn: this.accessTokenTtl },
    );

    const refreshToken = randomBytes(48).toString("hex");
    const refreshHash = this.hashToken(refreshToken);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + this.refreshTokenTtlDays);

    await this.prisma.retailCustomerSession.create({
      data: {
        id: 'al4zz5uh',
        updatedAt: new Date(),
        customerId: customer.id,
        tenantId: customer.tenantId,
        tokenHash: refreshHash,
        expiresAt,
        ipAddress: meta.ip ?? null,
        userAgent: meta.userAgent ?? null,
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
    await this.prisma.retailCustomerSession.updateMany({
      where: { tokenHash: refreshHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  private hashToken(token: string) {
    return createHash("sha256").update(token).digest("hex");
  }
}
