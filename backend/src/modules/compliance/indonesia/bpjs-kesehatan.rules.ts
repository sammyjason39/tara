import {
  IComplianceRule,
  ComplianceCalculationResult,
  ComplianceLineItem,
} from '../compliance.interface';

/**
 * BPJS Kesehatan Rules (Indonesia)
 * Health insurance contribution managed by BPJS Kesehatan.
 *
 * Rates (Effective 2020, capped at IDR 12,000,000 salary base):
 *  - Employee:  1%  (max IDR 120,000/month)
 *  - Employer:  4%  (max IDR 480,000/month)
 *
 * Reference: Perpres No.64 Tahun 2020
 */
export class BpjsKesehatanRules implements IComplianceRule {
  country = 'ID';
  version = '2024.01';
  effectiveDate = new Date('2024-01-01');

  private readonly EMPLOYEE_RATE = 0.01;
  private readonly EMPLOYER_RATE = 0.04;
  private readonly SALARY_CAP = 12_000_000; // IDR

  calculate(
    employees: any[],
    tenant_id: string,
    period: string,
  ): ComplianceCalculationResult {
    const lineItems: ComplianceLineItem[] = employees.map((emp) => {
      const grossSalary = Number(emp.compensation?.baseSalary || emp.baseSalary || 0);
      const base = Math.min(grossSalary, this.SALARY_CAP);
      const employeeContribution = Math.round(base * this.EMPLOYEE_RATE);
      const employerContribution = Math.round(base * this.EMPLOYER_RATE);

      return {
        employee_id: emp.id,
        employeeName: `${emp.first_name} ${emp.last_name}`.trim(),
        grossSalary,
        employeeContribution,
        employerContribution,
        tax_amount: 0,
        netSalary: grossSalary - employeeContribution,
        notes:
          grossSalary > this.SALARY_CAP
            ? `Salary capped at IDR ${this.SALARY_CAP.toLocaleString()}`
            : undefined,
      };
    });

    return {
      country: 'ID',
      module: 'BPJS_KESEHATAN',
      period,
      tenant_id,
      totalEmployees: employees.length,
      totalDeductions: lineItems.reduce((s, i) => s + i.employeeContribution, 0),
      totalContributions: lineItems.reduce((s, i) => s + i.employerContribution, 0),
      totalTax: 0,
      lineItems,
      ruleVersion: this.version,
      generatedAt: new Date(),
    };
  }
}
