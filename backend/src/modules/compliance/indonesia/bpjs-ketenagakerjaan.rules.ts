import {
  IComplianceRule,
  ComplianceCalculationResult,
  ComplianceLineItem,
} from '../compliance.interface';

/**
 * BPJS Ketenagakerjaan Rules (Indonesia)
 * Work accident, death, pension, and old-age savings contributions.
 *
 * Components:
 *  JHT (Jaminan Hari Tua — Old Age):
 *    Employee: 2%  | Employer: 3.7%
 *  JP  (Jaminan Pensiun — Pension):
 *    Employee: 1%  | Employer: 2%  (salary cap: IDR 9,077,600)
 *  JKK (Jaminan Kecelakaan Kerja — Work Accident):
 *    Employer only: 0.54% (default medium-risk; range 0.24%–1.74%)
 *  JKM (Jaminan Kematian — Death):
 *    Employer only: 0.30%
 *
 * Reference: PP No.44/2015, PP No.46/2015, PP No.82/2019
 */
export class BpjsKetenagakerjaanRules implements IComplianceRule {
  country = 'ID';
  version = '2024.01';
  effectiveDate = new Date('2024-01-01');

  // JHT rates
  private readonly JHT_EMP = 0.02;
  private readonly JHT_EMP_RATE = 0.037;

  // JP rates + salary cap
  private readonly JP_EMP = 0.01;
  private readonly JP_EMP_RATE = 0.02;
  private readonly JP_SALARY_CAP = 9_077_600; // IDR

  // JKK (default medium risk)
  private readonly JKK_RATE = 0.0054;

  // JKM rate
  private readonly JKM_RATE = 0.003;

  calculate(
    employees: any[],
    tenant_id: string,
    period: string,
  ): ComplianceCalculationResult {
    const lineItems: ComplianceLineItem[] = employees.map((emp) => {
      const grossSalary = Number(emp.compensation?.baseSalary || emp.baseSalary || 0);

      // JHT (no cap)
      const jhtEmployee = Math.round(grossSalary * this.JHT_EMP);
      const jhtEmployer = Math.round(grossSalary * this.JHT_EMP_RATE);

      // JP (with cap)
      const jpBase = Math.min(grossSalary, this.JP_SALARY_CAP);
      const jpEmployee = Math.round(jpBase * this.JP_EMP);
      const jpEmployer = Math.round(jpBase * this.JP_EMP_RATE);

      // JKK (employer only)
      const jkkEmployer = Math.round(grossSalary * this.JKK_RATE);

      // JKM (employer only)
      const jkmEmployer = Math.round(grossSalary * this.JKM_RATE);

      const employeeContribution = jhtEmployee + jpEmployee;
      const employerContribution = jhtEmployer + jpEmployer + jkkEmployer + jkmEmployer;

      return {
        employee_id: emp.id,
        employeeName: `${emp.first_name} ${emp.last_name}`.trim(),
        grossSalary,
        employeeContribution,
        employerContribution,
        tax_amount: 0,
        netSalary: grossSalary - employeeContribution,
        notes: [
          `JHT: Emp ${jhtEmployee.toLocaleString()} / Empr ${jhtEmployer.toLocaleString()}`,
          `JP: Emp ${jpEmployee.toLocaleString()} / Empr ${jpEmployer.toLocaleString()}`,
          `JKK: ${jkkEmployer.toLocaleString()} | JKM: ${jkmEmployer.toLocaleString()}`,
        ].join(' | '),
      };
    });

    return {
      country: 'ID',
      module: 'BPJS_KETENAGAKERJAAN',
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
