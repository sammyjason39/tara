import { Insight, InsightContext, InsightRule } from '../types/insight.types';

export class TrendConsistencyRule implements InsightRule {
  readonly type = 'CONSISTENT_DECLINE';

  evaluate(context: InsightContext): Insight[] {
    const { cashflow, historicalSnapshots, snapshotSequence, tenant_id, company_id } = context;

    if (historicalSnapshots.length < 3) {
      return [];
    }

    // 1. Calculate Baseline (Average of last 3 snapshots)
    const baseline = historicalSnapshots
      .slice(0, 3)
      .reduce((sum, s) => sum + s.balance, 0) / 3;

    if (baseline === 0) return []; // Patch 4: Handle zero baseline

    const currentBalance = context.metrics.totalCash;
    const variance = ((currentBalance - baseline) / baseline) * 100;

    if (variance < -15) {
      const coreInputs = { 
        currentBalance: Math.round(currentBalance), 
        baseline: Math.round(baseline), 
        date: cashflow.snapshotTimestamp,
        snapshotSequence 
      };
      return [{
        id: '',
        type: 'CONSISTENT_DECLINE',
        scope: 'GLOBAL',
        severity: 'MEDIUM',
        confidence: null, // Computed globally
        timeHorizon: 'MID_TERM',
        actionPriority: 4.0,
        message: `Cash position has declined by ${Math.abs(Math.round(variance))}% relative to the 3-period baseline.`,
        recommendation: 'Investigate sustained expense increases or slowing collection cycles.',
        isPrimary: true,
        explanation: {
          rule: 'TrendConsistencyRule',
          inputsUsed: ['metrics.totalCash', 'historicalSnapshots'],
          coreInputs
        },
        supportingData: { variance, baseline, currentBalance },
        tenant_id,
        company_id,
        snapshotSequence
      }];
    }

    return [];
  }
}
