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

// ADMIN
export { adminService } from "../services/adminService";

// PROCUREMENT
export { procurementService } from "./procurement/procurementService";

// IT
export { itService } from "./it/itService";
export { itSettingsService } from "./it/itSettingsService";

// FINANCE
export {
  financeService,
  financeService as financialService,
} from "./finance/financeService";

// RETAIL / SALES / INVENTORY
export { retailService } from "./retail/retailService";
export {
  salesService,
  salesService as taskService,
} from "./sales/salesService";
export { inventoryService } from "./inventory/inventoryService";

import { retailService } from "./retail/retailService";
import { apiRequest } from "../api/apiClient";
import type { SessionContext } from "../security/session";

/* ============================================================================ */
/* SHIFT SERVICE (API ADAPTER)                                                 */
/* ============================================================================ */

export const shiftService = {
  startShift: (
    tenantId: string,
    session: SessionContext,
    storeId: string,
    openingCash: number,
  ) => retailService.openShift(tenantId, session, storeId, openingCash),

  endShift: (
    tenantId: string,
    session: SessionContext,
    shiftId: string,
    closingCash: number,
    notes?: string,
  ) => retailService.closeShift(tenantId, session, shiftId, closingCash, notes),

  listShifts: (tenantId: string, session: SessionContext, storeId?: string) =>
    retailService.listShifts(tenantId, session, storeId),
};

/* ============================================================================ */
/* NOTIFICATION SERVICE (API ADAPTER)                                          */
/* ============================================================================ */

export const notificationService = {
  send: (tenantId: string, session: SessionContext, payload: any) =>
    apiRequest("/v1/notifications", "POST", session, payload),

  list: (tenantId: string, session: SessionContext) =>
    apiRequest("/v1/notifications", "GET", session),
};

/* ============================================================================ */
/* AUDIT SERVICE (API ADAPTER)                                                 */
/* ============================================================================ */

export const auditService = {
  log: (tenantId: string, session: SessionContext, payload: any) =>
    apiRequest("/v1/audit/log", "POST", session, payload),
};

