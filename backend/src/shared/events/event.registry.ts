import { z } from 'zod';

/**
 * Zenvix Event Registry
 * Centralizes all event schemas and versions to ensure contract integrity.
 */

export const RetailSaleSchemaV1 = z.object({
  saleId: z.string(),
  tenant_id: z.string(),
  branch_id: z.string(),
  items: z.array(z.object({
    product_id: z.string(),
    quantity: z.number(),
    unit_price: z.number(),
  })),
  total_amount: z.number(),
  timestamp: z.string(),
});

export const StockMovementSchemaV1 = z.object({
  movementId: z.string(),
  tenant_id: z.string(),
  product_id: z.string(),
  location_id: z.string().optional(),
  type: z.enum(['intake', 'deduction', 'transfer_out', 'transfer_in', 'adjustment_plus', 'adjustment_minus']),
  quantity: z.number(),
  referenceId: z.string(),
  referenceType: z.string(),
  timestamp: z.string(),
});

export const WorkflowStepFailedSchemaV1 = z.object({
  originalEventType: z.string(),
  handlerName: z.string(),
  error: z.string(),
  correlation_id: z.string().optional(),
});

export const InventoryItemCreatedSchemaV1 = z.object({
  tenant_id: z.string(),
  sku: z.string(),
  barcode: z.string().optional(),
  name: z.string(),
  category: z.string(),
  unit: z.string().default('PCS'),
  timestamp: z.string(),
});

export const InventoryStockInitializedSchemaV1 = z.object({
  tenant_id: z.string(),
  sku: z.string(),
  location_id: z.string(),
  quantity: z.number(),
  unitCost: z.number().optional(),
  timestamp: z.string(),
});

export const LowStockAlertSchemaV1 = z.object({
  tenant_id: z.string(),
  product_id: z.string(),
  location_id: z.string(),
  currentLevel: z.number(),
  threshold: z.number(),
  timestamp: z.string(),
});

export const DeviceEventCreatedSchemaV1 = z.object({
  tenant_id: z.string(),
  device_id: z.string(),
  location_id: z.string(),
  type: z.enum(['SCAN_BARCODE', 'SCAN_RFID', 'SCAN_QR']),
  code: z.string(),
  timestamp: z.string(),
});

export const HREmployeeCreatedSchemaV1 = z.object({
  employee_id: z.string(),
  candidateId: z.string(),
  email: z.string(),
});

export const HRPayrollExecutedSchemaV1 = z.object({
  payrollRunId: z.string(),
  period: z.string(),
  totalGross: z.number(),
  totalNet: z.number(),
  processedCount: z.number(),
});

export const HRAttendanceLoggedSchemaV1 = z.object({
  employee_id: z.string(),
  location_id: z.string(),
  type: z.enum(['CLOCK_IN', 'CLOCK_OUT']),
  timestamp: z.string(),
});

export const HRInsightAnomalySchemaV1 = z.object({
  detail: z.string(),
  timestamp: z.string().optional(),
});

export const HREmployeeHiredSchemaV1 = z.object({
  candidateId: z.string(),
  employee_id: z.string(),
  positions: z.string().optional(),
  departmentId: z.string().optional(),
});

export const HREmployeePromotedSchemaV1 = z.object({
  employee_id: z.string(),
  newPosition: z.string(),
  newSalary: z.number().optional(),
});

export const HREmployeeTransferredSchemaV1 = z.object({
  employee_id: z.string(),
  targetDepartmentId: z.string().optional(),
  targetLocationId: z.string().optional(),
});

export const HREmployeeTerminatedSchemaV1 = z.object({
  employee_id: z.string(),
  reason: z.string().optional(),
  terminationDate: z.string().optional(),
});

export const HRPayrollCalculatedSchemaV1 = z.object({
  employee_id: z.string(),
  period: z.string(),
  total_amount: z.number(),
});

export const HRCandidateAppliedSchemaV1 = z.object({
  requisitionId: z.string(),
  source: z.string().optional(),
});

export const HRRequisitionCreatedSchemaV1 = z.object({
  title: z.string(),
  departmentId: z.string(),
});

export const HRRequisitionUpdatedSchemaV1 = z.any();

export const HRDepartmentCreatedSchemaV1 = z.object({
  name: z.string(),
});

export const HRCaseCreatedSchemaV1 = z.object({
  title: z.string(),
  type: z.string(),
});

export const HRContractCreatedSchemaV1 = z.object({
  employee_id: z.string(),
  type: z.string(),
});

export const HRPerformanceCycleCreatedSchemaV1 = z.object({
  name: z.string(),
});

