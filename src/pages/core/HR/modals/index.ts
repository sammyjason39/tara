/**
 * HR Module Modal Forms
 *
 * All modal forms use:
 * - ModuleModal (shared generic modal with react-hook-form + Zod)
 * - useModuleMutation (TanStack Query mutation with cache invalidation)
 * - Zod schemas for client-side validation with field-level error display
 */

export { CreateEmployeeModal } from "./CreateEmployeeModal";
export { UpdateEmployeeModal } from "./UpdateEmployeeModal";
export { CreateDepartmentModal } from "./CreateDepartmentModal";
export { CreateLeaveRequestModal } from "./CreateLeaveRequestModal";
export { CreateAttendanceModal } from "./CreateAttendanceModal";
export { CreatePayrollRunModal } from "./CreatePayrollRunModal";
export { PayrollAdjustmentModal } from "./PayrollAdjustmentModal";
export { TransferEmployeeModal } from "./TransferEmployeeModal";
export { PromoteEmployeeModal } from "./PromoteEmployeeModal";
export { SuspendEmployeeModal } from "./SuspendEmployeeModal";
export { TerminateEmployeeModal } from "./TerminateEmployeeModal";
export { AssignTrainingModal } from "./AssignTrainingModal";
export { CreateWorkflowRequestModal } from "./CreateWorkflowRequestModal";
export { CreateRequisitionModal } from "./CreateRequisitionModal";
export { CreateCaseModal } from "./CreateCaseModal";
export { CreateContractModal } from "./CreateContractModal";
export { PerformanceReviewModal } from "./PerformanceReviewModal";
