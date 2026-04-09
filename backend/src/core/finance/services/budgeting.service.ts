import { Injectable, Inject, Logger } from '@nestjs/common';
import { PrismaService } from '../../../persistence/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class BudgetingService {
  private readonly logger = new Logger(BudgetingService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject('IAccountBalanceRepository')
    private readonly balanceRepo: any, 
  ) {}

  /**
   * Calculates variance for a specific budget line.
   * Variance = Actual - Budget (for Revenue)
   * Variance = Budget - Actual (for Expense)
   */
  async calculateVariance(tenantId: string, budgetLineId: string) {
    const budgetLine = await this.prisma.budgetLine.findUnique({
      where: { id: budgetLineId },
      include: { hrBudgetScenario: true }
    });

    if (!budgetLine) throw new Error('Budget Line not found');

    // Fetch actuals from ledger (via AccountBalance)
    const balance = await this.balanceRepo.getBalance(
        tenantId, 
        (budgetLine as any).hrBudgetScenario.tenantId, 
        budgetLine.accountId, 
        budgetLine.periodId
    );

    const actualAmount = new Decimal(Number(balance?.closingBalance || 0));
    const budgetAmount = budgetLine.amount;

    // Determine account type to calculate variance correctly
    const account = await this.prisma.chartOfAccount.findUnique({
        where: { id: budgetLine.accountId }
    });

    let variance: Decimal;
    if (account?.type === 'REVENUE') {
        variance = actualAmount.minus(budgetAmount);
    } else {
        variance = budgetAmount.minus(actualAmount);
    }

    // Record the actual snapshot for trend tracking
    await this.prisma.budgetActual.create({
        data: {
        id: '5df6fynr',
            budgetLineId,
            amount: actualAmount,
            asOfDate: new Date(),
        }
    });

    return {
        budgetLineId,
        budgetAmount,
        actualAmount,
        variance,
        variancePercentage: budgetAmount.isZero() ? 0 : variance.div(budgetAmount).toNumber() * 100
    };
  }

  /**
   * Aggregates variance for an entire budget scenario.
   */
  async getScenarioVariance(tenantId: string, scenarioId: string) {
      const lines = await this.prisma.budgetLine.findMany({
          where: { scenarioId }
      });

      const results = [];
      for (const line of lines) {
          results.push(await this.calculateVariance(tenantId, line.id));
      }

      return results;
  }
}