export const EventRegistry: Record<string, Record<number, { schema: z.ZodObject<any>; status: string; deprecatedAt?: string; replacementVersion?: number }>> = {
  'RETAIL_SALE_COMPLETED': {
    1: { schema: RetailSaleSchemaV1, status: 'stable' },
  },
  'STOCK_MOVEMENT_CREATED': {
    1: { schema: StockMovementSchemaV1, status: 'stable' },
  },
  'WORKFLOW_STEP_FAILED': {
    1: { schema: WorkflowStepFailedSchemaV1, status: 'stable' },
  },
  'INVENTORY_ITEM_CREATED': {
    1: { schema: InventoryItemCreatedSchemaV1, status: 'stable' },
  },
  'INVENTORY_STOCK_INITIALIZED': {
    1: { schema: InventoryStockInitializedSchemaV1, status: 'stable' },
  },
  'LOW_STOCK_ALERT': {
    1: { schema: LowStockAlertSchemaV1, status: 'stable' },
  },
  'DEVICE_EVENT_CREATED': {
    1: { schema: DeviceEventCreatedSchemaV1, status: 'stable' },
  },
  'hr.employee.created.v1': {
    1: { schema: HREmployeeCreatedSchemaV1, status: 'stable' },
  },
  'hr.employee.hired.v1': {
    1: { schema: HREmployeeHiredSchemaV1, status: 'stable' },
  },
  'hr.employee.promoted.v1': {
    1: { schema: HREmployeePromotedSchemaV1, status: 'stable' },
  },
  'hr.employee.transferred.v1': {
    1: { schema: HREmployeeTransferredSchemaV1, status: 'stable' },
  },
  'hr.employee.terminated.v1': {
    1: { schema: HREmployeeTerminatedSchemaV1, status: 'stable' },
  },
  'hr.payroll.calculated.v1': {
    1: { schema: HRPayrollCalculatedSchemaV1, status: 'stable' },
  },
  'hr.payroll.executed.v1': {
    1: { schema: HRPayrollExecutedSchemaV1, status: 'stable' },
  },
  'hr.attendance.logged.v1': {
    1: { schema: HRAttendanceLoggedSchemaV1, status: 'stable' },
  },
  'hr.insight.anomaly.v1': {
    1: { schema: HRInsightAnomalySchemaV1, status: 'stable' },
  },
  'hr.requisition.created.v1': {
    1: { schema: HRRequisitionCreatedSchemaV1, status: 'stable' },
  },
  'hr.requisition.updated.v1': {
    1: { schema: HRRequisitionUpdatedSchemaV1 as any, status: 'stable' },
  },
  'hr.candidate.applied.v1': {
    1: { schema: HRCandidateAppliedSchemaV1, status: 'stable' },
  },
  'hr.candidate.converted.v1': {
    1: { schema: z.any() as any, status: 'stable' },
  },
  'hr.department.created.v1': {
    1: { schema: HRDepartmentCreatedSchemaV1, status: 'stable' },
  },
  'hr.case.created.v1': {
    1: { schema: HRCaseCreatedSchemaV1, status: 'stable' },
  },
  'hr.case.updated.v1': {
    1: { schema: z.any() as any, status: 'stable' },
  },
  'hr.contract.created.v1': {
    1: { schema: HRContractCreatedSchemaV1, status: 'stable' },
  },
  'hr.contract.updated.v1': {
    1: { schema: z.any() as any, status: 'stable' },
  },
  'hr.position.updated.v1': {
    1: { schema: z.any() as any, status: 'stable' },
  },
  'hr.performance.cycle.created.v1': {
    1: { schema: HRPerformanceCycleCreatedSchemaV1, status: 'stable' },
  },
  'hr.performance.cycle.updated.v1': {
    1: { schema: z.any() as any, status: 'stable' },
  },
};

export type RegisteredEventType = keyof typeof EventRegistry;

export function validateEventPayload(event_type: string, version: number, payload: any) {
  const eventEntry = EventRegistry[event_type];
  if (!eventEntry) {
    // If not registered, we allow it for now but log a warning (Phase 2 transitional)
    console.warn(`[EventRegistry] Event type ${event_type} is not registered. Validation skipped.`);
    return true;
  }

  const versionEntry = eventEntry[version];
  if (!versionEntry) {
    throw new Error(`[EventRegistry] Version ${version} for event ${event_type} not found.`);
  }

  if (versionEntry.status === 'deprecated') {
    console.warn(`[EventRegistry] Event ${event_type} v${version} is DEPRECATED since ${versionEntry.deprecatedAt}. Use v${versionEntry.replacementVersion} instead.`);
  }

  const result = versionEntry.schema.safeParse(payload);
  if (!result.success) {
    throw new Error(`[EventRegistry] Validation failed for ${event_type} v${version}: ${result.error.message}`);
  }

  return true;
}
