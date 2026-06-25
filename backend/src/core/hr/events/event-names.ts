/**
 * HR Domain Event Names
 * Phase 2 — Event Model
 * 
 * Standardized constants for events emitted across the HR domain.
 * These are processed by the Global Event Bus.
 */

export const EVENT_NAMES = {
  // Employee Lifecycle Events
  EMPLOYEE_CREATED: 'hr.employee.created.v1',
  EMPLOYEE_HIRED: 'hr.employee.hired.v1',
  EMPLOYEE_PROMOTED: 'hr.employee.promoted.v1',
  EMPLOYEE_TRANSFERRED: 'hr.employee.transferred.v1',
  EMPLOYEE_SUSPENDED: 'hr.employee.suspended.v1',
  EMPLOYEE_TERMINATED: 'hr.employee.terminated.v1',

  // Org Events
  DEPARTMENT_CREATED: 'hr.department.created.v1',
  DEPARTMENT_UPDATED: 'hr.department.updated.v1',
  POSITION_CREATED: 'hr.position.created.v1',
  POSITION_UPDATED: 'hr.position.updated.v1',

  // Recruitment Events
  CANDIDATE_APPLIED: 'hr.candidate.applied.v1',
  CANDIDATE_CONVERTED: 'hr.candidate.converted.v1',
  INTERVIEW_SCHEDULED: 'hr.interview.scheduled.v1',
  REQUISITION_CREATED: 'hr.requisition.created.v1',
  REQUISITION_UPDATED: 'hr.requisition.updated.v1',

  // Case & Contract Events
  CASE_CREATED: 'hr.case.created.v1',
  CASE_UPDATED: 'hr.case.updated.v1',
  CONTRACT_CREATED: 'hr.contract.created.v1',
  CONTRACT_UPDATED: 'hr.contract.updated.v1',

  // Performance Events
  PERFORMANCE_CYCLE_CREATED: 'hr.performance.cycle.created.v1',
  PERFORMANCE_CYCLE_UPDATED: 'hr.performance.cycle.updated.v1',
  PERFORMANCE_REVIEW_SUBMITTED: 'hr.performance.review.submitted.v1',

  // Payroll Events
  PAYROLL_CALCULATED: 'hr.payroll.calculated.v1',
  PAYROLL_EXECUTED: 'hr.payroll.executed.v1',
  PAYSLIP_GENERATED: 'hr.payslip.generated.v1',

  // Compliance Events
  COMPLIANCE_REPORT_GENERATED: 'hr.compliance.report.generated.v1',
  COMPLIANCE_MODULE_ENABLED: 'hr.compliance.module.enabled.v1',

  // Time & Attendance Events
  LEAVE_REQUESTED: 'hr.leave.requested.v1',
  LEAVE_APPROVED: 'hr.leave.approved.v1',
  LEAVE_REJECTED: 'hr.leave.rejected.v1',
  CLOCK_IN: 'hr.clock.in.v1',
  CLOCK_IN_UNSCHEDULED: 'hr.clock.in.unscheduled.v1',
  CLOCK_IN_LATE: 'hr.clock.in.late.v1',
  CLOCK_OUT: 'hr.clock.out.v1',
  SHIFT_ASSIGNED: 'hr.shift.assigned.v1',
  SCHEDULE_CREATED: 'hr.schedule.created.v1',
  SCHEDULE_APPROVED: 'hr.schedule.approved.v1',

  // External (Finance) Events
  FINANCE_PAYROLL_PROCESSED: 'finance.payroll.processed.v1',
  FINANCE_EXPENSE_RECORDED: 'finance.expense.recorded.v1',

  // WhatsApp Events
  WHATSAPP_MESSAGE_INBOUND: 'whatsapp.message.inbound',
  WHATSAPP_MESSAGE_OUTBOUND: 'whatsapp.message.outbound',
  WHATSAPP_DELIVERY_FAILED: 'whatsapp.delivery.failed',
  WHATSAPP_SESSION_STARTED: 'whatsapp.session.started',
  WHATSAPP_SESSION_CLOSED: 'whatsapp.session.closed',
  WHATSAPP_VERIFICATION_SENT: 'whatsapp.verification.sent',
  WHATSAPP_VERIFICATION_CONFIRMED: 'whatsapp.verification.confirmed',
  WHATSAPP_OPTED_OUT: 'whatsapp.opted_out',
} as const;

export type EventName = typeof EVENT_NAMES[keyof typeof EVENT_NAMES];
