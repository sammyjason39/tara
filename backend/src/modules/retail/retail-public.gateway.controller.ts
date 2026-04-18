import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Headers,
  Req,
  Body,
  UseInterceptors,
  Param,
  UnauthorizedException,
} from "@nestjs/common";
import { Request } from "express";
import { TenantInterceptor } from "../../gateway/tenant.interceptor";
import { TenantContext } from "../../gateway/tenant-context.interface";
import { RetailGatewayService } from "./retail-gateway.service";
import {
  RetailPublicOrderRequestDto,
  CustomerRegisterDto,
  CustomerLoginDto,
  CustomerRefreshDto,
  CartItemDto,
  UpdateCartItemDto,
  WishlistItemDto,
} from "./dto/public-gateway.dto";
import * as jwt from "jsonwebtoken";

const AUTH_JWT_SECRET =
  process.env.RETAIL_AUTH_JWT_SECRET ||
  process.env.JWT_SECRET ||
  "dev_retail_auth_secret";

interface RequestWithTenant extends Request {
  tenantContext: TenantContext;
  customerAuth?: { sub: string; tenant_id: string };
}

@Controller("retail/public")
@UseInterceptors(TenantInterceptor)
export class RetailPublicGatewayController {
  constructor(private readonly gatewayService: RetailGatewayService) {}

  // --- Auth & Customer ---

  @Post("auth/register")
  async register(
    @Req() request: RequestWithTenant,
    @Headers("x-client-id") clientId: string,
    @Headers("x-client-secret") clientSecret: string,
    @Body() payload: CustomerRegisterDto,
  ) {
    const { tenant_id } = request.tenantContext;
    return this.gatewayService.registerCustomer(
      tenant_id,
      clientId,
      clientSecret,
      payload,
    );
  }

  @Post("auth/login")
  async login(
    @Req() request: RequestWithTenant,
    @Headers("x-client-id") clientId: string,
    @Headers("x-client-secret") clientSecret: string,
    @Body() payload: CustomerLoginDto,
  ) {
    const { tenant_id } = request.tenantContext;
    return this.gatewayService.loginCustomer(
      tenant_id,
      clientId,
      clientSecret,
      payload,
    );
  }

  @Post("auth/refresh")
  async refresh(
    @Req() request: RequestWithTenant,
    @Headers("x-client-id") clientId: string,
    @Headers("x-client-secret") clientSecret: string,
    @Body() payload: CustomerRefreshDto,
  ) {
    const { tenant_id } = request.tenantContext;
    return this.gatewayService.refreshTokens(
      tenant_id,
      clientId,
      clientSecret,
      payload,
    );
  }

  @Post("auth/logout")
  async logout(
    @Req() request: RequestWithTenant,
    @Body("refreshToken") refreshToken: string,
  ) {
    const { tenant_id } = request.tenantContext;
    return this.gatewayService.logoutCustomer(tenant_id, refreshToken);
  }

  @Get("auth/me")
  async getMe(@Req() request: RequestWithTenant) {
    const auth = this.getCustomerAuth(request);
    return this.gatewayService.mapToPublicCustomer(
      await this.gatewayService.findCustomerById(auth.tenant_id, auth.sub),
    );
  }

  // --- Products ---

  @Get("products")
  async getProducts(
    @Req() request: RequestWithTenant,
    @Headers("x-client-id") clientId: string,
    @Headers("x-client-secret") clientSecret: string,
  ) {
    const { tenant_id } = request.tenantContext;
    return this.gatewayService.getProducts(tenant_id, clientId, clientSecret);
  }

  @Get("products/:id")
  async getProduct(
    @Req() request: RequestWithTenant,
    @Headers("x-client-id") clientId: string,
    @Headers("x-client-secret") clientSecret: string,
    @Param("id") product_id: string,
  ) {
    const { tenant_id } = request.tenantContext;
    return this.gatewayService.getProductById(
      tenant_id,
      clientId,
      clientSecret,
      product_id,
    );
  }

  @Get("categories")
  async getCategories(
    @Req() request: RequestWithTenant,
    @Headers("x-client-id") clientId: string,
    @Headers("x-client-secret") clientSecret: string,
  ) {
    const { tenant_id } = request.tenantContext;
    return this.gatewayService.getCategories(tenant_id, clientId, clientSecret);
  }

