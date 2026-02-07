// ============================================================
// CORE SERVICES
// Headless, reusable business logic services
// ============================================================

export { registry } from "./registry";
export { staffService } from "./hr/staffService";
export { peopleService } from "./hr/peopleService";
export { orgService } from "./hr/orgService";
export { documentService } from "./hr/documentService";
export { hrWorkstreamService } from "./hr/hrWorkstreamService";
export { workflowService } from "./hr/workflowService";
export { recruitmentService } from "./hr/recruitmentService";
export { trainingService } from "./hr/trainingService";
export { performanceService } from "./hr/performanceService";
export { payrollService } from "./hr/payrollService";
export { legalService } from "./hr/legalService";
export { analyticsService } from "./hr/analyticsService";
export { caseService } from "./hr/caseService";

/* ============================================================================ */
/* TYPE IMPORTS (SINGLE ENTRY POINT)                                             */
/* ============================================================================ */

import type {
  InventoryEntry,
  InventoryMovement,
  Transaction,
  Shift,
  Task,
  Notification,
  AuditEntry,
} from "../types";

/* ============================================================================ */
/* INVENTORY SERVICE                                                            */
/* ============================================================================ */

let movementIdCounter = 1;

export const inventoryService = {
  recordMovement(
    organizationId: string,
    siteId: string,
    productId: string,
    quantity: number,
    type: InventoryMovement["type"],
    reason: string,
    performedBy: string,
    reference?: { type: string; id: string },
  ): InventoryMovement {
    const movement: InventoryMovement = {
      id: `mov-${movementIdCounter++}`,
      organizationId,
      siteId,
      productId,
      type,
      quantity,
      reason,
      referenceType: reference?.type,
      referenceId: reference?.id,
      performedBy,
      timestamp: new Date().toISOString(),
    };

    return movement;
  },

  adjustStock(
    entry: InventoryEntry,
    delta: number,
    performedBy: string,
    reason: string,
  ): InventoryEntry {
    return {
      ...entry,
      quantity: entry.quantity + delta,
    };
  },

  reserveStock(entry: InventoryEntry, quantity: number): InventoryEntry {
    return {
      ...entry,
      reservedQuantity: (entry.reservedQuantity ?? 0) + quantity,
    };
  },

  releaseReservedStock(
    entry: InventoryEntry,
    quantity: number,
  ): InventoryEntry {
    return {
      ...entry,
      reservedQuantity: Math.max(0, (entry.reservedQuantity ?? 0) - quantity),
    };
  },
};

/* ============================================================================ */
/* FINANCIAL SERVICE                                                            */
/* ============================================================================ */

let transactionIdCounter = 1;

export const financialService = {
  recordTransaction(
    organizationId: string,
    siteId: string,
    moduleId: string,
    type: Transaction["type"],
    amount: number,
    paymentMethod: string,
    performedBy: string,
    reference: { type: string; id: string },
    metadata?: Record<string, unknown>,
  ): Transaction {
    return {
      id: `txn-${transactionIdCounter++}`,
      organizationId,
      siteId,
      moduleId,
      type,
      amount,
      currency: "USD",
      paymentMethod,
      status: "completed",
      referenceType: reference.type,
      referenceId: reference.id,
      performedBy,
      timestamp: new Date().toISOString(),
      metadata,
    };
  },
};

/* ============================================================================ */
/* SHIFT SERVICE                                                                */
/* ============================================================================ */

let shiftIdCounter = 1;
const activeShifts = new Map<string, Shift>();

export const shiftService = {
  startShift(
    organizationId: string,
    siteId: string,
    staffId: string,
    openingCash: number,
  ): Shift {
    const shift: Shift = {
      id: `shift-${shiftIdCounter++}`,
      organizationId,
      siteId,
      staffId,
      status: "open",
      startTime: new Date().toISOString(),
      openingCash,
      totalSales: 0,
      transactionCount: 0,
    };

    activeShifts.set(staffId, shift);
    return shift;
  },

  endShift(staffId: string, closingCash: number): Shift | null {
    const shift = activeShifts.get(staffId);
    if (!shift) return null;

    activeShifts.delete(staffId);
    return {
      ...shift,
      status: "closed",
      endTime: new Date().toISOString(),
      closingCash,
      expectedCash: shift.openingCash + shift.totalSales,
      variance: closingCash - (shift.openingCash + shift.totalSales),
    };
  },
};

/* ============================================================================ */
/* TASK SERVICE                                                                 */
/* ============================================================================ */

let taskIdCounter = 1;
const tasks: Task[] = [];

export const taskService = {
  createTask(organizationId: string, title: string, createdBy: string): Task {
    const task: Task = {
      id: `task-${taskIdCounter++}`,
      organizationId,
      title,
      priority: "medium",
      status: "pending",
      createdBy,
      createdAt: new Date().toISOString(),
    };

    tasks.push(task);
    return task;
  },
};

/* ============================================================================ */
/* NOTIFICATION SERVICE                                                         */
/* ============================================================================ */

let notificationIdCounter = 1;
const notifications: Notification[] = [];

export const notificationService = {
  send(
    organizationId: string,
    userId: string,
    type: Notification["type"],
    title: string,
    message: string,
  ): Notification {
    const notification: Notification = {
      id: `notif-${notificationIdCounter++}`,
      organizationId,
      userId,
      type,
      title,
      message,
      channel: "in_app",
      status: "sent",
      createdAt: new Date().toISOString(),
    };

    notifications.push(notification);
    return notification;
  },
};

/* ============================================================================ */
/* AUDIT SERVICE                                                                */
/* ============================================================================ */

let auditIdCounter = 1;
const auditLog: AuditEntry[] = [];

export const auditService = {
  log(
    organizationId: string,
    userId: string,
    action: string,
    resourceType: string,
    resourceId: string,
  ): AuditEntry {
    const entry: AuditEntry = {
      id: `audit-${auditIdCounter++}`,
      organizationId,
      userId,
      action,
      resourceType,
      resourceId,
      timestamp: new Date().toISOString(),
    };

    auditLog.push(entry);
    return entry;
  },
};
