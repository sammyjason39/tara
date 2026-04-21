import { Injectable, Inject, Logger } from '@nestjs/common';
import { PrismaService } from '../../../persistence/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';
import { v4 as uuidv4 } from 'uuid';


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
  async calculateVariance(tenant_id: string, budgetLineId: string) {
    const budgetLine = await this.prisma.finance_budget_lines.findUnique({
      where: { id: budgetLineId },
      include: { hr_budget_scenarios: true }
    });

    if (!budgetLine) throw new Error('Budget Line not found');

    // Fetch actuals from ledger (via AccountBalance)
    const balance = await this.balanceRepo.getBalance(
        tenant_id, 
        (budgetLine as any).hrBudgetScenario.tenant_id, 
        budgetLine.account_id, 
        budgetLine.period_id
    );

    const actualAmount = new Decimal(Number(balance?.closingBalance || 0));
    const budgetAmount = budgetLine.amount;

    // Determine account type to calculate variance correctly
    const account = await this.prisma.finance_chart_of_accounts.findUnique({
        where: { id: budgetLine.account_id }
    });

    let variance: Decimal;
    if (account?.type === 'REVENUE') {
        variance = actualAmount.minus(budgetAmount);
    } else {
        variance = budgetAmount.minus(actualAmount);
    }

    // Record the actual snapshot for trend tracking
    await this.prisma.finance_budget_actuals.create({
        data: {
          updated_at: new Date(),
        id: uuidv4(),
            budget_line_id: budgetLineId,
            amount: actualAmount,
            as_of_date: new Date(),
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
  async getScenarioVariance(tenant_id: string, scenarioId: string) {
      const lines = await this.prisma.finance_budget_lines.findMany({
          where: { scenario_id: scenarioId }
      });

      const results = [];
      for (const line of lines) {
          results.push(await this.calculateVariance(tenant_id, line.id));
      }

      return results;
  }
}

