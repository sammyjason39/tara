import { audit } from "@/core/logging/audit";
import { retailRepo } from "@/core/repositories/retail/retailRepo";
import { attendanceService } from "@/core/services/hr/attendanceService";
import { schedulingService } from "@/core/services/hr/schedulingService";
import { paymentService } from "@/core/services/payment/paymentService";
import { employeeRepo } from "@/core/repositories/hr/employeeRepo";
import type { RetailOrder, RetailStore } from "@/core/types/retail/retail";
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

    // Role Bypass: Superadmin ignore schedule/attendance
    if (actor.role === Roles.SUPERADMIN) {
      return true;
    }

    // C. Validate Shift Assignment (Schedule Engine)
    const today = new Date().toISOString().split("T")[0];
    const schedule = schedulingService.getDailySchedule(tenantId, employeeId, today);
    
    // In strict mode, we might verify schedule location matches store location
    // assuming store.locationId maps to schedule location
    if (!schedule) {
       // Allow access for specific roles (Owner, Superadmin) bypass?
       // For now, strict: No schedule = No access
       throw new Error("No active shift schedule found for today.");
    }
    
    // TODO: Validate schedule.locationId === store.locationId

    // D. Validate Clock-In (Attendance Engine)
    const attendance = attendanceService.getStats(tenantId); 
    // Optimization: getStats is aggregate. We need specific user status.
    // For now, let's trust the schedule primarily, but ideally we check if clocked in.
    // Implementation of checkIsClockedIn(user) needed in attendanceService
    
    return true;
  },

  listStores(tenantId: string) {
    return retailRepo.listStores(tenantId);
  },

  getStore(tenantId: string, storeId: string) {
    return retailRepo.getStore(tenantId, storeId);
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

  // --- 2. Order Processing ---
  createOrder(
    tenantId: string,
    session: SessionContext,
    storeId: string,
    deviceId: string,
    items: { itemId: string; quantity: number; unitPrice: number; name: string }[]
  ) {
    // 1. Enforce Access
    this.validateAccess(tenantId, session.userId, storeId, session);

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
    method: "card" | "cash" | "qr"
  ) {
     const orders = retailRepo.listOrders(tenantId);
     const order = orders.find(o => o.id === orderId);
     if (!order) throw new Error("Order not found");

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
  }
};
