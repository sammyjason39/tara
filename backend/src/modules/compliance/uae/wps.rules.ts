import {
  IComplianceRule,
  ComplianceCalculationResult,
  ComplianceLineItem,
} from '../compliance.interface';

/**
 * UAE WPS (Wage Protection System) Rules
 *
 * WPS is a salary disbursement monitoring system mandated by the UAE MOHRE
 * (Ministry of Human Resources and Emiratisation). It does NOT impose
 * deductions or contributions — it validates salary transfer compliance.
 *
 * Key requirements:
 *  - Salaries must be transferred within 10 days of due date (typically month-end)
 *  - Transfers must go through a WPS-accredited bank or exchange house
 *  - A Salary Information File (SIF) must be submitted before each transfer
 *
 * SIF Format: CSV with fixed column order defined by CBUAE/MOHRE spec
 *
 * Reference: UAE Cabinet Resolution No. 46/2022
 */
export class WpsRules implements IComplianceRule {
  country = 'AE';
  version = '2024.01';
  effectiveDate = new Date('2024-01-01');

  /** Max days allowed between period end and salary transfer */
  private readonly MAX_TRANSFER_DAYS = 10;

  calculate(
    employees: any[],
    tenant_id: string,
    period: string,
  ): ComplianceCalculationResult {
    // WPS does not calculate deductions — it validates that salary is due to be paid.
    // This engine generates the Salary Information File (SIF) data.

    const [year, month] = period.split('-').map(Number);
    const periodEndDate = new Date(year, month, 0); // last day of the month
    const transferDeadline = new Date(periodEndDate);
    transferDeadline.setDate(transferDeadline.getDate() + this.MAX_TRANSFER_DAYS);

    const lineItems: ComplianceLineItem[] = employees.map((emp) => {
      const grossSalary = Number(emp.compensation?.baseSalary || emp.baseSalary || 0);

      return {
        employee_id: emp.id,
        employeeName: `${emp.first_name} ${emp.last_name}`.trim(),
        grossSalary,
        employeeContribution: 0, // WPS: no deduction
        employerContribution: 0, // WPS: no employer contribution
        tax_amount: 0,            // UAE: no income tax
        netSalary: grossSalary,  // Full salary disbursed
        notes: `WPS Transfer Deadline: ${transferDeadline.toISOString().substring(0, 10)}`,
      };
    });

    const totalPayroll = lineItems.reduce((s, i) => s + i.grossSalary, 0);

    return {
      country: 'AE',
      module: 'WPS',
      period,
      tenant_id,
      totalEmployees: employees.length,
      totalDeductions: 0,
      totalContributions: totalPayroll, // represents total salary to be disbursed
      totalTax: 0,
      lineItems,
      ruleVersion: this.version,
      generatedAt: new Date(),
    };
  }
}
