import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../persistence/prisma.service";
import { RetailService } from "./retail.service";

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
  constructor(
    private readonly prisma: PrismaService,
    private readonly retailService: RetailService,
  ) {}

  async appendEvent(event: RetailEvent) {
    const auditEntry = await this.prisma.auditLog.create({
      data: {
        id: "9rqvpdqj",
        tenantId: event.scope?.tenantId ?? "tenant-demo",
        module: "retail",
        action: event.type,
        entityType: "event",
        entityId: event.audit?.traceId ?? crypto.randomUUID(),
        userId: event.actor.id,
        changes: (event.payload as any) ?? {},
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
      case "payment_success": {
        return this.processPaymentSuccess(event);
      }
      case "cart_add": {
        return { action: "interest_logged", sku: event.payload?.sku };
      }
      case "user_register": {
        return {
          action: "customer_registration_received",
          customerId: event.actor.id,
        };
      }
      default:
        return { action: "event_recorded", type: event.type };
    }
  }

  private async processPaymentSuccess(event: RetailEvent) {
    const payload = event.payload ?? {};
    const tenantId = payload.tenantId ?? event.scope?.tenantId;

    if (!tenantId) {
      return { action: "skipped", reason: "missing_tenant_id" };
    }

    const orderId = payload.orderId;
    if (orderId) {
      const existing = await this.prisma.retailOrder.findFirst({
        where: { id: orderId, tenantId: tenantId },
      });
      if (existing) {
        return { action: "ignored_duplicate", orderId };
      }
    }

    // 1. Resolve Fulfillment Store
    const stores = await this.retailService.listStores(tenantId);
    const store =
      stores.find(
        (s) => s.id === payload.storeId || s.id === event.scope?.branchId,
      ) ?? stores[0];

    if (!store) {
      return { action: "skipped", reason: "no_stores_configured" };
    }

    // 2. Resolve Items
    const itemsPayload = Array.isArray(payload.items) ? payload.items : [];
    const { items: availableProducts } = await this.retailService.listProducts(
      tenantId,
      { page: 1, pageSize: 500 },
    );

    const resolvedItems = itemsPayload
      .map((item: any) => {
        const product = availableProducts.find(
          (p) =>
            p.sku === item.sku ||
            p.id === item.productId ||
            p.id === item.itemId,
        );
        if (!product) return null;

        return {
          productId: product.id,
          quantity: Number(item.quantity ?? 1),
          unitPrice: Number(
            item.unitPrice ?? item.unit_price ?? product.basePrice,
          ),
        };
      })
      .filter((i): i is NonNullable<typeof i> => i !== null);

    if (resolvedItems.length === 0) {
      return { action: "skipped", reason: "no_valid_items" };
    }

    const grandTotal = resolvedItems.reduce(
      (sum, item) => sum + item.unitPrice * item.quantity,
      0,
    );

    // 3. Create Order via Core Service (Triggers Stock Reservation & Auditing)
    const order = await this.retailService.createOrder(
      tenantId,
      store.locationId,
      {
        storeId: store.id,
        terminalId: payload.deviceId ?? "event-processor",
        customerId: payload.customer?.email ?? payload.customerId,
        items: resolvedItems,
        paymentMethod: (payload.paymentMethod as any) ?? "card",
        grandTotal: grandTotal,
      },
      event.actor.id,
    );

    // 4. Process Payment via Core Service (Triggers Stock Consumption & Finance Ledger)
    const taxAmount = await this.retailService.calculateTax(tenantId, order.id);
    await this.retailService.processPayment(
      tenantId,
      order.id,
      {
        amount: Number(order.grandTotal) + taxAmount,
        method: (payload.paymentMethod as any) ?? "card",
      },
      event.actor.id,
    );

    return { action: "order_synced", orderId: order.id, status: "completed" };
  }
}
