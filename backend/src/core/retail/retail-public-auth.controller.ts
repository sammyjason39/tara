import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  Post,
  Req,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { Request } from 'express';
import { TenantInterceptor } from '../../gateway/tenant.interceptor';
import { RetailPublicAuthService } from './retail-public-auth.service';
import { ChannelCredentialsGuard } from './guards/channel-credentials.guard';
import { CustomerAuthGuard } from './guards/customer-auth.guard';

@Controller('retail/public/auth')
@UseInterceptors(TenantInterceptor)
export class RetailPublicAuthController {
  constructor(private readonly authService: RetailPublicAuthService) {}

  private toPublicCustomer(customer: any) {
    return {
      id: customer.id,
      tenantId: customer.tenantId,
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      tier: customer.tier,
      points: customer.points,
      createdAt: customer.createdAt?.toISOString?.() ?? customer.createdAt,
      updatedAt: customer.updatedAt?.toISOString?.() ?? customer.updatedAt,
    };
  }

  @Post('register')
  @UseGuards(ChannelCredentialsGuard)
  async register(@Req() request: Request, @Body() body: any) {
    const { tenantId } = (request as any).tenantContext;
    const scope = (request as any).connectorScope;
    const { name, email, password, phone } = body ?? {};
    if (!name || !email || !password) {
      throw new BadRequestException('name, email, and password are required');
    }

    const result = await this.authService.registerCustomer(
      tenantId,
      scope,
      { name, email, password, phone },
      { ip: request.ip, userAgent: request.headers['user-agent'] ?? null },
    );

    return {
      success: true,
      data: {
        customer: this.toPublicCustomer(result.customer),
        accessToken: result.tokens.accessToken,
        refreshToken: result.tokens.refreshToken,
        refreshExpiresAt: result.tokens.expiresAt,
      },
    };
  }

  @Post('login')
  @UseGuards(ChannelCredentialsGuard)
  async login(@Req() request: Request, @Body() body: any) {
    const { tenantId } = (request as any).tenantContext;
    const scope = (request as any).connectorScope;
    const { email, password } = body ?? {};
    if (!email || !password) {
      throw new BadRequestException('email and password are required');
    }

    const result = await this.authService.loginCustomer(
      tenantId,
      scope,
      { email, password },
      { ip: request.ip, userAgent: request.headers['user-agent'] ?? null },
    );

    return {
      success: true,
      data: {
        customer: this.toPublicCustomer(result.customer),
        accessToken: result.tokens.accessToken,
        refreshToken: result.tokens.refreshToken,
        refreshExpiresAt: result.tokens.expiresAt,
      },
    };
  }

  @Post('refresh')
  @UseGuards(ChannelCredentialsGuard)
  async refresh(
    @Req() request: Request,
    @Body() body: any,
    @Headers('x-refresh-token') headerToken?: string,
  ) {
    const { tenantId } = (request as any).tenantContext;
    const scope = (request as any).connectorScope;
    const refreshToken = body?.refreshToken ?? headerToken;
    if (!refreshToken) {
      throw new BadRequestException('refreshToken is required');
    }

    const tokens = await this.authService.refreshTokens(
      tenantId,
      scope,
      refreshToken,
      { ip: request.ip, userAgent: request.headers['user-agent'] ?? null },
    );

    return {
      success: true,
      data: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        refreshExpiresAt: tokens.expiresAt,
      },
    };
  }

  @Post('logout')
  @UseGuards(ChannelCredentialsGuard)
  async logout(@Body() body: any, @Headers('x-refresh-token') headerToken?: string) {
    const refreshToken = body?.refreshToken ?? headerToken;
    const result = await this.authService.logout(refreshToken);
    return { success: true, data: result };
  }

  @Get('me')
  @UseGuards(ChannelCredentialsGuard, CustomerAuthGuard)
  async me(@Req() request: Request) {
    const payload = (request as any).customerAuth;
    const customer = await this.authService.getCustomerFromToken(payload);
    return { success: true, data: this.toPublicCustomer(customer) };
  }
}
