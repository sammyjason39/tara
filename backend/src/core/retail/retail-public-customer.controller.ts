import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Patch,
  Post,
  Req,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { Request } from 'express';
import { TenantInterceptor } from '../../gateway/tenant.interceptor';
import { ChannelCredentialsGuard } from './guards/channel-credentials.guard';
import { CustomerAuthGuard } from './guards/customer-auth.guard';
import { RetailPublicAuthService } from './retail-public-auth.service';
import { RetailPublicCustomerService } from './retail-public-customer.service';

@Controller('retail/public')
@UseInterceptors(TenantInterceptor)
@UseGuards(ChannelCredentialsGuard, CustomerAuthGuard)
export class RetailPublicCustomerController {
  constructor(
    private readonly authService: RetailPublicAuthService,
    private readonly customerService: RetailPublicCustomerService,
  ) {}

  private async resolveCustomer(request: Request) {
    const payload = (request as any).customerAuth;
    const connector = (request as any).connectorScope;
    const customer = await this.authService.getCustomerFromToken(payload);
    if (payload.tenantId !== connector.tenantId) {
      throw new ForbiddenException('Tenant mismatch');
    }
    return { customer, tenantId: payload.tenantId };
  }

  @Get('cart')
  async getCart(@Req() request: Request) {
    const { customer, tenantId } = await this.resolveCustomer(request);
    const payload = await this.customerService.buildCartResponse(tenantId, customer.id);
    return { success: true, data: payload };
  }

  @Post('cart/items')
  async addCartItem(@Req() request: Request, @Body() body: any) {
    const { customer, tenantId } = await this.resolveCustomer(request);
    const payload = await this.customerService.addCartItem(tenantId, customer.id, body ?? {});
    return { success: true, data: payload };
  }

  @Patch('cart/items/:id')
  async updateCartItem(@Req() request: Request) {
    const { customer, tenantId } = await this.resolveCustomer(request);
    const itemId = request.params.id;
    const quantity = Number(request.body?.quantity);
    const payload = await this.customerService.updateCartItem(
      tenantId,
      customer.id,
      itemId,
      quantity,
    );
    return { success: true, data: payload };
  }

  @Delete('cart/items/:id')
  async deleteCartItem(@Req() request: Request) {
    const { customer, tenantId } = await this.resolveCustomer(request);
    const itemId = request.params.id;
    const payload = await this.customerService.removeCartItem(tenantId, customer.id, itemId);
    return { success: true, data: payload };
  }

  @Post('cart/clear')
  async clearCart(@Req() request: Request) {
    const { customer, tenantId } = await this.resolveCustomer(request);
    const payload = await this.customerService.clearCart(tenantId, customer.id);
    return { success: true, data: payload };
  }

  @Get('wishlist')
  async getWishlist(@Req() request: Request) {
    const { customer, tenantId } = await this.resolveCustomer(request);
    const payload = await this.customerService.buildWishlistResponse(tenantId, customer.id);
    return { success: true, data: payload };
  }

  @Post('wishlist/items')
  async addWishlistItem(@Req() request: Request, @Body() body: any) {
    const { customer, tenantId } = await this.resolveCustomer(request);
    const payload = await this.customerService.addWishlistItem(tenantId, customer.id, body ?? {});
    return { success: true, data: payload };
  }

  @Delete('wishlist/items/:id')
  async deleteWishlistItem(@Req() request: Request) {
    const { customer, tenantId } = await this.resolveCustomer(request);
    const itemId = request.params.id;
    const payload = await this.customerService.removeWishlistItem(
      tenantId,
      customer.id,
      itemId,
    );
    return { success: true, data: payload };
  }

  @Post('checkout')
  async checkout(@Req() request: Request, @Body() body: any) {
    const { customer, tenantId } = await this.resolveCustomer(request);
    const payload = await this.customerService.checkout(tenantId, customer.id, body ?? {});
    return { success: true, data: payload };
  }
}
