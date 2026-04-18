import {
  Injectable,
  UnauthorizedException,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
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
  stock_levels: "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK";
  category: string;
  maxQuantity: number;
}

@Injectable()
export class RetailGatewayService {
  constructor(private readonly retailService: RetailService) {}

  // --- Products ---

  async getProducts(
    tenant_id: string,
    clientId: string | undefined,
    clientSecret: string | undefined,
  ): Promise<PublicProductView[]> {
    await this.authenticateChannel(tenant_id, clientId, clientSecret);
    const { items: products } = await this.retailService.listProducts(
      tenant_id,
      { page: 1, pageSize: 200 },
    );
    return products.map((product) => ({
      id: product.id,
      name: product.name,
      sku: product.sku,
      price: Number(product.base_price),
      stock_levels: "IN_STOCK",
      category: product.category_id,
      maxQuantity: 999,
    }));
  }

  async getProductById(
    tenant_id: string,
    clientId: string | undefined,
    clientSecret: string | undefined,
    product_id: string,
  ): Promise<any> {
    await this.authenticateChannel(tenant_id, clientId, clientSecret);
    const { items: products } = await this.retailService.listProducts(
      tenant_id,
      { page: 1, pageSize: 200 },
    );
    const product = products.find((p) => p.id === product_id);
    if (!product) throw new NotFoundException("Product not found");

    const stock = await this.retailService.getStockStatus(tenant_id, product_id);

    return {
      id: product.id,
      sku: product.sku,
      name: product.name,
      description: product.description,
      base_price: product.base_price,
      currency: product.currency,
      prices: product.prices,
      variants: product.variants,
      seo: product.seo,
      stock_levels: stock.status,
    };
  }

  async getCategories(
    tenant_id: string,
    clientId: string | undefined,
    clientSecret: string | undefined,
  ): Promise<any[]> {
    await this.authenticateChannel(tenant_id, clientId, clientSecret);
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
    tenant_id: string,
    clientId: string | undefined,
    clientSecret: string | undefined,
    category_id?: string,
  ): Promise<any[]> {
    await this.authenticateChannel(tenant_id, clientId, clientSecret);
    const promos = await this.retailService.listPromotions(tenant_id);
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
    tenant_id: string,
    clientId: string,
    clientSecret: string,
    data: CustomerRegisterDto,
  ) {
    const scope = await this.authenticateChannel(
      tenant_id,
      clientId,
      clientSecret,
    );

    const existing = await this.retailService.findCustomerByEmail(
      tenant_id,
      data.email,
    );
    if (existing) {
      throw new ConflictException("Email already registered");
    }

    const password_hash = await bcrypt.hash(data.password, 10);
    const customer = await this.retailService.createCustomer(tenant_id, {
      name: data.name,
      email: data.email,
      phone: data.phone,
      password_hash,
    });

    const tokens = await this.issueTokens(customer, scope);
    return {
      customer: this.mapToPublicCustomer(customer),
      ...tokens,
    };
  }

