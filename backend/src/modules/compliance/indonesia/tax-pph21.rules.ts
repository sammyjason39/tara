import {
  IComplianceRule,
  ComplianceCalculationResult,
  ComplianceLineItem,
} from '../compliance.interface';

/**
 * PPh21 — Indonesian Income Tax (Pajak Penghasilan Pasal 21)
 *
 * Progressive tax brackets (effective 2022 via UU HPP No.7/2021):
 *   ≤ IDR 60,000,000/yr  →  5%
 *   IDR 60M – 250M/yr   → 15%
 *   IDR 250M – 500M/yr  → 25%
 *   IDR 500M – 5B/yr    → 30%
 *   > IDR 5B/yr          → 35%
 *
 * PTKP (Non-taxable threshold) for single person:
 *   IDR 54,000,000/year (TK/0)
 *
 * Flow: MonthlyGross × 12 → AnnualGross → AnnualGross - PTKP → PKP → Progressive Tax → ÷12
 */
export class TaxPph21Rules implements IComplianceRule {
  country = 'ID';
  version = '2024.01';
  effectiveDate = new Date('2024-01-01');

  // PTKP: Personal Tax Relief (single, no dependents)
  private readonly PTKP = 54_000_000; // IDR/year

  // Progressive brackets: [upperLimit, rate]
  private readonly BRACKETS: [number, number][] = [
    [60_000_000, 0.05],
    [250_000_000, 0.15],
    [500_000_000, 0.25],
    [5_000_000_000, 0.30],
    [Infinity, 0.35],
  ];

  /**
   * Calculate annual progressive PPh21 tax from PKP (taxable income)
   */
  private calculateProgressiveTax(pkp: number): number {
    if (pkp <= 0) return 0;

    let tax = 0;
    let remaining = pkp;
    let prev = 0;

    for (const [upper, rate] of this.BRACKETS) {
      const slice = Math.min(remaining, upper - prev);
      if (slice <= 0) break;
      tax += slice * rate;
      remaining -= slice;
      prev = upper;
      if (remaining <= 0) break;
    }

    return Math.round(tax);
  }

  calculate(
    employees: any[],
    tenant_id: string,
    period: string,
  ): ComplianceCalculationResult {
    const lineItems: ComplianceLineItem[] = employees.map((emp) => {
      const monthlyGross = Number(emp.compensation?.baseSalary || emp.baseSalary || 0);
      const annualGross = monthlyGross * 12;

      // PKP = Penghasilan Kena Pajak (taxable income)
      const pkp = Math.max(0, annualGross - this.PTKP);
      const annualTax = this.calculateProgressiveTax(pkp);
      const monthlyTax = Math.round(annualTax / 12);

      return {
        employee_id: emp.id,
        employeeName: `${emp.first_name} ${emp.last_name}`.trim(),
        grossSalary: monthlyGross,
        employeeContribution: monthlyTax,
        employerContribution: 0, // PPh21 is fully employee-borne
        tax_amount: monthlyTax,
        netSalary: monthlyGross - monthlyTax,
        notes: `Annual PKP: IDR ${pkp.toLocaleString()} | Annual Tax: IDR ${annualTax.toLocaleString()}`,
      };
    });

    return {
      country: 'ID',
      module: 'PPH21',
      period,
      tenant_id,
      totalEmployees: employees.length,
      totalDeductions: lineItems.reduce((s, i) => s + i.employeeContribution, 0),
      totalContributions: 0,
      totalTax: lineItems.reduce((s, i) => s + i.tax_amount, 0),
      lineItems,
      ruleVersion: this.version,
      generatedAt: new Date(),
    };
  }
}
