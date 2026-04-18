import { BaseCommand } from '../../../shared/command-bus/base-command.interface';

/**
 * HR Command Classes
 * Phase 1 — CommandBus Infrastructure & Architecture Extension
 *
 * All commands implement BaseCommand.
 * CommandName = <Verb><Entity>Command
 */

// ──────────────────────────────────────────────
// EMPLOYEE LIFECYCLE COMMANDS
// ──────────────────────────────────────────────

export interface HireEmployeePayload {
  location_id: string;
  candidateId: string;
  department_id: string;
  position: string;
  start_date: Date;
  salary: number;
  currency?: string;
}

export class HireEmployeeCommand implements BaseCommand {
  readonly name = 'HireEmployeeCommand';
  constructor(
    public readonly commandId: string,
    public readonly tenant_id: string,
    public readonly actor_id: string,
    public readonly timestamp: Date,
    public readonly payload: HireEmployeePayload,
  ) {}
}

export interface PromoteEmployeePayload {
  employee_id: string;
  newPosition: string;
  newSalary: number;
  effectiveDate: Date;
  approved_by?: string;
}

export class PromoteEmployeeCommand implements BaseCommand {
  readonly name = 'PromoteEmployeeCommand';
  constructor(
    public readonly commandId: string,
    public readonly tenant_id: string,
    public readonly actor_id: string,
    public readonly timestamp: Date,
    public readonly payload: PromoteEmployeePayload,
  ) {}
}

export interface TransferEmployeePayload {
  employee_id: string;
  targetDepartmentId: string;
  targetLocationId: string;
  effectiveDate: Date;
  reason?: string;
}

export class TransferEmployeeCommand implements BaseCommand {
  readonly name = 'TransferEmployeeCommand';
  constructor(
    public readonly commandId: string,
    public readonly tenant_id: string,
    public readonly actor_id: string,
    public readonly timestamp: Date,
    public readonly payload: TransferEmployeePayload,
  ) {}
}

export interface TerminateEmployeePayload {
  employee_id: string;
  reason: string;
  termination_date: Date;
  finalizePayroll?: boolean;
}

export class TerminateEmployeeCommand implements BaseCommand {
  readonly name = 'TerminateEmployeeCommand';
  constructor(
    public readonly commandId: string,
    public readonly tenant_id: string,
    public readonly actor_id: string,
    public readonly timestamp: Date,
    public readonly payload: TerminateEmployeePayload,
  ) {}
}

export interface SuspendEmployeePayload {
  employee_id: string;
  reason: string;
  suspensionDate: Date;
  expectedReturnDate?: Date;
}

export class SuspendEmployeeCommand implements BaseCommand {
  readonly name = 'SuspendEmployeeCommand';
  constructor(
    public readonly commandId: string,
    public readonly tenant_id: string,
    public readonly actor_id: string,
    public readonly timestamp: Date,
    public readonly payload: SuspendEmployeePayload,
  ) {}
}

// ──────────────────────────────────────────────
// RECRUITMENT COMMANDS
// ──────────────────────────────────────────────

export interface CreateJobOpeningPayload {
  title: string;
  department_id: string;
  location_id: string;
  openings: number;
  requirements: string[];
  description?: string;
}

export class CreateJobOpeningCommand implements BaseCommand {
  readonly name = 'CreateJobOpeningCommand';
  constructor(
    public readonly commandId: string,
    public readonly tenant_id: string,
    public readonly actor_id: string,
    public readonly timestamp: Date,
    public readonly payload: CreateJobOpeningPayload,
  ) {}
}

export interface ConvertLeadToCandidatePayload {
  lead_id: string;
  jobOpeningId: string;
}

export class ConvertLeadToCandidateCommand implements BaseCommand {
  readonly name = 'ConvertLeadToCandidateCommand';
  constructor(
    public readonly commandId: string,
    public readonly tenant_id: string,
    public readonly actor_id: string,
    public readonly timestamp: Date,
    public readonly payload: ConvertLeadToCandidatePayload,
  ) {}
}

export interface ScheduleInterviewPayload {
  candidateId: string;
  interviewerIds: string[];
  scheduledAt: Date;
  durationMinutes: number;
}

export class ScheduleInterviewCommand implements BaseCommand {
  readonly name = 'ScheduleInterviewCommand';
  constructor(
    public readonly commandId: string,
    public readonly tenant_id: string,
    public readonly actor_id: string,
    public readonly timestamp: Date,
    public readonly payload: ScheduleInterviewPayload,
  ) {}
}

