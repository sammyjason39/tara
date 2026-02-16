// src/core/engines/retail/eventProcessor.ts

import { RetailEvent } from "@/core/events/retailEvents";
import { retailRepo } from "@/core/repositories/retail/retailRepo";

/**
 * processRetailEvent
 *
 * This is the REAL Retail Event Engine.
 *
 * Ledger stores events.
 * Engine decides which events produce business objects:
 *
 * - payment_success → create Order
 * - user_register   → create Customer profile (next step)
 * - cart_add        → update trending scores (future)
 */
export function processRetailEvent(event: RetailEvent) {
  switch (event.type) {
    /**
     * PAYMENT SUCCESS → ORDER CREATION
     *
     * Requirement:
     * Ecommerce payment confirmation triggers Order creation in Zenvix.
     */
    case "payment_success": {
      const payload = event.payload;

      const orderId = payload.orderId ?? `ord-${Date.now()}`;

      const newOrder = {
        id: orderId,
        tenantId: payload.tenantId ?? "tenant-demo",
        storeId: payload.storeId ?? "store-001",

        status: "paid",

        totalAmount: payload.totalAmount ?? 0,
        items: payload.items ?? [],

        customer: payload.customer ?? null,

        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Idempotency check (Trial-level)
      const existing = retailRepo
        .listOrders(newOrder.tenantId)
        .find((o: any) => o.id === orderId);

      if (existing) {
        return {
          action: "ignored_duplicate",
          orderId,
        };
      }

      retailRepo.createOrder(newOrder.tenantId, newOrder as any);

      return {
        action: "order_created",
        orderId,
      };
    }

    /**
     * CART INTEREST EVENT
     */
    case "cart_add": {
      return {
        action: "interest_logged",
        sku: event.payload.sku,
      };
    }

    /**
     * USER REGISTER (Next milestone)
     */
    case "user_register": {
      return {
        action: "customer_registration_received",
        customerId: event.actor.id,
      };
    }

    /**
     * Default: Only audit log
     */
    default:
      return {
        action: "event_recorded",
        type: event.type,
      };
  }
}
