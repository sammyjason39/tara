import {
  IComplianceRule,
  ComplianceCalculationResult,
  ComplianceLineItem,
} from '../compliance.interface';

/**
 * Singapore CPF Rules (Central Provident Fund)
 *
 * Standard rates for employees below 55 years old (2024):
 *  - Employee:  20% of Ordinary Wages (OW) up to SGD 6,000/month
 *  - Employer:  17% of Ordinary Wages (OW)
 *
 * Ordinary Wage Ceiling: SGD 6,000/month
 * Additional Wage Ceiling: SGD 102,000 - total OW already contributed in year
 *
 * Reference: CPF Board, effective 1 Jan 2024
 */
export class CpfRules implements IComplianceRule {
  country = 'SG';
  version = '2024.01';
  effectiveDate = new Date('2024-01-01');

  private readonly EMPLOYEE_RATE = 0.20;
  private readonly EMPLOYER_RATE = 0.17;
  private readonly OW_CEILING = 6_000; // SGD/month

  calculate(
    employees: any[],
    tenant_id: string,
    period: string,
  ): ComplianceCalculationResult {
    const lineItems: ComplianceLineItem[] = employees.map((emp) => {
      const grossSalary = Number(emp.compensation?.baseSalary || emp.baseSalary || 0);
      const ordinaryWage = Math.min(grossSalary, this.OW_CEILING);

      const employeeContribution = Math.round(ordinaryWage * this.EMPLOYEE_RATE);
      const employerContribution = Math.round(ordinaryWage * this.EMPLOYER_RATE);

      return {
        employee_id: emp.id,
        employeeName: `${emp.first_name} ${emp.last_name}`.trim(),
        grossSalary,
        employeeContribution,
        employerContribution,
        tax_amount: 0,
        netSalary: grossSalary - employeeContribution,
        notes:
          grossSalary > this.OW_CEILING
            ? `OW capped at SGD ${this.OW_CEILING.toLocaleString()}`
            : undefined,
      };
    });

    return {
      country: 'SG',
      module: 'CPF',
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