// ──────────────────────────────────────────────
// PAYROLL COMMANDS
// ──────────────────────────────────────────────

export interface ExecutePayrollPayload {
  location_id: string;
  period_start: Date;
  period_end: Date;
  currency?: string;
}

export class ExecutePayrollCommand implements BaseCommand {
  readonly name = 'ExecutePayrollCommand';
  constructor(
    public readonly commandId: string,
    public readonly tenant_id: string,
    public readonly actor_id: string,
    public readonly timestamp: Date,
    public readonly payload: ExecutePayrollPayload,
  ) {}
}

export interface AdjustCompensationPayload {
  employee_id: string;
  newSalary: number;
  effectiveDate: Date;
  reason?: string;
}

export class AdjustCompensationCommand implements BaseCommand {
  readonly name = 'AdjustCompensationCommand';
  constructor(
    public readonly commandId: string,
    public readonly tenant_id: string,
    public readonly actor_id: string,
    public readonly timestamp: Date,
    public readonly payload: AdjustCompensationPayload,
  ) {}
}

export interface GeneratePayslipPayload {
  payrollRunId: string;
  employee_id: string;
}

export class GeneratePayslipCommand implements BaseCommand {
  readonly name = 'GeneratePayslipCommand';
  constructor(
    public readonly commandId: string,
    public readonly tenant_id: string,
    public readonly actor_id: string,
    public readonly timestamp: Date,
    public readonly payload: GeneratePayslipPayload,
  ) {}
}

// ──────────────────────────────────────────────
// COMPLIANCE COMMANDS
// ──────────────────────────────────────────────

export interface GenerateComplianceReportPayload {
  country: string;
  module: string;
  period: string;
  format: 'CSV' | 'EXCEL' | 'XML' | 'PDF';
}

export class GenerateComplianceReportCommand implements BaseCommand {
  readonly name = 'GenerateComplianceReportCommand';
  constructor(
    public readonly commandId: string,
    public readonly tenant_id: string,
    public readonly actor_id: string,
    public readonly timestamp: Date,
    public readonly payload: GenerateComplianceReportPayload,
  ) {}
}

export interface ExportGovernmentReportPayload {
  country: string;
  module: string;
  period: string;
  format: 'CSV' | 'EXCEL' | 'XML' | 'PDF';
}

export class ExportGovernmentReportCommand implements BaseCommand {
  readonly name = 'ExportGovernmentReportCommand';
  constructor(
    public readonly commandId: string,
    public readonly tenant_id: string,
    public readonly actor_id: string,
    public readonly timestamp: Date,
    public readonly payload: ExportGovernmentReportPayload,
  ) {}
}

export interface EnableComplianceModulePayload {
  country: string;
  module: string;
  config?: any;
}

export class EnableComplianceModuleCommand implements BaseCommand {
  readonly name = 'EnableComplianceModuleCommand';
  constructor(
    public readonly commandId: string,
    public readonly tenant_id: string,
    public readonly actor_id: string,
    public readonly timestamp: Date,
    public readonly payload: EnableComplianceModulePayload,
  ) {}
}

// ──────────────────────────────────────────────
// COMMAND NAME CONSTANTS
// ──────────────────────────────────────────────

export const HR_COMMAND_NAMES = {
  HIRE_EMPLOYEE: 'HireEmployeeCommand',
  PROMOTE_EMPLOYEE: 'PromoteEmployeeCommand',
  TRANSFER_EMPLOYEE: 'TransferEmployeeCommand',
  TERMINATE_EMPLOYEE: 'TerminateEmployeeCommand',
  SUSPEND_EMPLOYEE: 'SuspendEmployeeCommand',
  CREATE_JOB_OPENING: 'CreateJobOpeningCommand',
  CONVERT_LEAD_CANDIDATE: 'ConvertLeadToCandidateCommand',
  SCHEDULE_INTERVIEW: 'ScheduleInterviewCommand',
  EXECUTE_PAYROLL: 'ExecutePayrollCommand',
  ADJUST_COMPENSATION: 'AdjustCompensationCommand',
  GENERATE_PAYSLIP: 'GeneratePayslipCommand',
  GENERATE_COMPLIANCE_REPORT: 'GenerateComplianceReportCommand',
  EXPORT_GOVERNMENT_REPORT: 'ExportGovernmentReportCommand',
  ENABLE_COMPLIANCE_MODULE: 'EnableComplianceModuleCommand',
} as const;
