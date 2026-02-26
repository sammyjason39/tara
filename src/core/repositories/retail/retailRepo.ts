import { prisma } from "@/core/persistence/database/client";
import { nextId } from "@/core/persistence";
import type {
  RetailOrder,
  RetailOrderItem,
} from "@/core/types/retail/retail";
import type {
  RetailOrder as PrismaRetailOrder,
  RetailOrderItem as PrismaRetailOrderItem,
} from "@prisma/client";

export interface RetailProductCatalogItem {
  id: string;
  sku: string;
  name: string;
  price: number;
  stock: number;
  category?: string;
}

export type CreateRetailOrderItemPayload = {
  id?: string;
  itemId?: string;
  productId?: string;
  sku?: string;
  name?: string;
  quantity: number;
  unitPrice: number;
  totalPrice?: number;
  discount?: number;
};

export interface CreateRetailOrderPayload {
  id: string;
  storeId: string;
  deviceId?: string;
  cashierId?: string;
  status?: RetailOrder["status"];
  items?: CreateRetailOrderItemPayload[];
  subtotal?: number;
  tax?: number;
  totalAmount: number;
  paymentMethod?: string;
  paymentReference?: string;
  customer?: {
    id?: string;
    name?: string;
    email?: string;
    phone?: string;
  };
}

type RetailOrderWithRelations = PrismaRetailOrder & {
  items: (PrismaRetailOrderItem & { product?: { name?: string } })[];
  customer?: { name?: string };
};

const mapOrderItem = (item: PrismaRetailOrderItem & { product?: { name?: string } }): RetailOrderItem => ({
  itemId: item.productId,
  name: item.product?.name ?? "Unknown Item",
  quantity: Number(item.quantity),
  unitPrice: Number(item.unitPrice),
  totalPrice: Number(item.totalPrice),
  discount: Number(item.discount ?? 0),
});

const mapOrder = (order: RetailOrderWithRelations): RetailOrder => ({
  id: order.id,
  tenantId: order.tenantId,
  storeId: order.storeId,
  deviceId: order.deviceId,
  cashierId: order.cashierId,
  customerName: order.customer?.name ?? order.customerId,
  status: order.status,
  items: (order.items ?? []).map(mapOrderItem),
  subtotal: Number(order.subtotal ?? order.totalAmount),
  tax: Number(order.tax ?? 0),
  totalAmount: Number(order.totalAmount),
  paymentMethod: order.paymentMethod,
  paymentReference: order.paymentReference,
  createdAt: order.createdAt.toISOString(),
  updatedAt: order.updatedAt.toISOString(),
});

async function resolveProductId(
  tenantId: string,
  item: CreateRetailOrderItemPayload,
  fallbackProductId?: string,
) {
  if (item.productId) {
    return item.productId;
  }

  if (item.itemId) {
    return item.itemId;
  }

  if (item.sku) {
    const product = await prisma.product.findUnique({
      where: {
        tenantId_sku: {
          tenantId: tenantId,
          sku: item.sku,
        },
      },
    });
    if (product) {
      return product.id;
    }
  }

  if (fallbackProductId) {
    return fallbackProductId;
  }

  const fallback = await prisma.product.findFirst({
    where: { tenantId: tenantId },
    orderBy: { createdAt: "asc" },
  });

  if (!fallback) {
    throw new Error(`Retail catalog is empty for tenant ${tenantId}`);
  }

  return fallback.id;
}

async function ensureCustomerId(
  tenantId: string,
  customer?: CreateRetailOrderPayload["customer"],
) {
  if (!customer) return undefined;

  if (customer.id) {
    const existing = await prisma.retailCustomer.findUnique({
      where: { id: customer.id },
    });
    if (existing && existing.tenantId === tenantId) {
      return existing.id;
    }
  }

  if (customer.email) {
    const normalizedEmail = customer.email.trim().toLowerCase();
    const existingByEmail = await prisma.retailCustomer.findUnique({
      where: {
        tenantId_email: {
          tenantId: tenantId,
          email: normalizedEmail,
        },
      },
    });
    if (existingByEmail) {
      return existingByEmail.id;
    }
  }

  if (customer.phone) {
    const normalizedPhone = customer.phone.trim();
    const existingByPhone = await prisma.retailCustomer.findUnique({
      where: {
        tenantId_phone: {
          tenantId: tenantId,
          phone: normalizedPhone,
        },
      },
    });
    if (existingByPhone) {
      return existingByPhone.id;
    }
  }

  const created = await prisma.retailCustomer.create({
    data: {
      id: customer.id ?? nextId("rch"),
      tenantId: tenantId,
      name: customer.name ?? "Retail Guest",
      email: customer.email?.trim().toLowerCase(),
      phone: customer.phone?.trim(),
    },
  });

  return created.id;
}

export const retailRepo = {
  async listProducts(tenantId: string): Promise<RetailProductCatalogItem[]> {
    const products = await prisma.product.findMany({
      where: { tenantId: tenantId },
      include: {
        category: true,
        stockLevels: true,
      },
      orderBy: { name: "asc" },
    });

    return products.map((product) => ({
      id: product.id,
      sku: product.sku,
      name: product.name,
      price: Number(product.basePrice ?? 0),
      stock: product.stockLevels.reduce(
        (sum, level) => sum + Number(level.onHand),
        0,
      ),
      category: product.category?.name,
    }));
  },

  async listOrders(tenantId: string): Promise<RetailOrder[]> {
    const orders = await prisma.retailOrder.findMany({
      where: { tenantId: tenantId },
      include: {
        items: { include: { product: true } },
        customer: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return orders.map(mapOrder);
  },

  async createOrder(
    tenantId: string,
    payload: CreateRetailOrderPayload,
  ): Promise<RetailOrder> {
    const fallbackProduct = await prisma.product.findFirst({
      where: { tenantId: tenantId },
      orderBy: { createdAt: "asc" },
    });
    const fallbackProductId = fallbackProduct?.id;

    const items = await Promise.all(
      (payload.items ?? []).map(async (item) => ({
        id: item.id ?? nextId("roi"),
        productId: await resolveProductId(
          tenantId,
          item,
          fallbackProductId,
        ),
        quantity: Number(item.quantity),
        unitPrice: Number(item.unitPrice),
        totalPrice:
          item.totalPrice ?? Number(item.unitPrice) * Number(item.quantity),
        discount: Number(item.discount ?? 0),
      })),
    );

    const customerId = await ensureCustomerId(tenantId, payload.customer);

    const created = (await prisma.retailOrder.create({
      data: {
        id: payload.id,
        tenantId: tenantId,
        storeId: payload.storeId,
        deviceId: payload.deviceId ?? "api-gateway",
        cashierId: payload.cashierId ?? "api-gateway",
        status: payload.status ?? "paid",
        subtotal: payload.subtotal ?? payload.totalAmount,
        tax: payload.tax ?? 0,
        totalAmount: payload.totalAmount,
        paymentMethod: payload.paymentMethod,
        paymentReference: payload.paymentReference,
        customerId,
        items: {
          create: items.map((item) => ({
            id: item.id,
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.totalPrice,
            discount: item.discount,
          })),
        },
      },
      include: {
        items: { include: { product: true } },
        customer: true,
      },
    })) as RetailOrderWithRelations;

    return mapOrder(created);
  },
};
