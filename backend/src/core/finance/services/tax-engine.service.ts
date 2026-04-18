import { Injectable, Logger, Inject } from '@nestjs/common';
import { PrismaService } from '../../../persistence/prisma.service';
import { Prisma } from '@prisma/client';

export interface TaxCalculationResult {
  taxRateId: string;
  name: string;
  baseAmount: Prisma.Decimal;
  tax_amount: Prisma.Decimal;
  accountCode: string;
}

export interface ITaxStrategy {
  calculate(params: {
    tenant_id: string;
    branch_id?: string;
    amount: Prisma.Decimal;
    transactionType: 'AR_INVOICE' | 'AP_BILL';
  }): Promise<TaxCalculationResult[]>;
}

@Injectable()
export class TaxEngineService {
  private readonly logger = new Logger(TaxEngineService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject('TAX_STRATEGIES') private strategies: Map<string, ITaxStrategy>
  ) {}

  async calculateTax(tenant_id: string, branch_id: string | undefined, country: string, amount: Prisma.Decimal, transactionType: 'AR_INVOICE' | 'AP_BILL') {
    const strategy = this.strategies.get(country);
    if (!strategy) {
      this.logger.warn(`No tax strategy for country ${country}. Skipping.`);
      return [];
    }
    return strategy.calculate({ tenant_id, branch_id, amount, transactionType });
  }
}

/**
 * INDONESIA TAX STRATEGY
 * Handles PPN (11%) and PPh (optional based on type)
 * Hardened with Decimal math to eliminate floating point drift.
 */
export class IndonesiaTaxStrategy implements ITaxStrategy {
  async calculate(params: {
    tenant_id: string;
    branch_id?: string;
    amount: Prisma.Decimal;
    transactionType: 'AR_INVOICE' | 'AP_BILL';
  }): Promise<TaxCalculationResult[]> {
    const results: TaxCalculationResult[] = [];
    const amount = new Prisma.Decimal(params.amount);
    
    // 1. PPN (VAT) 11%
    const ppnRate = new Prisma.Decimal(0.11);
    const tax_amount = amount.times(ppnRate).toDecimalPlaces(4);
    
    results.push({
      taxRateId: 'ID-PPN-11',
      name: 'PPN 11%',
      baseAmount: amount,
      tax_amount: tax_amount,
      accountCode: params.transactionType === 'AR_INVOICE' ? '2111-PPN-OUT' : '1151-PPN-IN',
    });

    // 2. PPh (Withholding) - Example: 2% for services in AP
    if (params.transactionType === 'AP_BILL') {
      const pphRate = new Prisma.Decimal(0.02);
      results.push({
        taxRateId: 'ID-PPH-23',
        name: 'PPh 23 (Services)',
        baseAmount: amount,
        tax_amount: amount.times(pphRate).toDecimalPlaces(4),
        accountCode: '2112-PPH-PAYABLE',
      });
    }

    return results;
  }
}
