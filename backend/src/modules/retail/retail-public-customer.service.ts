import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "../../persistence/prisma.service";
import { RetailService } from "./retail.service";
import { Prisma } from "@prisma/client";
import { v4 as uuidv4 } from "uuid";

@Injectable()
export class RetailPublicCustomerService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly retailService: RetailService,
  ) {}

  private async getOrCreateCart(tenant_id: string, customer_id: string) {
    return this.prisma.retail_carts.upsert({
      where: { customer_id: customer_id },
      update: {},
      create: {
        id: `cart-${uuidv4().slice(0, 8)}`,
        tenant_id: tenant_id,
        customer_id: customer_id,
        status: "active",
        updated_at: new Date(),
      },
    });
  }

  async buildCartResponse(tenant_id: string, customer_id: string) {
    const cart = await this.prisma.retail_carts.findFirst({
      where: { tenant_id: tenant_id, customer_id: customer_id },
      include: { retail_cart_items: { include: { item_masters: true } } },
    });

    if (!cart) {
      return { id: null, items: [], subtotal: 0, tax: 0, total: 0 };
    }

    const items = cart.retail_cart_items.map((item: any) => {
      const unit_price = Number(item.unit_price);
      const quantity = Number(item.quantity);
      return {
        id: item.id,
        product_id: item.product_id,
        sku: item.item_masters?.sku ?? "",
        name: item.item_masters?.name ?? "Unknown Item",
        quantity,
        unit_price,
        totalPrice: unit_price * quantity,
      };
    });

    const subtotal = items.reduce(
      (sum: number, item: any) => sum + item.totalPrice,
      0,
    );
    const tax = 0;
    const total = subtotal + tax;

    return {
      id: cart.id,
      items,
      subtotal,
      tax,
      total,
      updated_at: cart.updated_at.toISOString(),
    };
  }

  async addCartItem(
    tenant_id: string,
    customer_id: string,
    payload: { product_id?: string; sku?: string; quantity?: number },
  ) {
    const qty = Number(payload.quantity ?? 1);
    if (!payload.product_id && !payload.sku) {
      throw new BadRequestException("product_id or sku is required");
    }
    if (!Number.isFinite(qty) || qty <= 0) {
      throw new BadRequestException("quantity must be greater than 0");
    }

    const product = payload.product_id
      ? await this.prisma.item_masters.findFirst({
          where: { id: String(payload.product_id), tenant_id: tenant_id },
        })
      : await this.prisma.item_masters.findFirst({
          where: { tenant_id: tenant_id, sku: String(payload.sku) },
        });

    if (!product) {
      throw new NotFoundException("Product not found");
    }

    const cart = await this.getOrCreateCart(tenant_id, customer_id);
    const existing = await this.prisma.retail_cart_items.findFirst({
      where: { cart_id: cart.id, product_id: product.id },
    });

    if (existing) {
      await this.prisma.retail_cart_items.update({
        where: { id: existing.id },
        data: { 
          quantity: Number(existing.quantity) + qty,
          updated_at: new Date()
        },
      });
    } else {
      await this.prisma.retail_cart_items.create({
        data: {
          id: `ci-${uuidv4().slice(0, 8)}`,
          cart_id: cart.id,
          product_id: product.id,
          quantity: qty,
          unit_price: product.base_price ?? 0,
          updated_at: new Date(),
        },
      });
    }

    return this.buildCartResponse(tenant_id, customer_id);
  }

  async updateCartItem(
    tenant_id: string,
    customer_id: string,
    item_id: string,
    quantity: number,
  ) {
    if (!Number.isFinite(quantity) || quantity < 0) {
      throw new BadRequestException("quantity must be 0 or greater");
    }

    const cart = await this.getOrCreateCart(tenant_id, customer_id);
    const item = await this.prisma.retail_cart_items.findFirst({
      where: { id: item_id, cart_id: cart.id },
    });
    if (!item) {
      throw new NotFoundException("Cart item not found");
    }

    if (quantity === 0) {
      await this.prisma.retail_cart_items.delete({ where: { id: item.id } });
    } else {
      await this.prisma.retail_cart_items.update({
        where: { id: item.id },
        data: { quantity: quantity, updated_at: new Date() },
      });
    }

    return this.buildCartResponse(tenant_id, customer_id);
  }

  async removeCartItem(tenant_id: string, customer_id: string, item_id: string) {
    const cart = await this.getOrCreateCart(tenant_id, customer_id);
    const item = await this.prisma.retail_cart_items.findFirst({
      where: { id: item_id, cart_id: cart.id },
    });
    if (!item) {
      throw new NotFoundException("Cart item not found");
    }
    await this.prisma.retail_cart_items.delete({ where: { id: item.id } });
    return this.buildCartResponse(tenant_id, customer_id);
  }

  async clearCart(tenant_id: string, customer_id: string) {
    const cart = await this.getOrCreateCart(tenant_id, customer_id);
    await this.prisma.retail_cart_items.deleteMany({ where: { cart_id: cart.id } });
    return this.buildCartResponse(tenant_id, customer_id);
  }

  async buildWishlistResponse(tenant_id: string, customer_id: string) {
    const wishlist = await this.prisma.retail_wishlists.findFirst({
      where: { tenant_id: tenant_id, customer_id: customer_id },
      include: { retail_wishlist_items: { include: { item_masters: true } } },
    });

    if (!wishlist) {
      return { id: null, items: [] };
    }

    const items = wishlist.retail_wishlist_items.map((item: any) => ({
      id: item.id,
      product_id: item.product_id,
      sku: item.item_masters?.sku ?? "",
      name: item.item_masters?.name ?? "Unknown Item",
      addedAt: item.created_at.toISOString(),
    }));

    return {
      id: wishlist.id,
      items,
      updated_at: wishlist.updated_at.toISOString(),
    };
  }

  async addWishlistItem(
    tenant_id: string,
    customer_id: string,
    payload: { product_id?: string; sku?: string },
  ) {
    if (!payload.product_id && !payload.sku) {
      throw new BadRequestException("product_id or sku is required");
    }

    const product = payload.product_id
      ? await this.prisma.item_masters.findFirst({
          where: { id: String(payload.product_id), tenant_id: tenant_id },
        })
      : await this.prisma.item_masters.findFirst({
          where: { tenant_id: tenant_id, sku: String(payload.sku) },
        });

    if (!product) {
      throw new NotFoundException("Product not found");
    }

    const wishlist = await this.prisma.retail_wishlists.upsert({
      where: { customer_id: customer_id },
      update: {},
      create: {
        id: `wl-${uuidv4().slice(0, 8)}`,
        tenant_id: tenant_id,
        customer_id: customer_id,
        updated_at: new Date(),
      },
    });

    const existing = await this.prisma.retail_wishlist_items.findFirst({
      where: { wishlist_id: wishlist.id, product_id: product.id },
    });

    if (!existing) {
      await this.prisma.retail_wishlist_items.create({
        data: {
          id: `wi-${uuidv4().slice(0, 8)}`,
          wishlist_id: wishlist.id,
          product_id: product.id,
          updated_at: new Date(),
        },
      });
    }

    return this.buildWishlistResponse(tenant_id, customer_id);
  }

  async removeWishlistItem(tenant_id: string, customer_id: string, item_id: string) {
    const wishlist = await this.prisma.retail_wishlists.findFirst({
      where: { tenant_id: tenant_id, customer_id: customer_id },
    });
    if (!wishlist) {
      throw new NotFoundException("Wishlist not found");
    }
    const item = await this.prisma.retail_wishlist_items.findFirst({
      where: { id: item_id, wishlist_id: wishlist.id },
    });
    if (!item) {
      throw new NotFoundException("Wishlist item not found");
    }
    await this.prisma.retail_wishlist_items.delete({ where: { id: item.id } });
    return this.buildWishlistResponse(tenant_id, customer_id);
  }

  async checkout(
    tenant_id: string,
    customer_id: string,
    payload: {
      payment_status?: string;
      payment_method?: string;
      paymentReference?: string;
    },
  ) {
    const cart = await this.prisma.retail_carts.findFirst({
      where: { tenant_id: tenant_id, customer_id: customer_id },
      include: { retail_cart_items: { include: { item_masters: true } } },
    });

    if (!cart || cart.retail_cart_items.length === 0) {
      throw new BadRequestException("Cart is empty");
    }

    const store = await this.prisma.stores.findFirst({
      where: { tenant_id: tenant_id, deleted_at: null },
      orderBy: { created_at: "asc" },
    });
    if (!store) {
      throw new NotFoundException("No store configured");
    }

    const items = cart.retail_cart_items.map((item: any) => ({
      product_id: item.product_id,
      quantity: String(item.quantity),
      unit_price: String(item.unit_price),
    }));

    const subtotal = items.reduce(
      (sum: number, item: any) => sum + Number(item.unit_price) * Number(item.quantity),
      0,
    );

    const payment_status = String(payload.payment_status ?? "PENDING");
    const status = payment_status === "PAID" ? "paid" : "pending_payment";
    const payment_method = payload.payment_method ?? "card";
    const paymentReference = payload.paymentReference ?? undefined;

    const order = await this.retailService.createOrder(
      tenant_id,
      store.location_id || "",
      {
        store_id: store.id,
        terminal_id: "api-gateway",
        customer_id: customer_id,
        items,
        payment_method: payment_method as any,
        grand_total: String(subtotal),
      },
      customer_id,
    );

    if (payment_status === "PAID") {
      await this.retailService.processPayment(
        tenant_id,
        order.id,
        {
          amount: new Prisma.Decimal(subtotal),
          method: payment_method as any,
        },
        customer_id,
      );
    }

    await this.prisma.retail_cart_items.deleteMany({ where: { cart_id: cart.id } });

    return order;
  }
}
