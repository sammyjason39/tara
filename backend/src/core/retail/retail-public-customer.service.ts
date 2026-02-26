import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "../../persistence/prisma.service";
import { RetailService } from "./retail.service";

@Injectable()
export class RetailPublicCustomerService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly retailService: RetailService,
  ) {}

  private async getOrCreateCart(tenantId: string, customerId: string) {
    return this.prisma.retailCart.upsert({
      where: { customerId },
      update: {},
      create: {
        tenantId: tenantId,
        customerId,
        status: "active",
      },
    });
  }

  async buildCartResponse(tenantId: string, customerId: string) {
    const cart = await this.prisma.retailCart.findFirst({
      where: { tenantId: tenantId, customerId },
      include: { items: { include: { product: true } } },
    });

    if (!cart) {
      return { id: null, items: [], subtotal: 0, tax: 0, total: 0 };
    }

    const items = cart.items.map((item: any) => {
      const unitPrice = Number(item.unitPrice);
      const quantity = Number(item.quantity);
      return {
        id: item.id,
        productId: item.productId,
        sku: item.product?.sku ?? "",
        name: item.product?.name ?? "Unknown Item",
        quantity,
        unitPrice,
        totalPrice: unitPrice * quantity,
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
      updatedAt: cart.updatedAt.toISOString(),
    };
  }

  async addCartItem(
    tenantId: string,
    customerId: string,
    payload: { productId?: string; sku?: string; quantity?: number },
  ) {
    const qty = Number(payload.quantity ?? 1);
    if (!payload.productId && !payload.sku) {
      throw new BadRequestException("productId or sku is required");
    }
    if (!Number.isFinite(qty) || qty <= 0) {
      throw new BadRequestException("quantity must be greater than 0");
    }

    const product = payload.productId
      ? await this.prisma.product.findFirst({
          where: { id: String(payload.productId), tenantId: tenantId },
        })
      : await this.prisma.product.findFirst({
          where: { tenantId: tenantId, sku: String(payload.sku) },
        });

    if (!product) {
      throw new NotFoundException("Product not found");
    }

    const cart = await this.getOrCreateCart(tenantId, customerId);
    const existing = await this.prisma.retailCartItem.findFirst({
      where: { cartId: cart.id, productId: product.id },
    });

    if (existing) {
      await this.prisma.retailCartItem.update({
        where: { id: existing.id },
        data: { quantity: existing.quantity + qty },
      });
    } else {
      await this.prisma.retailCartItem.create({
        data: {
          cartId: cart.id,
          productId: product.id,
          quantity: qty,
          unitPrice: product.basePrice ?? 0,
        },
      });
    }

    return this.buildCartResponse(tenantId, customerId);
  }

  async updateCartItem(
    tenantId: string,
    customerId: string,
    itemId: string,
    quantity: number,
  ) {
    if (!Number.isFinite(quantity) || quantity < 0) {
      throw new BadRequestException("quantity must be 0 or greater");
    }

    const cart = await this.getOrCreateCart(tenantId, customerId);
    const item = await this.prisma.retailCartItem.findFirst({
      where: { id: itemId, cartId: cart.id },
    });
    if (!item) {
      throw new NotFoundException("Cart item not found");
    }

    if (quantity === 0) {
      await this.prisma.retailCartItem.delete({ where: { id: item.id } });
    } else {
      await this.prisma.retailCartItem.update({
        where: { id: item.id },
        data: { quantity },
      });
    }

    return this.buildCartResponse(tenantId, customerId);
  }

  async removeCartItem(tenantId: string, customerId: string, itemId: string) {
    const cart = await this.getOrCreateCart(tenantId, customerId);
    const item = await this.prisma.retailCartItem.findFirst({
      where: { id: itemId, cartId: cart.id },
    });
    if (!item) {
      throw new NotFoundException("Cart item not found");
    }
    await this.prisma.retailCartItem.delete({ where: { id: item.id } });
    return this.buildCartResponse(tenantId, customerId);
  }

  async clearCart(tenantId: string, customerId: string) {
    const cart = await this.getOrCreateCart(tenantId, customerId);
    await this.prisma.retailCartItem.deleteMany({ where: { cartId: cart.id } });
    return this.buildCartResponse(tenantId, customerId);
  }

  async buildWishlistResponse(tenantId: string, customerId: string) {
    const wishlist = await this.prisma.retailWishlist.findFirst({
      where: { tenantId: tenantId, customerId },
      include: { items: { include: { product: true } } },
    });

    if (!wishlist) {
      return { id: null, items: [] };
    }

    const items = wishlist.items.map((item: any) => ({
      id: item.id,
      productId: item.productId,
      sku: item.product?.sku ?? "",
      name: item.product?.name ?? "Unknown Item",
      addedAt: item.createdAt.toISOString(),
    }));

    return {
      id: wishlist.id,
      items,
      updatedAt: wishlist.updatedAt.toISOString(),
    };
  }

  async addWishlistItem(
    tenantId: string,
    customerId: string,
    payload: { productId?: string; sku?: string },
  ) {
    if (!payload.productId && !payload.sku) {
      throw new BadRequestException("productId or sku is required");
    }

    const product = payload.productId
      ? await this.prisma.product.findFirst({
          where: { id: String(payload.productId), tenantId: tenantId },
        })
      : await this.prisma.product.findFirst({
          where: { tenantId: tenantId, sku: String(payload.sku) },
        });

    if (!product) {
      throw new NotFoundException("Product not found");
    }

    const wishlist = await this.prisma.retailWishlist.upsert({
      where: { customerId },
      update: {},
      create: {
        tenantId: tenantId,
        customerId,
      },
    });

    const existing = await this.prisma.retailWishlistItem.findFirst({
      where: { wishlistId: wishlist.id, productId: product.id },
    });

    if (!existing) {
      await this.prisma.retailWishlistItem.create({
        data: { wishlistId: wishlist.id, productId: product.id },
      });
    }

    return this.buildWishlistResponse(tenantId, customerId);
  }

  async removeWishlistItem(
    tenantId: string,
    customerId: string,
    itemId: string,
  ) {
    const wishlist = await this.prisma.retailWishlist.findFirst({
      where: { tenantId: tenantId, customerId },
    });
    if (!wishlist) {
      throw new NotFoundException("Wishlist not found");
    }
    const item = await this.prisma.retailWishlistItem.findFirst({
      where: { id: itemId, wishlistId: wishlist.id },
    });
    if (!item) {
      throw new NotFoundException("Wishlist item not found");
    }
    await this.prisma.retailWishlistItem.delete({ where: { id: item.id } });
    return this.buildWishlistResponse(tenantId, customerId);
  }

  async checkout(
    tenantId: string,
    customerId: string,
    payload: {
      paymentStatus?: string;
      paymentMethod?: string;
      paymentReference?: string;
    },
  ) {
    const cart = await this.prisma.retailCart.findFirst({
      where: { tenantId: tenantId, customerId },
      include: { items: { include: { product: true } } },
    });

    if (!cart || cart.items.length === 0) {
      throw new BadRequestException("Cart is empty");
    }

    const store = await this.prisma.store.findFirst({
      where: { tenantId: tenantId, deletedAt: null },
      orderBy: { createdAt: "asc" },
    });
    if (!store) {
      throw new NotFoundException("No store configured");
    }

    const items = cart.items.map((item: any) => ({
      productId: item.productId,
      quantity: Number(item.quantity),
      unitPrice: Number(item.unitPrice),
    }));

    const subtotal = items.reduce(
      (sum: number, item: any) => sum + item.unitPrice * item.quantity,
      0,
    );

    const paymentStatus = String(payload.paymentStatus ?? "PENDING");
    const status = paymentStatus === "PAID" ? "paid" : "pending_payment";
    const paymentMethod = payload.paymentMethod ?? "card";
    const paymentReference = payload.paymentReference ?? undefined;

    const order = await this.retailService.createOrder(
      tenantId,
      store.locationId || "",
      {
        storeId: store.id,
        terminalId: "api-gateway",
        customerId: customerId,
        items,
        paymentMethod: paymentMethod as any,
        grandTotal: subtotal,
      },
      customerId,
    );

    if (paymentStatus === "PAID") {
      await this.retailService.processPayment(tenantId, order.id, {
        amount: Number(order.grand_total),
        method: paymentMethod as any,
      });
    }

    await this.prisma.retailCartItem.deleteMany({ where: { cartId: cart.id } });

    return order;
  }
}
