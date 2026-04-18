import { Insight, InsightContext, InsightRule } from '../types/insight.types';

export class ConcentrationRiskRule implements InsightRule {
  readonly type = 'CONCENTRATION_RISK';

  evaluate(context: InsightContext): Insight[] {
    const { cashflow, snapshotSequence, tenant_id, company_id } = context;

    const snapshotDate = new Date(cashflow.snapshotTimestamp);
    const horizonLimit = new Date(snapshotDate);
    horizonLimit.setDate(horizonLimit.getDate() + 30);

    // 1. Filter Drivers to 30-day Window (Patch 3)
    const activeDrivers = cashflow.cashflowDrivers.outflow.filter(d => 
      new Date(d.dueDate).getTime() <= horizonLimit.getTime()
    );

    const totalOutflow = activeDrivers.reduce((sum, d) => sum + d.amount, 0);
    if (totalOutflow === 0) return [];

    // 2. Identify Top Driver
    const topDriver = activeDrivers[0];
    const concentrationRatio = (topDriver.amount / totalOutflow) * 100;

    if (concentrationRatio > 50) {
      // 3. Determine Time Horizon
      const dueDate = new Date(topDriver.dueDate);
      const daysToDue = Math.ceil((dueDate.getTime() - snapshotDate.getTime()) / (1000 * 3600 * 24));
      const timeHorizon = daysToDue <= 7 ? 'IMMEDIATE' : 'SHORT_TERM';

      const coreInputs = { 
          ruleType: this.type,
          accountId: topDriver.accountId, 
          amount: Math.round(topDriver.amount), 
          ratio: Math.round(concentrationRatio),
          date: topDriver.dueDate,
          snapshotSequence 
      };

      return [{
        id: '',
        type: this.type,
        scope: 'ACCOUNT',
        severity: concentrationRatio > 75 ? 'HIGH' : 'MEDIUM',
        confidence: null, // Computed globally
        timeHorizon,
        actionPriority: concentrationRatio > 75 ? 6.5 : 4.5,
        message: `High concentration risk detected: ${topDriver.account_name} accounts for ${Math.round(concentrationRatio)}% of projected outflows within 30 days.`,
        recommendation: 'Evaluate payment terms or diversify vendors to mitigate liquidity dependency on this single account.',
        isPrimary: true,
        explanation: {
          rule: 'ConcentrationRiskRule',
          inputsUsed: ['cashflowDrivers.outflow', 'metrics.totalCash'],
          coreInputs
        },
        supportingData: { topDriver, concentrationRatio, totalOutflow, daysToDue },
        accountId: topDriver.accountId,
        tenant_id,
        company_id,
        snapshotSequence
      }];
    }

    return [];
  }
}
