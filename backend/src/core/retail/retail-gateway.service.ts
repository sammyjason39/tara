import {
  Injectable,
  UnauthorizedException,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from "@nestjs/common";
import { RetailService } from "./retail.service";
import {
  RetailPublicOrderRequestDto,
  CustomerRegisterDto,
  CustomerLoginDto,
  CustomerRefreshDto,
  CartItemDto,
  UpdateCartItemDto,
  WishlistItemDto,
} from "./dto/public-gateway.dto";
import { createHash, randomBytes } from "crypto";
import * as bcrypt from "bcryptjs";
import * as jwt from "jsonwebtoken";

const AUTH_JWT_SECRET =
  process.env.RETAIL_AUTH_JWT_SECRET ||
  process.env.JWT_SECRET ||
  "dev_retail_auth_secret";
const ACCESS_TOKEN_TTL = "15m";
const REFRESH_TOKEN_TTL_DAYS = 30;

export interface PublicProductView {
  id: string;
  name: string;
  sku: string;
  price: number;
  stockLevel: "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK";
  category: string;
  maxQuantity: number;
}

@Injectable()
export class RetailGatewayService {
  constructor(private readonly retailService: RetailService) {}

  // --- Products ---

  async getProducts(
    tenantId: string,
    clientId: string | undefined,
    clientSecret: string | undefined,
  ): Promise<PublicProductView[]> {
    await this.authenticateChannel(tenantId, clientId, clientSecret);
    const products = await this.retailService.listProducts(tenantId);
    return products.map((product) => ({
      id: product.id,
      name: product.name,
      sku: product.sku,
      price: Number(product.base_price),
      stockLevel: "IN_STOCK",
      category: product.category_id,
      maxQuantity: 999,
    }));
  }

  async getProductById(
    tenantId: string,
    clientId: string | undefined,
    clientSecret: string | undefined,
    productId: string,
  ): Promise<any> {
    await this.authenticateChannel(tenantId, clientId, clientSecret);
    const product = await this.retailService
      .listProducts(tenantId)
      .then((ps) => ps.find((p) => p.id === productId));
    if (!product) throw new NotFoundException("Product not found");

    const stock = await this.retailService.getStockStatus(tenantId, productId);

    return {
      id: product.id,
      sku: product.sku,
      name: product.name,
      description: product.description,
      basePrice: product.base_price,
      currency: product.currency,
      prices: product.prices,
      variants: product.variants,
      seo: product.seo,
      stockLevel: stock.status,
    };
  }

  async getCategories(
    tenantId: string,
    clientId: string | undefined,
    clientSecret: string | undefined,
  ): Promise<any[]> {
    await this.authenticateChannel(tenantId, clientId, clientSecret);
    // Mocking tree structure since repository doesn't support it yet
    return [
      {
        id: "cat-1",
        name: "Electronics",
        slug: "electronics",
        children: [
          { id: "cat-1-1", name: "Laptops", slug: "laptops", children: [] },
          { id: "cat-1-2", name: "Phones", slug: "phones", children: [] },
        ],
      },
      {
        id: "cat-2",
        name: "Clothing",
        slug: "clothing",
        children: [],
      },
    ];
  }

  async getPromotions(
    tenantId: string,
    clientId: string | undefined,
    clientSecret: string | undefined,
    categoryId?: string,
  ): Promise<any[]> {
    await this.authenticateChannel(tenantId, clientId, clientSecret);
    const promos = await this.retailService.listPromotions(tenantId);
    return promos.map((p) => ({
      id: p.id,
      code: p.code || `PROMO-${p.id.slice(0, 4)}`,
      label: p.title || p.label,
      discountType: p.type === "percent" ? "PERCENT" : "FIXED",
      value: p.value,
      scope: p.target === "category" ? "CATEGORY" : "GLOBAL",
    }));
  }

  // --- Auth & Customer ---

  async registerCustomer(
    tenantId: string,
    clientId: string,
    clientSecret: string,
    data: CustomerRegisterDto,
  ) {
    const scope = await this.authenticateChannel(
      tenantId,
      clientId,
      clientSecret,
    );

    const existing = await this.retailService.findCustomerByEmail(
      tenantId,
      data.email,
    );
    if (existing) {
      throw new ConflictException("Email already registered");
    }

    const passwordHash = await bcrypt.hash(data.password, 10);
    const customer = await this.retailService.createCustomer(tenantId, {
      name: data.name,
      email: data.email,
      phone: data.phone,
      passwordHash,
    });

    const tokens = await this.issueTokens(customer, scope);
    return {
      customer: this.mapToPublicCustomer(customer),
      ...tokens,
    };
  }

  async loginCustomer(
    tenantId: string,
    clientId: string,
    clientSecret: string,
    data: CustomerLoginDto,
  ) {
    const scope = await this.authenticateChannel(
      tenantId,
      clientId,
      clientSecret,
    );

    const customer = await this.retailService.findCustomerByEmail(
      tenantId,
      data.email,
    );
    if (!customer || !customer.auth) {
      throw new UnauthorizedException("Invalid email or password");
    }

    const isValid = await bcrypt.compare(
      data.password,
      customer.auth.passwordHash,
    );
    if (!isValid) {
      throw new UnauthorizedException("Invalid email or password");
    }

    const tokens = await this.issueTokens(customer, scope);
    return {
      customer: this.mapToPublicCustomer(customer),
      ...tokens,
    };
  }

  async refreshTokens(
    tenantId: string,
    clientId: string,
    clientSecret: string,
    data: CustomerRefreshDto,
  ) {
    const scope = await this.authenticateChannel(
      tenantId,
      clientId,
      clientSecret,
    );

    const tokenHash = this.hashToken(data.refreshToken);
    const session = await this.retailService.findCustomerSession(
      tenantId,
      tokenHash,
    );
    if (!session) {
      throw new UnauthorizedException("Invalid or expired refresh token");
    }

    const customer = await this.retailService.findCustomerById(
      tenantId,
      session.customerId,
    );
    if (!customer) {
      throw new UnauthorizedException("Customer not found");
    }

    // Revoke old session
    await this.retailService.revokeCustomerSession(tenantId, tokenHash);

    const tokens = await this.issueTokens(customer, scope);
    return tokens;
  }

  async logoutCustomer(tenantId: string, refreshToken: string) {
    const tokenHash = this.hashToken(refreshToken);
    await this.retailService.revokeCustomerSession(tenantId, tokenHash);
    return { success: true };
  }

  // --- Cart ---

  async getCart(tenantId: string, customerId: string) {
    let cart = await this.retailService.getCart(tenantId, customerId);
    if (!cart) {
      cart = await this.retailService.createCart(tenantId, customerId);
    }
    return this.mapCartResponse(cart);
  }

  async addToCart(tenantId: string, customerId: string, data: CartItemDto) {
    let cart = await this.retailService.getCart(tenantId, customerId);
    if (!cart) {
      cart = await this.retailService.createCart(tenantId, customerId);
    }

    const product = await this.retailService
      .listProducts(tenantId)
      .then((ps) => ps.find((p) => p.id === data.productId));
    if (!product) throw new NotFoundException("Product not found");

    await this.retailService.updateCartItem(tenantId, cart.id, data.productId, {
      quantity: data.quantity,
      unitPrice: Number(product.base_price),
    });

    return this.getCart(tenantId, customerId);
  }

  async updateCartItem(
    tenantId: string,
    customerId: string,
    itemId: string,
    data: UpdateCartItemDto,
  ) {
    const cart = await this.retailService.getCart(tenantId, customerId);
    if (!cart) throw new NotFoundException("Cart not found");

    const item = cart.items.find((i: any) => i.id === itemId);
    if (!item) throw new NotFoundException("Item not found in cart");

    await this.retailService.updateCartItem(tenantId, cart.id, item.productId, {
      quantity: data.quantity,
      unitPrice: Number(item.unitPrice),
    });

    return this.getCart(tenantId, customerId);
  }

  async removeFromCart(tenantId: string, customerId: string, itemId: string) {
    const cart = await this.retailService.getCart(tenantId, customerId);
    if (!cart) throw new NotFoundException("Cart not found");

    await this.retailService.removeCartItem(tenantId, cart.id, itemId);
    return this.getCart(tenantId, customerId);
  }

  async clearCart(tenantId: string, customerId: string) {
    const cart = await this.retailService.getCart(tenantId, customerId);
    if (!cart) return { success: true };

    await this.retailService.clearCart(tenantId, cart.id);
    return { success: true };
  }

  // --- Wishlist ---

  async getWishlist(tenantId: string, customerId: string) {
    let wishlist = await this.retailService.getWishlist(tenantId, customerId);
    if (!wishlist) {
      wishlist = await this.retailService.upsertWishlist(tenantId, customerId);
    }
    return this.mapWishlistResponse(wishlist);
  }

  async addToWishlist(
    tenantId: string,
    customerId: string,
    data: WishlistItemDto,
  ) {
    let wishlist = await this.retailService.getWishlist(tenantId, customerId);
    if (!wishlist) {
      wishlist = await this.retailService.upsertWishlist(tenantId, customerId);
    }

    let productId = data.productId;
    if (!productId && data.sku) {
      const product = await this.retailService
        .listProducts(tenantId)
        .then((ps) => ps.find((p) => p.sku === data.sku));
      if (product) productId = product.id;
    }

    if (!productId) throw new NotFoundException("Product not found");

    await this.retailService.addWishlistItem(tenantId, wishlist.id, productId);
    return this.getWishlist(tenantId, customerId);
  }

  async removeFromWishlist(
    tenantId: string,
    customerId: string,
    itemId: string,
  ) {
    const wishlist = await this.retailService.getWishlist(tenantId, customerId);
    if (!wishlist) throw new NotFoundException("Wishlist not found");

    await this.retailService.removeWishlistItem(tenantId, wishlist.id, itemId);
    return this.getWishlist(tenantId, customerId);
  }

  // --- Orders ---

  async createOrder(
    tenantId: string,
    clientId: string | undefined,
    clientSecret: string | undefined,
    payload: RetailPublicOrderRequestDto,
  ) {
    await this.authenticateChannel(tenantId, clientId, clientSecret);

    const stores = await this.retailService.listStores(tenantId);
    const store = stores[0];
    if (!store) {
      throw new NotFoundException(
        "No fulfillment store configured for this tenant.",
      );
    }

    const availableProducts = await this.retailService.listProducts(tenantId);
    const items = payload.items.map((item) => {
      const product = availableProducts.find((p) => p.sku === item.sku);
      if (!product) {
        throw new NotFoundException(`SKU not found: ${item.sku}`);
      }
      return {
        productId: product.id,
        quantity: item.quantity,
        unitPrice: Number(product.base_price),
      };
    });

    const grandTotal = items.reduce(
      (sum, current) => sum + current.unitPrice * current.quantity,
      0,
    );
    const paymentMethod = this.normalizePaymentMethod(payload.paymentMethod);

    const order = await this.retailService.createOrder(
      tenantId,
      store.location_id,
      {
        storeId: store.id,
        terminalId: "api-gateway",
        customerId: payload.customer?.email,
        items,
        paymentMethod: paymentMethod,
        grandTotal: grandTotal,
      },
      "retail-gateway",
    );

    // Calculate tax via service
    const taxAmount = await this.retailService.calculateTax(tenantId, order.id);

    if (payload.paymentStatus === "PAID") {
      await this.retailService.processPayment(tenantId, order.id, {
        amount: Number(order.grand_total) + taxAmount,
        method: paymentMethod,
      });
    }

    return {
      orderId: order.id,
      status: order.status === "reserved" ? "RESERVED" : "RECEIVED",
      reservationTimeout: order.reservation_expires_at?.toISOString(),
      totals: {
        subtotal: Number(order.subtotal),
        tax: taxAmount,
        grandTotal: Number(order.subtotal) + taxAmount,
      },
      estimatedDelivery: "3-5 Business Days",
      message: `Order ${order.status} from channel ${clientId ?? "unknown"}.`,
    };
  }

  async findCustomerById(tenantId: string, customerId: string) {
    const customer = await this.retailService.findCustomerById(
      tenantId,
      customerId,
    );
    if (!customer) throw new NotFoundException("Customer not found");
    return this.mapToPublicCustomer(customer);
  }

  // --- Events ---

  async logEvent(
    tenantId: string,
    clientId: string,
    clientSecret: string,
    data: any,
  ) {
    await this.authenticateChannel(tenantId, clientId, clientSecret);

    // Add validation to prevent 500 errors on missing mandatory fields
    if (!data?.type || !data?.actor || !data?.timestamp) {
      return {
        success: false,
        error: "Invalid Event Schema",
        required: ["type", "actor", "timestamp"],
      };
    }

    // Add audit info like in Express
    const processedData = {
      ...data,
      audit: {
        traceId: data.audit?.traceId ?? randomBytes(16).toString("hex"),
        receivedAt: new Date().toISOString(),
      },
    };

    const entry = await this.retailService.logEvent(tenantId, processedData);
    return {
      success: true,
      data: {
        key: `audit:retail:${entry.id}`,
        count: 1,
      },
    };
  }

  // --- Helpers ---

  async authenticateChannel(
    tenantId: string,
    clientId: string | undefined,
    clientSecret: string | undefined,
  ) {
    return this.authenticate(tenantId, clientId, clientSecret);
  }

  private normalizePaymentMethod(
    method?: string,
  ): "cash" | "card" | "qr" | "wallet" {
    const normalized = (method ?? "card").toLowerCase();
    const allowed: Array<"cash" | "card" | "qr" | "wallet"> = [
      "cash",
      "card",
      "qr",
      "wallet",
    ];
    if (allowed.includes(normalized as any)) {
      return normalized as (typeof allowed)[number];
    }
    return "card";
  }

  private async authenticate(
    tenantId: string,
    clientId: string | undefined,
    clientSecret: string | undefined,
  ) {
    if (!clientId || !clientSecret) {
      throw new UnauthorizedException(
        "x-client-id and x-client-secret headers are required.",
      );
    }

    const channel = await this.retailService.findChannelByClientId(
      tenantId,
      clientId,
    );
    if (!channel) {
      throw new UnauthorizedException("Invalid channel credentials.");
    }

    const credentials = channel.credentials as {
      clientSecretHash?: string;
      revoked?: boolean;
    } | null;
    if (!credentials?.clientSecretHash) {
      throw new ForbiddenException("Channel credentials are not configured.");
    }

    if (credentials.revoked) {
      throw new ForbiddenException("Channel credentials have been revoked.");
    }

    if (credentials.clientSecretHash !== this.hashSecret(clientSecret)) {
      throw new UnauthorizedException("Invalid channel secret.");
    }

    if (channel.status !== "active") {
      throw new ForbiddenException("Channel is not active.");
    }

    return channel;
  }

  private async issueTokens(customer: any, scope: any) {
    const accessToken = jwt.sign(
      {
        sub: customer.id,
        tenantId: customer.tenantId,
        connectorId: scope.id,
        scope: "retail.public",
      },
      AUTH_JWT_SECRET,
      { expiresIn: ACCESS_TOKEN_TTL },
    );

    const refreshToken = randomBytes(48).toString("hex");
    const tokenHash = this.hashToken(refreshToken);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_TTL_DAYS);

    await this.retailService.createCustomerSession(customer.tenantId, {
      customerId: customer.id,
      tokenHash,
      expiresAt: expiresAt,
    });

    return { accessToken, refreshToken, expiresAt: expiresAt.toISOString() };
  }

  private hashSecret(secret: string): string {
    return createHash("sha256").update(secret).digest("hex");
  }

  private hashToken(token: string): string {
    return createHash("sha256").update(token).digest("hex");
  }

  public mapToPublicCustomer(customer: any) {
    return {
      id: customer.id,
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      tier: customer.tier,
      points: customer.points,
    };
  }

  private mapCartResponse(cart: any) {
    const items = cart.items.map((item: any) => ({
      id: item.id,
      productId: item.productId,
      sku: item.product?.sku,
      name: item.product?.name,
      quantity: item.quantity,
      unitPrice: Number(item.unitPrice),
      totalPrice: Number(item.unitPrice) * item.quantity,
    }));

    const subtotal = items.reduce(
      (sum: number, item: any) => sum + item.totalPrice,
      0,
    );

    return {
      id: cart.id,
      items,
      subtotal,
      tax: 0,
      total: subtotal,
    };
  }

  private mapWishlistResponse(wishlist: any) {
    return {
      id: wishlist.id,
      items: wishlist.items.map((item: any) => ({
        id: item.id,
        productId: item.productId,
        sku: item.product?.sku,
        name: item.product?.name,
      })),
    };
  }
}
