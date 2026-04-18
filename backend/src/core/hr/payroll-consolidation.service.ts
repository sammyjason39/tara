import { Injectable, Logger } from "@nestjs/common";
import { IHRRepository } from "./repositories/hr.repository.interface";

@Injectable()
export class PayrollConsolidationService {
  private readonly logger = new Logger(PayrollConsolidationService.name);

  constructor(private readonly repository: IHRRepository) {}

  async getConsolidatedReport(tenant_id: string, baseCurrency: string = "USD") {
    this.logger.log(`Generating consolidated payroll report for tenant ${tenant_id} in ${baseCurrency}`);

    const [runs, rates] = await Promise.all([
      this.repository.getPayrollRuns(tenant_id),
      this.repository.getExchangeRates(tenant_id),
    ]);

    // Filter to latest manual rates for simplicity in this version
    const activeRates = new Map<string, number>();
    rates.forEach((r) => {
      const key = `${r.fromCurrency}_${r.toCurrency}`;
      if (!activeRates.has(key)) activeRates.set(key, r.rate);
    });

    const consolidated = runs.map((run) => {
      return {
        id: run.id,
        period: `${run.period_start.toISOString().substring(0, 10)} to ${run.period_end.toISOString().substring(0, 10)}`,
        status: run.status,
        totalGross: Number(run.totalGrossPay),
        totalNet: Number(run.totalNetPay),
        currency: run.baseCurrency,
      };
    });

    return {
      baseCurrency,
      runs: consolidated,
      systemExchangeRates: Array.from(activeRates.entries()).map(([pair, rate]) => ({
        pair,
        rate,
      })),
    };
  }

  async calculateExchangeRate(from: string, to: string, amount: number, rates: any[]): Promise<number> {
    if (from === to) return amount;
    
    const rate = rates.find(r => r.fromCurrency === from && r.toCurrency === to);
    if (rate) return amount * rate.rate;

    // Inverse rate
    const inverse = rates.find(r => r.fromCurrency === to && r.toCurrency === from);
    if (inverse) return amount * (1 / inverse.rate);

    return amount; // Fallback
  }
}
