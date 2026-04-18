import { Recommendation, RecommendationContext, RecommendationRule } from '../../types/recommendation.types';
import * as crypto from 'crypto';

export class PaymentDelayOptimizationRule implements RecommendationRule {
  readonly type = 'PAYMENT_DELAY_OPTIMIZATION';

  generate(context: RecommendationContext): Recommendation[] {
    const { insightContext, baselineForecast } = context;
    const deficits = (insightContext.cashflow as any)?.projectionDetails?.filter((d: any) => d.closingBalance < 0) || [];

    if (deficits.length === 0) return [];

    const firstDeficit = deficits[0];
    const deficitDate = new Date(firstDeficit.date);
    
    // Identify AP bills due near deficit (within 5 days before)
    const candidates = insightContext.cashflow.cashflowDrivers.outflow.filter((d: any) => {
        const dueDate = new Date(d.dueDate);
        const diff = (deficitDate.getTime() - dueDate.getTime()) / (1000 * 3600 * 24);
        return diff >= 0 && diff <= 5;
    });

    if (candidates.length === 0) return [];

    // Sort by amount descending
    candidates.sort((a: any, b: any) => b.amount - a.amount);
    const topCandidate = candidates[0];

    // Note: In a real simulation, we'd call simulationAdapter.runSimulation()
    // For the skeleton, we propose the action based on the identified candidate.
    
    return [{
      id: crypto.createHash('sha256').update(`DELAY:${topCandidate.accountId}:${firstDeficit.date}`).digest('hex'),
      basedOnInsightId: '', // Would be linked to the specific deficit insight
      type: 'PAYMENT_OPTIMIZATION',
      action: `Negotiate 14-day payment extension for ${topCandidate.account_name} (Amt: ${topCandidate.amount.toLocaleString()})`,
      expectedImpact: {
        cashDelta: topCandidate.amount,
        runwayDeltaDays: 14,
        riskReduction: 0.85
      },
      confidence: 'HIGH',
      priorityScore: 8.5,
      constraints: ['Vendor Relationship Impact'],
      simulationHash: baselineForecast.forecastHash,
      explanation: {
        method: 'Liquidity Buffer Simulation',
        assumptions: ['Vendor accepts extension', 'No late fees applied']
      }
    }];
  }
}
