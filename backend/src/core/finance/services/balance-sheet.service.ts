import { Injectable, Inject } from '@nestjs/common';
import { ITrialBalanceProjectionRepository } from '../repositories/interfaces/trial-balance-projection.repository.interface';
import { AccountType } from '../domain/finance.constants';
import { Prisma } from '@prisma/client';

@Injectable()
export class BalanceSheetService {
  constructor(
    @Inject('ITrialBalanceProjectionRepository')
    private readonly trialBalanceRepo: ITrialBalanceProjectionRepository,
  ) {}

  async generate(tenant_id: string, company_id: string, fiscalPeriodId: string, dimensions?: Record<string, string>): Promise<any> {
    const tbRows = await this.trialBalanceRepo.findAll(tenant_id, company_id, fiscalPeriodId);

    let totalAssets = new Prisma.Decimal(0);
    let totalLiabilities = new Prisma.Decimal(0);
    let totalEquity = new Prisma.Decimal(0);
    const sections: Record<string, any[]> = { ASSET: [], LIABILITY: [], EQUITY: [] };

    for (const row of tbRows) {
      const debit = row.debitTotal || new Prisma.Decimal(0);
      const credit = row.creditTotal || new Prisma.Decimal(0);
      
      if (row.accountCategory === AccountType.ASSET) {
        const amount = debit.minus(credit);
        totalAssets = totalAssets.plus(amount);
        sections.ASSET.push({ accountId: row.accountId, amount });
      } else if (row.accountCategory === AccountType.LIABILITY) {
        const amount = credit.minus(debit);
        totalLiabilities = totalLiabilities.plus(amount);
        sections.LIABILITY.push({ accountId: row.accountId, amount });
      } else if (row.accountCategory === AccountType.EQUITY) {
        const amount = credit.minus(debit);
        totalEquity = totalEquity.plus(amount);
        sections.EQUITY.push({ accountId: row.accountId, amount });
      }
    }

    // Invariant Check (A = L + E)
    const imbalance = totalAssets.minus(totalLiabilities.plus(totalEquity));
    
    if (!imbalance.isZero()) {
      console.warn(`[BALANCE_SHEET] Invariant violation for tenant ${tenant_id}: A(${totalAssets.toString()}) != L(${totalLiabilities.toString()}) + E(${totalEquity.toString()}). Gap: ${imbalance.toString()}`);
    }

    return {
      reportType: 'BALANCE_SHEET',
      tenant_id,
      company_id,
      fiscalPeriodId,
      generatedAt: new Date(),
      summary: {
        totalAssets,
        totalLiabilities,
        totalEquity,
        isBalanced: imbalance.isZero(),
      },
      sections,
    };
  }
}
