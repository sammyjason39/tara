import { Insight, InsightContext, InsightRule } from '../types/insight.types';

export class GlobalCoverageRule implements InsightRule {
  readonly type = 'SYSTEM_HEALTH';

  evaluate(context: InsightContext): Insight[] {
    const { cashflow, snapshotSequence, tenant_id, company_id } = context;

    // 1. Calculate Coverage (from centralized metrics)
    const coverage = context.metrics.coverage;

    if (coverage < 0.7) {
        const coreInputs = { 
            type: 'LOW_COVERAGE', 
            coverage: Number(coverage.toFixed(2)), 
            date: cashflow.snapshotTimestamp,
            snapshotSequence 
        };
        return [{
            id: '',
            type: 'ANOMALY_DETECTED',
            scope: 'GLOBAL',
            severity: 'MEDIUM',
            confidence: null, // Computed globally
            timeHorizon: 'MID_TERM',
            actionPriority: 5.0,
            message: `Financial visibility is limited to ${Math.round(coverage * 100)}% of expected documents.`,
            recommendation: 'Review AR/AP aging reports to ensure all pending obligations have valid due dates.',
            isPrimary: true,
            explanation: {
                rule: 'GlobalCoverageRule',
                inputsUsed: ['metrics.coverage'],
                coreInputs
            },
            supportingData: { coverage },
            tenant_id,
            company_id,
            snapshotSequence
        }];
    }

    return [{
        id: '',
        type: 'SYSTEM_HEALTH',
        scope: 'GLOBAL',
        severity: 'LOW',
        confidence: null, // Computed globally
        timeHorizon: 'MID_TERM',
        actionPriority: 1.0,
        message: 'Data coverage is optimal. Predictive confidence for the 30-day horizon is high.',
        recommendation: 'Maintain existing reconciliation workflows.',
        isPrimary: true,
        explanation: {
            rule: 'GlobalCoverageRule',
            inputsUsed: ['metrics.coverage'],
            coreInputs: { 
                type: 'OPTIMAL_COVERAGE', 
                coverage: Number(coverage.toFixed(2)), 
                date: cashflow.snapshotTimestamp,
                snapshotSequence 
            }
        },
        supportingData: { coverage },
        tenant_id,
        company_id,
        snapshotSequence
    }];
  }
}
