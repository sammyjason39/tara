import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../persistence/prisma.service';
import { createHash } from 'crypto';

type RetailEventActor = {
  id: string;
  type: string;
};

type RetailEventScope = {
  tenantId: string;
  branchId?: string;
  ecommerceId?: string;
};

export type RetailEvent = {
  type: string;
  actor: RetailEventActor;
  timestamp: string;
  payload?: Record<string, any>;
  scope?: RetailEventScope;
  audit?: { traceId?: string };
};

@Injectable()
export class RetailEventsService {
  constructor(private readonly prisma: PrismaService) {}

  async appendEvent(event: RetailEvent) {
    const auditEntry = await this.prisma.auditLog.create({
      data: {
        tenantId: event.scope?.tenantId ?? 'tenant-demo',
        module: 'retail',
        action: event.type,
        entityType: 'event',
        entityId: event.audit?.traceId ?? crypto.randomUUID(),
        userId: event.actor.id,
        changes: event.payload ?? {},
        metadata: {
          scope: event.scope,
          timestamp: event.timestamp,
          actorType: event.actor.type,
        } as any,
        createdAt: new Date(),
      },
    });

    return {
      key: `audit:retail:${auditEntry.id}`,
      count: 1,
    };
  }

  async processEvent(event: RetailEvent) {
    switch (event.type) {
      case 'payment_success': {
        return this.processPaymentSuccess(event);
      }
      case 'cart_add': {
        return { action: 'interest_logged', sku: event.payload?.sku };
      }
      case 'user_register': {
        return { action: 'customer_registration_received', customerId: event.actor.id };
      }
      default:
        return { action: 'event_recorded', type: event.type };
    }
  }

  private async processPaymentSuccess(event: RetailEvent) {
    const payload = event.payload ?? {};
    const tenantId = payload.tenantId ?? event.scope?.tenantId ?? 'tenant-demo';
    const orderId = payload.orderId ?? `ord_${Date.now()}`;
    const storeId = payload.storeId ?? event.scope?.branchId ?? 'store-001';

    const existing = await this.prisma.retailOrder.findFirst({
      where: { id: orderId, tenantId: tenantId },
    });
    if (existing) {
      return { action: 'ignored_duplicate', orderId };
    }

    const itemsPayload = Array.isArray(payload.items) ? payload.items : [];
    const fallbackProduct = await this.prisma.product.findFirst({
      where: { tenantId: tenantId },
      orderBy: { createdAt: 'asc' },
    });
    if (!fallbackProduct) {
      return { action: 'skipped', reason: 'no_products' };
    }

    const resolvedItems = await Promise.all(
      itemsPayload.map(async (item: any) => {
        const productId = await this.resolveProductId(
          tenantId,
          item,
          fallbackProduct.id,
        );
        const unitPrice =
          item.unitPrice ??
          item.unit_price ??
          Number(
            (
              await this.prisma.product.findUnique({ where: { id: productId } })
            )?.basePrice ?? 0,
          );
        const quantity = Number(item.quantity ?? 1);
        return {
          productId,
          quantity,
          unitPrice,
          totalPrice: Number(unitPrice) * quantity,
          discount: Number(item.discount ?? 0),
        };
      }),
    );

    const subtotal =
      payload.subtotal ??
      resolvedItems.reduce((sum, item) => sum + Number(item.totalPrice), 0);
    const tax = payload.tax ?? 0;
    const totalAmount = payload.totalAmount ?? subtotal + tax;

    await this.prisma.retailOrder.create({
      data: {
        id: orderId,
        tenantId: tenantId,
        storeId,
        deviceId: payload.deviceId ?? 'api-gateway',
        cashierId: payload.cashierId ?? event.actor.id,
        status: payload.status ?? 'paid',
        subtotal,
        tax,
        totalAmount,
        paymentMethod: payload.paymentMethod,
        paymentReference: payload.paymentReference,
        customerId: payload.customer?.id,
        items: {
          create: resolvedItems.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.totalPrice,
            discount: item.discount,
          })),
        },
      },
    });

    return { action: 'order_created', orderId };
  }

  private async resolveProductId(
    tenantId: string,
    item: any,
    fallbackProductId: string,
  ) {
    if (item.productId) return item.productId;
    if (item.itemId) return item.itemId;
    if (item.sku) {
      const product = await this.prisma.product.findFirst({
        where: { tenantId: tenantId, sku: item.sku },
      });
      if (product) return product.id;
    }
    return fallbackProductId;
  }
}
