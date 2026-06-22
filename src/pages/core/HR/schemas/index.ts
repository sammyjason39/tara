/**
 * Zod schemas for all HR domain entities.
 *
 * Provides client-side validation for:
 * - Employees (create/update)
 * - Departments (create/update)
 * - Leave Requests (create)
 * - Attendance (create/update)
 * - Payroll (create run)
 * - Training Assignment
 * - Performance Review
 * - Contracts
 * - Workflow Requests
 */

import { z } from "zod";

// ---------------------------------------------------------------------------
// Employee Schemas
// ---------------------------------------------------------------------------

export const createEmployeeSchema = z.object({
  firstName: z.string().min(1, "First name is required").max(100),
  lastName: z.string().min(1, "Last name is required").max(100),
  email: z.string().min(1, "Email is required").email("Invalid email format"),
  phone: z.string().optional().default(""),
  departmentId: z.string().min(1, "Department is required"),
  locationId: z.string().optional().default(""),
  roleTitle: z.string().min(1, "Role title is required").max(100),
  status: z.enum(["active", "probation", "candidate", "suspended", "terminated"]).default("active"),
  employmentType: z.enum(["full_time", "part_time", "contract", "intern"]).default("full_time"),
  baseSalary: z.coerce.number().min(0, "Salary must be non-negative").default(0),
  hireDate: z.string().min(1, "Hire date is required"),
});

export type CreateEmployeeInput = z.infer<typeof createEmployeeSchema>;

export const updateEmployeeSchema = z.object({
  firstName: z.string().min(1, "First name is required").max(100),
  lastName: z.string().min(1, "Last name is required").max(100),
  email: z.string().email("Invalid email format").optional(),
  phone: z.string().optional().default(""),
  departmentId: z.string().min(1, "Department is required"),
  locationId: z.string().optional().default(""),
  roleTitle: z.string().min(1, "Role title is required").max(100),
  status: z.enum(["active", "probation", "candidate", "suspended", "terminated"]).default("active"),
  employmentType: z.enum(["full_time", "part_time", "contract", "intern"]).default("full_time"),
  baseSalary: z.coerce.number().min(0, "Salary must be non-negative").default(0),
});

export type UpdateEmployeeInput = z.infer<typeof updateEmployeeSchema>;

// ---------------------------------------------------------------------------
// Department Schemas
// ---------------------------------------------------------------------------

export const createDepartmentSchema = z.object({
  name: z.string().min(1, "Department name is required").max(100),
  code: z.string().min(1, "Code is required").max(20),
  description: z.string().optional().default(""),
  parentId: z.string().optional().default(""),
  headId: z.string().optional().default(""),
  status: z.enum(["active", "inactive"]).default("active"),
});

export type CreateDepartmentInput = z.infer<typeof createDepartmentSchema>;

export const updateDepartmentSchema = z.object({
  name: z.string().min(1, "Department name is required").max(100),
  code: z.string().min(1, "Code is required").max(20),
  description: z.string().optional().default(""),
  parentId: z.string().optional().default(""),
  headId: z.string().optional().default(""),
  status: z.enum(["active", "inactive"]).default("active"),
});

export type UpdateDepartmentInput = z.infer<typeof updateDepartmentSchema>;

// ---------------------------------------------------------------------------
// Leave Request Schemas
// ---------------------------------------------------------------------------

export const createLeaveRequestSchema = z.object({
  employeeId: z.string().min(1, "Employee is required"),
  type: z.enum(["annual", "sick", "personal", "maternity", "paternity", "unpaid"], {
    required_error: "Leave type is required",
  }),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
  reason: z.string().min(1, "Reason is required").max(500),
}).refine(
  (data) => {
    if (!data.startDate || !data.endDate) return true;
    return new Date(data.endDate) >= new Date(data.startDate);
  },
  { message: "End date must be on or after start date", path: ["endDate"] }
);

export type CreateLeaveRequestInput = z.infer<typeof createLeaveRequestSchema>;

// ---------------------------------------------------------------------------
// Attendance Schemas
// ---------------------------------------------------------------------------

export const createAttendanceSchema = z.object({
  employeeId: z.string().min(1, "Employee is required"),
  date: z.string().min(1, "Date is required"),
  checkIn: z.string().min(1, "Check-in time is required"),
  checkOut: z.string().optional().default(""),
  status: z.enum(["present", "absent", "late", "half_day", "on_leave"]).default("present"),
  notes: z.string().optional().default(""),
});

export type CreateAttendanceInput = z.infer<typeof createAttendanceSchema>;

export const updateAttendanceSchema = z.object({
  checkIn: z.string().min(1, "Check-in time is required"),
  checkOut: z.string().optional().default(""),
  status: z.enum(["present", "absent", "late", "half_day", "on_leave"]).default("present"),
  notes: z.string().optional().default(""),
});

export type UpdateAttendanceInput = z.infer<typeof updateAttendanceSchema>;

// ---------------------------------------------------------------------------
// Payroll Schemas
// ---------------------------------------------------------------------------

export const createPayrollRunSchema = z.object({
  periodStart: z.string().min(1, "Period start is required"),
  periodEnd: z.string().min(1, "Period end is required"),
  notes: z.string().optional().default(""),
}).refine(
  (data) => {
    if (!data.periodStart || !data.periodEnd) return true;
    return new Date(data.periodEnd) >= new Date(data.periodStart);
  },
  { message: "Period end must be on or after period start", path: ["periodEnd"] }
);