  async loginCustomer(
    tenant_id: string,
    clientId: string,
    clientSecret: string,
    data: CustomerLoginDto,
  ) {
    const scope = await this.authenticateChannel(
      tenant_id,
      clientId,
      clientSecret,
    );

    const customer = await this.retailService.findCustomerByEmail(
      tenant_id,
      data.email,
    );
    if (!customer || !customer.auth) {
      throw new UnauthorizedException("Invalid email or password");
    }

    const isValid = await bcrypt.compare(
      data.password,
      customer.auth.password_hash,
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
    tenant_id: string,
    clientId: string,
    clientSecret: string,
    data: CustomerRefreshDto,
  ) {
    const scope = await this.authenticateChannel(
      tenant_id,
      clientId,
      clientSecret,
    );

    const tokenHash = this.hashToken(data.refreshToken);
    const session = await this.retailService.findCustomerSession(
      tenant_id,
      tokenHash,
    );
    if (!session) {
      throw new UnauthorizedException("Invalid or expired refresh token");
    }

    const customer = await this.retailService.findCustomerById(
      tenant_id,
      session.customer_id,
    );
    if (!customer) {
      throw new UnauthorizedException("Customer not found");
    }

    // Revoke old session
    await this.retailService.revokeCustomerSession(tenant_id, tokenHash);

    const tokens = await this.issueTokens(customer, scope);
    return tokens;
  }

  async logoutCustomer(tenant_id: string, refreshToken: string) {
    const tokenHash = this.hashToken(refreshToken);
    await this.retailService.revokeCustomerSession(tenant_id, tokenHash);
    return { success: true };
  }

  // --- Cart ---

  async getCart(tenant_id: string, customer_id: string) {
    let cart = await this.retailService.getCart(tenant_id, customer_id);
    if (!cart) {
      cart = await this.retailService.createCart(tenant_id, customer_id);
    }
    return this.mapCartResponse(cart);
  }

  async addToCart(tenant_id: string, customer_id: string, data: CartItemDto) {
    let cart = await this.retailService.getCart(tenant_id, customer_id);
    if (!cart) {
      cart = await this.retailService.createCart(tenant_id, customer_id);
    }

    const { items: products } = await this.retailService.listProducts(
      tenant_id,
      { page: 1, pageSize: 200 },
    );
    const product = products.find((p) => p.id === data.product_id);
    if (!product) throw new NotFoundException("Product not found");

    await this.retailService.updateCartItem(tenant_id, cart.id, data.product_id, {
      quantity: new Prisma.Decimal(data.quantity),
      unit_price: new Prisma.Decimal(String(product.base_price)),
    });

    return this.getCart(tenant_id, customer_id);
  }

  async updateCartItem(
    tenant_id: string,
    customer_id: string,
    item_id: string,
    data: UpdateCartItemDto,
  ) {
    const cart = await this.retailService.getCart(tenant_id, customer_id);
    if (!cart) throw new NotFoundException("Cart not found");

    const item = cart.items.find((i: any) => i.id === item_id);
    if (!item) throw new NotFoundException("Item not found in cart");

    await this.retailService.updateCartItem(tenant_id, cart.id, item.product_id, {
      quantity: new Prisma.Decimal(data.quantity),
      unit_price: new Prisma.Decimal(String(item.unit_price)),
    });

    return this.getCart(tenant_id, customer_id);
  }

  async removeFromCart(tenant_id: string, customer_id: string, item_id: string) {
    const cart = await this.retailService.getCart(tenant_id, customer_id);
    if (!cart) throw new NotFoundException("Cart not found");

    await this.retailService.removeCartItem(tenant_id, cart.id, item_id);
    return this.getCart(tenant_id, customer_id);
  }

  async clearCart(tenant_id: string, customer_id: string) {
    const cart = await this.retailService.getCart(tenant_id, customer_id);
    if (!cart) return { success: true };

    await this.retailService.clearCart(tenant_id, cart.id);
    return { success: true };
  }

  // --- Wishlist ---

  async getWishlist(tenant_id: string, customer_id: string) {
    let wishlist = await this.retailService.getWishlist(tenant_id, customer_id);
    if (!wishlist) {
      wishlist = await this.retailService.upsertWishlist(tenant_id, customer_id);
    }
    return this.mapWishlistResponse(wishlist);
  }

  async addToWishlist(
    tenant_id: string,
    customer_id: string,
    data: WishlistItemDto,
  ) {
    let wishlist = await this.retailService.getWishlist(tenant_id, customer_id);
    if (!wishlist) {
      wishlist = await this.retailService.upsertWishlist(tenant_id, customer_id);
    }

    let product_id = data.product_id;
    if (!product_id && data.sku) {
      const { items: products } = await this.retailService.listProducts(
        tenant_id,
        { page: 1, pageSize: 200 },
      );
      const product = products.find((p) => p.sku === data.sku);
      if (product) product_id = product.id;
    }

    if (!product_id) throw new NotFoundException("Product not found");

    await this.retailService.addWishlistItem(tenant_id, wishlist.id, product_id);
    return this.getWishlist(tenant_id, customer_id);
  }

  async removeFromWishlist(
    tenant_id: string,
    customer_id: string,
    item_id: string,
  ) {
    const wishlist = await this.retailService.getWishlist(tenant_id, customer_id);
    if (!wishlist) throw new NotFoundException("Wishlist not found");

    await this.retailService.removeWishlistItem(tenant_id, wishlist.id, item_id);
    return this.getWishlist(tenant_id, customer_id);
  }

  // --- Orders ---

  async createOrder(
    tenant_id: string,
    clientId: string | undefined,
    clientSecret: string | undefined,
    payload: RetailPublicOrderRequestDto,
  ) {
    await this.authenticateChannel(tenant_id, clientId, clientSecret);

    const stores = await this.retailService.listStores(tenant_id);
    const store = stores[0];
    if (!store) {
      throw new NotFoundException(
        "No fulfillment store configured for this tenant.",
      );
    }

    const resolvedItems = await Promise.all(
      payload.items.map(async (item) => {
        // Optimization: Find by SKU directly instead of listing 200 products
        const product = await this.retailService.findProductBySku(
          tenant_id,
          item.sku,
        );
        if (!product) {
          throw new NotFoundException(`SKU not found: ${item.sku}`);
        }
        return {
          product_id: product.id,
          quantity: item.quantity,
          unit_price: String(product.base_price),
        };
      }),
    );

    const grand_total = resolvedItems.reduce(
      (sum: Prisma.Decimal, current) =>
        sum.add(
          new Prisma.Decimal(current.unit_price).mul(current.quantity),
        ),
      new Prisma.Decimal(0),
    );
    const payment_method = this.normalizePaymentMethod(payload.payment_method);

    const order = await this.retailService.createOrder(
      tenant_id,
      store.location_id,
      {
        store_id: store.id,
        terminal_id: "api-gateway",
        customer_id: payload.customer?.email,
        items: resolvedItems.map(i => ({ ...i, quantity: String(i.quantity) })),
        payment_method: payment_method,
        grand_total: grand_total.toString(),
      },
      clientId ?? "api-gateway",
    );

    // Calculate tax via service
    const tax_amount = await this.retailService.calculateTax(tenant_id, order.id);

    if (payload.payment_status === "PAID") {
      // NOTE: In a production environment, this should be verified against a payment provider webhook.
      // We log this as an 'EXTERNAL_TRUSTED_PAYMENT' for audit visibility.
      await this.retailService.processPayment(
        tenant_id,
        order.id,
        {
          amount: (order.grand_total as unknown as Prisma.Decimal).add(tax_amount),
          method: payment_method,
        },
        clientId ?? "api-gateway",
      );
    }

    return {
      order_id: order.id,
      status: order.status === "reserved" ? "RESERVED" : "RECEIVED",
      reservationTimeout: order.reservation_expires_at?.toISOString(),
      totals: {
        subtotal: Number(order.subtotal),
        tax: tax_amount,
        grand_total: Number(order.subtotal) + tax_amount,
      },
      estimatedDelivery: "3-5 Business Days",
      message: `Order ${order.status} from channel ${clientId ?? "headless-api"}.`,
    };
  }

  async findCustomerById(tenant_id: string, customer_id: string) {
    const customer = await this.retailService.findCustomerById(
      tenant_id,
      customer_id,
    );
    if (!customer) throw new NotFoundException("Customer not found");
    return this.mapToPublicCustomer(customer);
  }

  // --- Events ---

  async logEvent(
    tenant_id: string,
    clientId: string,
    clientSecret: string,
    data: any,
  ) {
    await this.authenticateChannel(tenant_id, clientId, clientSecret);

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

    const entry = await this.retailService.logEvent(tenant_id, processedData);
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
    tenant_id: string,
    clientId: string | undefined,
    clientSecret: string | undefined,
  ) {
    return this.authenticate(tenant_id, clientId, clientSecret);
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
    tenant_id: string,
    clientId: string | undefined,
    clientSecret: string | undefined,
  ) {
    if (!clientId || !clientSecret) {
      throw new UnauthorizedException(
        "x-client-id and x-client-secret headers are required.",
      );
    }

    const channel = await this.retailService.findChannelByClientId(
      tenant_id,
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
    const accessToken = (jwt.sign as any)(
      {
        sub: customer.id,
        tenant_id: customer.tenant_id,
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

    await this.retailService.createCustomerSession(customer.tenant_id, {
      customer_id: customer.id,
      tokenHash,
      expires_at: expiresAt,
    });

    return { accessToken, refreshToken, expires_at: expiresAt.toISOString() };
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
      product_id: item.product_id,
      sku: item.product?.sku,
      name: item.product?.name,
      quantity: item.quantity,
      unit_price: Number(item.unit_price),
      totalPrice: Number(item.unit_price) * item.quantity,
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
        product_id: item.product_id,
        sku: item.product?.sku,
        name: item.product?.name,
      })),
    };
  }
}
