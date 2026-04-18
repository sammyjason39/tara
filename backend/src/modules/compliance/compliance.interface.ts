/**
 * Global Compliance Engine — Core Interfaces
 * Phase 2 — Step 2.2
 *
 * These interfaces define the contract for all country-specific compliance
 * rule engines and exporters used by the ComplianceEngineService.
 */

// ──────────────────────────────────────────────
// Line Item: per-employee calculation result
// ──────────────────────────────────────────────

export interface ComplianceLineItem {
  employee_id: string;
  employeeName: string;
  grossSalary: number;
  employeeContribution: number;
  employerContribution: number;
  tax_amount: number;
  netSalary: number;
  notes?: string;
}

// ──────────────────────────────────────────────
// Calculation Result: full report payload
// ──────────────────────────────────────────────

export interface ComplianceCalculationResult {
  country: string;
  module: string;
  period: string;        // YYYY-MM
  tenant_id: string;
  totalEmployees: number;
  totalDeductions: number;       // sum of employee contributions
  totalContributions: number;    // sum of employer contributions
  totalTax: number;
  lineItems: ComplianceLineItem[];
  ruleVersion: string;
  generatedAt: Date;
}

// ──────────────────────────────────────────────
// Rule Engine Interface
// ──────────────────────────────────────────────

export interface IComplianceRule {
  /** ISO country code: 'ID' | 'SG' | 'AE' */
  country: string;

  /** Semantic version of the rules, e.g. '2024.01' */
  version: string;

  /** Date from which this version of the rules is effective */
  effectiveDate: Date;

  /**
   * Core calculation method.
   * @param employees - Array of employee objects including compensation data
   * @param tenant_id  - The tenant identifier (for audit/tracing)
   * @param period    - The target period in 'YYYY-MM' format
   */
  calculate(
    employees: any[],
    tenant_id: string,
    period: string,
  ): ComplianceCalculationResult;
}

// ──────────────────────────────────────────────
// Exporter Interface
// ──────────────────────────────────────────────

export interface IComplianceExporter {
  /** Export as a comma-separated text string */
  exportCSV(data: ComplianceCalculationResult): string;

  /** Export as binary Excel buffer (stub in Phase 2, real in Phase 4+) */
  exportExcel(data: ComplianceCalculationResult): Buffer;

  /** Export as XML string (for government submission formats) */
  exportXML(data: ComplianceCalculationResult): string;

  /** Export as binary PDF buffer (stub) */
  exportPDF(data: ComplianceCalculationResult): Buffer;
}
