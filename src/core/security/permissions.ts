/**
 * ============================================================
 * PermissionKey
 *
 * Global permission contract across all modules.
 *
 * Rules:
 * - Permissions are namespaced: finance.*, hr.*, core.*
 * - Workspace entry is always: *.workspace.access
 * - Execution rights are separated from view rights
 * - Enterprise finance requires accounting + treasury + payments
 * ============================================================
 */

export type PermissionKey =
  /**
   * ============================================================
   * CORE HR (Shared HR Kernel)
   * ============================================================
   */
  | "core.hr.access"
  | "core.hr.payroll.view"
  | "core.hr.legal.manage"

  /**
   * ============================================================
   * CORE TOOLS (Universal Office Tools)
   * Everyone inside tenant can access these.
   * ============================================================
   */
  | "core.tools.access"

  /**
   * ============================================================
   * HR WORKSPACE
   * ============================================================
   */
  | "hr.workspace.access"
  | "hr.directory.view"
  | "hr.staff.view"
  | "hr.staff.manage"
  | "hr.attendance.view"
  | "hr.leave.manage"
  | "hr.recruitment.manage"
  | "hr.training.manage"
  | "hr.performance.view"
  | "hr.payroll.view"
  | "hr.payroll.prepare"
  | "hr.payroll.approve"
  | "hr.legal.view"
  | "hr.legal.manage"

  /**
   * ============================================================
   * FINANCE WORKSPACE (Enterprise Finance OS)
   * Covers:
   * - Accounting Ledger + Journals
   * - Payables / Receivables
   * - Treasury / Cash Desk / Wallets
   * - Payments Execution
   * - Closing + Audit
   * ============================================================
   */

  /** Workspace Gate */
  | "finance.workspace.access"

  /** Accounting Core */
  | "finance.coa.view"
  | "finance.coa.manage"
  | "finance.ledger.view"
  | "finance.journal.post"
  | "finance.journal.adjust"

  /** Payables (AP) */
  | "finance.payables.view"
  | "finance.payables.manage"
  | "finance.payables.approve"

  /** Receivables (AR) */
  | "finance.receivables.view"
  | "finance.receivables.manage"
  | "finance.receivables.collect"

  /** Treasury + Cash Control */
  | "finance.treasury.view"
  | "finance.treasury.manage"
  | "finance.cashdesk.open"
  | "finance.cashdesk.close"
  | "finance.cashdesk.audit"

  /** Payments Engine */
  | "finance.payments.view"
  | "finance.payments.execute"
  | "finance.payments.refund"

  /** Payroll Execution (Finance Side) */
  | "finance.payroll.execute"

  /** Financial Reporting */
  | "finance.reports.view"
  | "finance.reports.publish"

  /** Closing + Compliance */
  | "finance.closing.run"
  | "finance.audit.view"

  /**
   * ============================================================
   * SYSTEM + PLATFORM
   * ============================================================
   */
  | "system.admin.manage"
  | "superadmin.tenants.view";

/**
 * ============================================================
 * HR Permissions Bundle
 * ============================================================
 */
export const HR_PERMISSIONS: PermissionKey[] = [
  "core.hr.access",
  "core.hr.payroll.view",
  "core.hr.legal.manage",

  "hr.workspace.access",
  "hr.directory.view",

  "hr.staff.view",
  "hr.staff.manage",

  "hr.attendance.view",
  "hr.leave.manage",

  "hr.recruitment.manage",
  "hr.training.manage",

  "hr.performance.view",

  "hr.payroll.view",
  "hr.payroll.prepare",
  "hr.payroll.approve",

  "hr.legal.view",
  "hr.legal.manage",
];

/**
 * ============================================================
 * Finance Permissions Bundle
 *
 * Full Finance OS operational contract.
 * ============================================================
 */
export const FINANCE_PERMISSIONS: PermissionKey[] = [
  "finance.workspace.access",

  /** Accounting */
  "finance.coa.view",
  "finance.coa.manage",

  "finance.ledger.view",
  "finance.journal.post",
  "finance.journal.adjust",

  /** Payables */
  "finance.payables.view",
  "finance.payables.manage",
  "finance.payables.approve",

  /** Receivables */
  "finance.receivables.view",
  "finance.receivables.manage",
  "finance.receivables.collect",

  /** Treasury */
  "finance.treasury.view",
  "finance.treasury.manage",

  /** Cash Desk */
  "finance.cashdesk.open",
  "finance.cashdesk.close",
  "finance.cashdesk.audit",

  /** Payments */
  "finance.payments.view",
  "finance.payments.execute",
  "finance.payments.refund",

  /** Payroll Execution */
  "finance.payroll.execute",

  /** Reporting */
  "finance.reports.view",
  "finance.reports.publish",

  /** Closing + Audit */
  "finance.closing.run",
  "finance.audit.view",
];
