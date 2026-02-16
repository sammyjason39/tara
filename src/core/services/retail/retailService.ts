import { audit } from "@/core/logging/audit";
import { retailRepo } from "@/core/repositories/retail/retailRepo";
import { attendanceService } from "@/core/services/hr/attendanceService";
import { schedulingService } from "@/core/services/hr/schedulingService";
import { paymentService } from "@/core/services/payment/paymentService";
import { employeeRepo } from "@/core/repositories/hr/employeeRepo";
import type { RetailOrder, RetailStore, RetailPromotion, RetailChannel, RetailShift } from "@/core/types/retail/retail";
import type { SessionContext } from "@/core/security/session";
import { Roles } from "@/core/security/roles";
import { nextId } from "@/core/repositories/hr/storage";

export const retailService = {
  // --- 1. Access Control (The Gatekeeper) ---
  validateAccess(tenantId: string, employeeId: string, storeId: string, actor: SessionContext) {
    // A. Check License
    const license = retailRepo.getLicense(tenantId);
    if (license.status !== "active") {
      throw new Error(`Retail License is ${license.status}. Operations frozen.`);
    }

    // B. Validate Store
    const store = retailRepo.getStore(tenantId, storeId);
    if (!store || store.status !== "active") {
      throw new Error("Store is invalid or inactive.");
    }

    // Role Bypass: Superadmin & System ignore schedule/attendance
    if (actor.role === Roles.SUPERADMIN || actor.role === Roles.SYSTEM) {
      return true;
    }

    // C. Validate Shift Assignment (Schedule Engine)
    const today = new Date().toISOString().split("T")[0];
    const schedule = schedulingService.getDailySchedule(tenantId, employeeId, today);
    
    if (!schedule) {
       throw new Error("No active shift schedule found for today.");
    }
    
    return true;
  },

  /**
   * Hard Lock: Validates that the action is within the correct 
   * tenant + store + shift scope.
   */
  enforceScope(tenantId: string, session: SessionContext, storeId: string, shiftId?: string) {
    // 1. General Access Check (License + Schedule)
    this.validateAccess(tenantId, session.userId, storeId, session);

    // 2. Shift Lock (Operational Requirement)
    if (shiftId) {
      const shift = retailRepo.getShift(tenantId, shiftId);
      if (!shift || shift.status !== "open" || shift.employeeId !== session.userId) {
        throw new Error("Invalid or closed shift context. Operation denied.");
      }
      if (shift.storeId !== storeId) {
        throw new Error("Shift store mismatch. Data isolation breach prevented.");
      }
    } else {
      // For high-velocity operational pages, a shift is MANDATORY
      throw new Error("Operational context requires an active shift_id.");
    }
  },

  listStores(tenantId: string) {
    return retailRepo.listStores(tenantId);
  },

  getStore(tenantId: string, storeId: string) {
    return retailRepo.getStore(tenantId, storeId);
  },

  createStore(tenantId: string, session: SessionContext, store: RetailStore) {
    retailRepo.createStore(tenantId, store);
    audit.log({
      tenantId,
      actorId: session.userId,
      action: "retail.store_create",
      entityType: "retail_store",
      entityId: store.id,
      after: store as any
    });
  },

  updateStore(tenantId: string, session: SessionContext, store: RetailStore) {
    retailRepo.updateStore(tenantId, store);
    audit.log({
      tenantId,
      actorId: session.userId,
      action: "retail.store_update",
      entityType: "retail_store",
      entityId: store.id,
      after: store as any
    });
  },

  deleteStore(tenantId: string, session: SessionContext, storeId: string) {
    retailRepo.deleteStore(tenantId, storeId);
    audit.log({
      tenantId,
      actorId: session.userId,
      action: "retail.store_delete",
      entityType: "retail_store",
      entityId: storeId
    });
  },

  listOrders(tenantId: string, storeId?: string) {
    return retailRepo.listOrders(tenantId, storeId);
  },

  listDevices(tenantId: string, storeId?: string) {
    const devices = retailRepo.listDevices(tenantId);
    if (storeId) {
      return devices.filter(d => d.storeId === storeId);
    }
    return devices;
  },

  listInventory(tenantId: string) {
    // Current mock seeds are in retailRepo
    return retailRepo.listProducts(tenantId);
  },

  // --- 2. Order Processing ---
  createOrder(
    tenantId: string,
    session: SessionContext,
    storeId: string,
    deviceId: string,
    items: { itemId: string; quantity: number; unitPrice: number; name: string }[],
    shiftId?: string
  ) {
    // 1. Enforce Access & Scope
    this.enforceScope(tenantId, session, storeId, shiftId);

    // 2. Calculate Totals
    const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
    const tax = subtotal * 0.1; // Mock 10% tax
    const totalAmount = subtotal + tax;

    // 3. Create Order
    const order: RetailOrder = {
      id: nextId("ord"),
      tenantId,
      storeId,
      deviceId,
      cashierId: session.userId,
      status: "pending_payment",
      items: items.map(i => ({ ...i, totalPrice: i.quantity * i.unitPrice })),
      subtotal,
      tax,
      totalAmount,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    retailRepo.createOrder(tenantId, order);

    audit.log({
      tenantId,
      actorId: session.userId,
      action: "retail.order_create",
      entityType: "retail_order",
      entityId: order.id,
      after: { totalAmount, storeId }
    });

    return order;
  },

  processPayment(
    tenantId: string, 
    session: SessionContext,
    orderId: string,
    amount: number,
    method: "card" | "cash" | "qr",
    shiftId?: string
  ) {
     const orders = retailRepo.listOrders(tenantId);
     const order = orders.find(o => o.id === orderId);
     if (!order) throw new Error("Order not found");

     // 1. Enforce Scope & Shift
     this.enforceScope(tenantId, session, order.storeId, shiftId);

     // 2. Offline Payment Matrix Enforcement [HARD LOCK]
     const system = retailRepo.getSystemState(tenantId);
     if (system.isOffline) {
        if (method !== "cash") {
           throw new Error(`Offline mode: Settlement via ${method} is strictly prohibited.`);
        }
        // Cash/Voucher are local settlements, allowed offline
     }

     if (amount < order.totalAmount) {
        throw new Error("Insufficient payment amount");
     }

     // 1. Create Core Payment Execution Request
     const payReq = paymentService.createExecutionRequest(tenantId, session, {
        type: "POS_PAYMENT",
        amount: order.totalAmount,
        currency: "USD",
        destination: `Retail Store: ${order.storeId}`,
        source: "Retail POS",
        externalReference: order.id,
        channel: method === "card" ? "CARD_POS" : (method === "qr" ? "QR" : "BANK_TRANSFER")
     });

     // 2. Mock Full Lifecycle (Auto-process for POS)
     paymentService.approveRequest(tenantId, session, payReq.id);
     paymentService.selectProvider(tenantId, session, payReq.id);
     paymentService.executePayment(tenantId, session, payReq.id);
     paymentService.confirmSettlement(tenantId, session, payReq.id);
     
     // 3. Update Retail Order status
     order.status = "paid";
     order.paymentMethod = method;
     order.updatedAt = new Date().toISOString();
     
     retailRepo.updateOrder(tenantId, order); 

     audit.log({
        tenantId,
        actorId: session.userId,
        action: "retail.payment_process",
        entityType: "retail_order",
        entityId: order.id,
        after: { amount, method, status: order.status, paymentId: payReq.id }
     });

     return order;
  },

  // --- 3. Promotion & Campaign Management ---
  listPromotions(tenantId: string): RetailPromotion[] {
    return retailRepo.listPromotions(tenantId);
  },

  updatePromotion(tenantId: string, session: SessionContext, promotion: RetailPromotion) {
    retailRepo.updatePromotion(tenantId, promotion);
    audit.log({
      tenantId,
      actorId: session.userId,
      action: "retail.promotion_update",
      entityType: "retail_promotion",
      entityId: promotion.id,
      after: promotion as unknown as Record<string, unknown>
    });
  },

  // --- 4. Channel & Logic Nexus ---
  listChannels(tenantId: string): RetailChannel[] {
    return retailRepo.listChannels(tenantId);
  },

  syncChannel(tenantId: string, session: SessionContext, channelId: string) {
    const channel = retailRepo.getChannel(tenantId, channelId);
    if (!channel) throw new Error("Channel not found");
    
    channel.lastSync = new Date().toISOString();
    retailRepo.updateChannel(tenantId, channel);
    
    audit.log({
      tenantId,
      actorId: session.userId,
      action: "retail.channel_sync",
      entityType: "retail_channel",
      entityId: channelId
    });
  },

  createChannel(tenantId: string, session: SessionContext, channel: RetailChannel) {
    retailRepo.createChannel(tenantId, channel);
    audit.log({
      tenantId,
      actorId: session.userId,
      action: "retail.channel_create",
      entityType: "retail_channel",
      entityId: channel.id,
      after: channel as any
    });
  },

  deleteChannel(tenantId: string, session: SessionContext, channelId: string) {
    retailRepo.deleteChannel(tenantId, channelId);
    audit.log({
      tenantId,
      actorId: session.userId,
      action: "retail.channel_delete",
      entityType: "retail_channel",
      entityId: channelId
    });
  },

  // --- 5. Device & IoT Fleet ---
  pingDevice(tenantId: string, session: SessionContext, deviceId: string) {
    // Mock IoT ping
    audit.log({
      tenantId,
      actorId: session.userId,
      action: "retail.device_ping",
      entityType: "pos_device",
      entityId: deviceId
    });
    return true;
  },

  // --- 6. Shift & Fiscal Integrity ---
  openShift(tenantId: string, session: SessionContext, storeId: string, openingCash: number) {
    const shift: RetailShift = {
      id: nextId("shf"),
      tenantId,
      storeId,
      employeeId: session.userId,
      startTime: new Date().toISOString(),
      openingCash,
      status: "open",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    retailRepo.createShift(tenantId, shift);
    return shift;
  },

  closeShift(tenantId: string, session: SessionContext, shiftId: string, closingCash: number, notes?: string) {
    const shift = retailRepo.getShift(tenantId, shiftId);
    if (!shift) throw new Error("Shift not found");
    
    shift.endTime = new Date().toISOString();
    shift.closingCash = closingCash;
    shift.status = "closed";
    shift.notes = notes;
    shift.updatedAt = new Date().toISOString();
    
    retailRepo.updateShift(tenantId, shift);
    
    audit.log({
      tenantId,
      actorId: session.userId,
      action: "retail.shift_close",
      entityType: "retail_shift",
      entityId: shiftId,
      after: { closingCash, status: "closed" }
    });
    
    return shift;
  },

  listShifts(tenantId: string) {
    return retailRepo.listShifts(tenantId);
  },

  processReturn(tenantId: string, session: SessionContext, orderId: string, itemIds: string[], shiftId?: string) {
    const order = retailRepo.getOrder(tenantId, orderId);
    if (!order) throw new Error("Order not found");

    // 1. Enforce Scope
    this.enforceScope(tenantId, session, order.storeId, shiftId);

    // In a real app, logic for partial/full refund would happen here
    // For now, we log the intent
    audit.log({
      tenantId,
      actorId: session.userId,
      action: "retail.order_refund",
      entityType: "retail_order",
      entityId: orderId,
      before: order as unknown as Record<string, unknown>,
      after: { refundedItems: itemIds }
    });

    return { success: true, orderId, itemIds };
  },

  submitOpname(tenantId: string, session: SessionContext, storeId: string, adjustments: { sku: string; actualCount: number }[], shiftId?: string) {
    // 1. Enforce Scope
    this.enforceScope(tenantId, session, storeId, shiftId);

    // In a real app, logic to reconcile system vs actual stock
    // and create inventory adjustment documents would happen here
    audit.log({
      tenantId,
      actorId: session.userId,
      action: "retail.inventory_opname",
      entityType: "inventory_adjustment",
      entityId: nextId("adj"),
      after: { adjustments, storeId }
    });

    return { success: true, adjustments };
  },

  receiveGoods(tenantId: string, session: SessionContext, storeId: string, shipmentId: string, items: { itemId: string; received: number }[], shiftId?: string) {
    // 1. Enforce Scope
    this.enforceScope(tenantId, session, storeId, shiftId);

    // In a real app, logic to update stock, match with PO,
    // and create receiving audit records would happen here
    audit.log({
      tenantId,
      actorId: session.userId,
      action: "retail.inventory_receive",
      entityType: "shipment",
      entityId: shipmentId,
      after: { receivedItems: items, storeId }
    });

    return { success: true, shipmentId, items };
  }
};