  @Get("promotions")
  async getPromotions(
    @Req() request: RequestWithTenant,
    @Headers("x-client-id") clientId: string,
    @Headers("x-client-secret") clientSecret: string,
  ) {
    const { tenant_id } = request.tenantContext;
    return this.gatewayService.getPromotions(tenant_id, clientId, clientSecret);
  }

  // --- Cart ---

  @Get("cart")
  async getCart(@Req() request: RequestWithTenant) {
    const auth = this.getCustomerAuth(request);
    return this.gatewayService.getCart(auth.tenant_id, auth.sub);
  }

  @Post("cart/items")
  async addToCart(
    @Req() request: RequestWithTenant,
    @Body() payload: CartItemDto,
  ) {
    const auth = this.getCustomerAuth(request);
    return this.gatewayService.addToCart(auth.tenant_id, auth.sub, payload);
  }

  @Patch("cart/items/:id")
  async updateCartItem(
    @Req() request: RequestWithTenant,
    @Param("id") item_id: string,
    @Body() payload: UpdateCartItemDto,
  ) {
    const auth = this.getCustomerAuth(request);
    return this.gatewayService.updateCartItem(
      auth.tenant_id,
      auth.sub,
      item_id,
      payload,
    );
  }

  @Delete("cart/items/:id")
  async removeFromCart(
    @Req() request: RequestWithTenant,
    @Param("id") item_id: string,
  ) {
    const authCtx = this.getCustomerAuth(request);
    return this.gatewayService.removeFromCart(
      authCtx.tenant_id,
      authCtx.sub,
      item_id,
    );
  }

  @Delete("cart")
  async clearCart(@Req() request: RequestWithTenant) {
    const auth = this.getCustomerAuth(request);
    return this.gatewayService.clearCart(auth.tenant_id, auth.sub);
  }

  // --- Wishlist ---

  @Get("wishlist")
  async getWishlist(@Req() request: RequestWithTenant) {
    const auth = this.getCustomerAuth(request);
    return this.gatewayService.getWishlist(auth.tenant_id, auth.sub);
  }

  @Post("wishlist/items")
  async addToWishlist(
    @Req() request: RequestWithTenant,
    @Body() payload: WishlistItemDto,
  ) {
    const auth = this.getCustomerAuth(request);
    return this.gatewayService.addToWishlist(auth.tenant_id, auth.sub, payload);
  }

  @Delete("wishlist/items/:id")
  async removeFromWishlist(
    @Req() request: RequestWithTenant,
    @Param("id") item_id: string,
  ) {
    const auth = this.getCustomerAuth(request);
    return this.gatewayService.removeFromWishlist(
      auth.tenant_id,
      auth.sub,
      item_id,
    );
  }

  // --- Checkout ---

  @Post("orders")
  async createOrder(
    @Req() request: RequestWithTenant,
    @Headers("x-client-id") clientId: string,
    @Headers("x-client-secret") clientSecret: string,
    @Body() payload: RetailPublicOrderRequestDto,
  ) {
    const { tenant_id } = request.tenantContext;
    return this.gatewayService.createOrder(
      tenant_id,
      clientId,
      clientSecret,
      payload,
    );
  }

  // --- Events ---

  @Post("events")
  async logEvent(
    @Req() request: RequestWithTenant,
    @Headers("x-client-id") clientId: string,
    @Headers("x-client-secret") clientSecret: string,
    @Body() payload: any,
  ) {
    const { tenant_id } = request.tenantContext;
    return this.gatewayService.logEvent(
      tenant_id,
      clientId,
      clientSecret,
      payload,
    );
  }

  // --- internal helper (simulating middleware) ---

  private getCustomerAuth(req: RequestWithTenant) {
    const authHeader = req.headers.authorization ?? "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.slice(7)
      : (req.headers["x-access-token"] as string);

    if (!token) throw new UnauthorizedException("Missing access token");

    try {
      const payload = jwt.verify(token, AUTH_JWT_SECRET) as {
        sub: string;
        tenant_id: string;
      };
      return payload;
    } catch (e) {
      throw new UnauthorizedException("Invalid or expired access token");
    }
  }
}