export type CreatePayrollRunInput = z.infer<typeof createPayrollRunSchema>;

export const payrollAdjustmentSchema = z.object({
  employeeId: z.string().min(1, "Employee is required"),
  period: z.string().min(1, "Period is required"),
  baseSalary: z.coerce.number().min(0, "Base salary must be non-negative"),
  allowances: z.coerce.number().min(0, "Allowances must be non-negative").default(0),
  deductions: z.coerce.number().min(0, "Deductions must be non-negative").default(0),
  notes: z.string().optional().default(""),
});

export type PayrollAdjustmentInput = z.infer<typeof payrollAdjustmentSchema>;

// ---------------------------------------------------------------------------
// Training Assignment Schema
// ---------------------------------------------------------------------------

export const assignTrainingSchema = z.object({
  employeeId: z.string().min(1, "Employee is required"),
  programId: z.string().min(1, "Training program is required"),
  notes: z.string().optional().default(""),
});

export type AssignTrainingInput = z.infer<typeof assignTrainingSchema>;

// ---------------------------------------------------------------------------
// Performance Review Schema
// ---------------------------------------------------------------------------

export const createPerformanceReviewSchema = z.object({
  employeeId: z.string().min(1, "Employee is required"),
  cycleId: z.string().min(1, "Review cycle is required"),
  score: z.coerce.number().min(0).max(100).optional(),
  notes: z.string().optional().default(""),
});

export type CreatePerformanceReviewInput = z.infer<typeof createPerformanceReviewSchema>;

// ---------------------------------------------------------------------------
// Workflow Request Schema
// ---------------------------------------------------------------------------

export const createWorkflowRequestSchema = z.object({
  entityType: z.enum(["PERFORMANCE", "PAYROLL", "CONTRACT", "TRAINING", "PERSONNEL_ESCALATION"], {
    required_error: "Workflow type is required",
  }),
  entityId: z.string().min(1, "Entity ID is required"),
  destinationDept: z.string().min(1, "Destination department is required"),
  notes: z.string().optional().default(""),
});

export type CreateWorkflowRequestInput = z.infer<typeof createWorkflowRequestSchema>;

// ---------------------------------------------------------------------------
// Employee Action Schemas (Transfer, Promote, Suspend, Terminate)
// ---------------------------------------------------------------------------

export const transferEmployeeSchema = z.object({
  employeeId: z.string().min(1, "Employee is required"),
  targetDepartment: z.string().min(1, "Target department is required"),
  targetLocation: z.string().optional().default(""),
  reason: z.string().min(1, "Reason is required").max(500),
  effectiveDate: z.string().min(1, "Effective date is required"),
});

export type TransferEmployeeInput = z.infer<typeof transferEmployeeSchema>;

export const promoteEmployeeSchema = z.object({
  employeeId: z.string().min(1, "Employee is required"),
  newRole: z.string().min(1, "New role is required").max(100),
  newSalary: z.coerce.number().min(0, "Salary must be non-negative"),
  reason: z.string().min(1, "Reason is required").max(500),
  effectiveDate: z.string().min(1, "Effective date is required"),
});

export type PromoteEmployeeInput = z.infer<typeof promoteEmployeeSchema>;

export const suspendEmployeeSchema = z.object({
  employeeId: z.string().min(1, "Employee is required"),
  reason: z.string().min(1, "Reason is required").max(500),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().optional().default(""),
});

export type SuspendEmployeeInput = z.infer<typeof suspendEmployeeSchema>;

export const terminateEmployeeSchema = z.object({
  employeeId: z.string().min(1, "Employee is required"),
  reason: z.string().min(1, "Reason is required").max(500),
  effectiveDate: z.string().min(1, "Effective date is required"),
  finalSettlement: z.coerce.number().min(0).optional().default(0),
});

export type TerminateEmployeeInput = z.infer<typeof terminateEmployeeSchema>;

// ---------------------------------------------------------------------------
// Requisition Schema
// ---------------------------------------------------------------------------

export const createRequisitionSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  departmentId: z.string().min(1, "Department is required"),
  openings: z.coerce.number().min(1, "Must have at least 1 opening").max(100).default(1),
  description: z.string().optional().default(""),
  priority: z.enum(["low", "medium", "high", "critical"]).default("medium"),
});

export type CreateRequisitionInput = z.infer<typeof createRequisitionSchema>;

// ---------------------------------------------------------------------------
// Cases/Grievance Schema
// ---------------------------------------------------------------------------

export const createCaseSchema = z.object({
  employeeId: z.string().min(1, "Employee is required"),
  title: z.string().min(1, "Title is required").max(200),
  category: z.enum(["grievance", "disciplinary", "complaint", "inquiry"], {
    required_error: "Category is required",
  }),
  description: z.string().min(1, "Description is required").max(2000),
  priority: z.enum(["low", "medium", "high", "critical"]).default("medium"),
});

export type CreateCaseInput = z.infer<typeof createCaseSchema>;

// ---------------------------------------------------------------------------
// Contract Schema
// ---------------------------------------------------------------------------

export const createContractSchema = z.object({
  employeeId: z.string().min(1, "Employee is required"),
  title: z.string().min(1, "Contract title is required").max(200),
  type: z.enum(["permanent", "fixed_term", "probation", "freelance"], {
    required_error: "Contract type is required",
  }),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().optional().default(""),
  salary: z.coerce.number().min(0, "Salary must be non-negative"),
  notes: z.string().optional().default(""),
});

export type CreateContractInput = z.infer<typeof createContractSchema>;
