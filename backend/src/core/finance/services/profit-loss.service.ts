import { Injectable, Inject } from '@nestjs/common';
import { ITrialBalanceProjectionRepository } from '../repositories/interfaces/trial-balance-projection.repository.interface';
import { AccountType } from '../domain/finance.constants';
import { Prisma } from '@prisma/client';

@Injectable()
export class ProfitLossService {
  constructor(
    @Inject('ITrialBalanceProjectionRepository')
    private readonly trialBalanceRepo: ITrialBalanceProjectionRepository,
  ) {}

  async generate(tenant_id: string, company_id: string, fiscalPeriodId: string, dimensions?: Record<string, string>): Promise<any> {
    // 1. Fetch all TB rows for the period
    const tbRows = await this.trialBalanceRepo.findAll(tenant_id, company_id, fiscalPeriodId);

    // 2. Aggregate Revenue and Expenses (O(1) as rows are pre-calculated)
    let totalRevenue = new Prisma.Decimal(0);
    let totalExpense = new Prisma.Decimal(0);
    const details = [];

    for (const row of tbRows) {
      const credit = row.creditTotal || new Prisma.Decimal(0);
      const debit = row.debitTotal || new Prisma.Decimal(0);
      
      if (row.accountCategory === AccountType.REVENUE) {
        const amount = credit.minus(debit); // Revenue is credit-normal
        totalRevenue = totalRevenue.plus(amount);
        details.push({ accountId: row.accountId, category: row.accountCategory, amount });
      } else if (row.accountCategory === AccountType.EXPENSE) {
        const amount = debit.minus(credit); // Expense is debit-normal
        totalExpense = totalExpense.plus(amount);
        details.push({ accountId: row.accountId, category: row.accountCategory, amount });
      }
    }

    const netProfit = totalRevenue.minus(totalExpense);

    return {
      reportType: 'PROFIT_LOSS',
      tenant_id,
      company_id,
      fiscalPeriodId,
      generatedAt: new Date(),
      summary: {
        totalRevenue,
        totalExpense,
        netProfit,
      },
      details,
    };
  }
}
