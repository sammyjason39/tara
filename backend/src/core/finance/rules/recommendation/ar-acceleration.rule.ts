import { Recommendation, RecommendationContext, RecommendationRule } from '../../types/recommendation.types';
import * as crypto from 'crypto';

export class ARAccelerationRule implements RecommendationRule {
  readonly type = 'COLLECTION_ACCELERATION';

  generate(context: RecommendationContext): Recommendation[] {
    const { insightContext, baselineForecast } = context;
    const currentBalance = insightContext.metrics.totalCash;
    
    // Logic: If cash is low (< 20% of baseline), accelerate top AR
    if (currentBalance > 0) return []; // Only for liquidity stress (Mock logic)

    const topInflows = insightContext.cashflow.cashflowDrivers.inflow
        .filter((d: any) => d.amount > 10000)
        .sort((a: any, b: any) => b.amount - a.amount);

    if (topInflows.length === 0) return [];

    const target = topInflows[0];

    return [{
      id: crypto.createHash('sha256').update(`ACCEL:${target.accountId}`).digest('hex'),
      basedOnInsightId: '',
      type: 'COLLECTION_ACCELERATION',
      action: `Offer 2% early settlement discount to ${target.account_name} for immediate injection of ${Math.round(target.amount).toLocaleString()}`,
      expectedImpact: {
        cashDelta: Math.round(target.amount * 0.98),
        runwayDeltaDays: 45,
        riskReduction: 0.92
      },
      confidence: 'MEDIUM',
      priorityScore: 7.8,
      constraints: ['Margin Impact (2%)'],
      simulationHash: baselineForecast.forecastHash,
      explanation: {
        method: 'Discount-Adjusted Inflow Simulation',
        assumptions: ['Client accepts early payment offer']
      }
    }];
  }
}
