import { Injectable, Logger } from '@nestjs/common';
import { InsightService } from './insight.service';
import { ForecastService } from './forecast.service';
import { Recommendation, RecommendationContext, RecommendationRule } from '../types/recommendation.types';
import { SimulationAdapter } from '../adapters/simulation.adapter';
import { PaymentDelayOptimizationRule } from '../rules/recommendation/payment-delay-optimization.rule';
import { ARAccelerationRule } from '../rules/recommendation/ar-acceleration.rule';
import { ExpenseReductionRule } from '../rules/recommendation/expense-reduction.rule';
import * as crypto from 'crypto';

@Injectable()
export class RecommendationService {
  private readonly logger = new Logger(RecommendationService.name);
  private rules: RecommendationRule[] = [
    new PaymentDelayOptimizationRule(),
    new ARAccelerationRule(),
    new ExpenseReductionRule(),
  ];

  constructor(
    private readonly insightService: InsightService,
    private readonly forecastService: ForecastService,
    private readonly simulationAdapter: SimulationAdapter,
  ) {}

  /**
   * Main entry point for recommendation generation
   */
  async getRecommendations(params: {
    tenant_id: string;
    company_id: string;
    snapshotId?: string;
    correlation_id?: string;
    user_id?: string;
  }): Promise<Recommendation[]> {
    const { tenant_id, company_id, snapshotId, correlation_id = `rec-${Date.now()}`, user_id } = params;

    // 1. Get Base Forecast (90-day baseline)
    const baselineForecast = await this.forecastService.getForecast({
        tenant_id,
        company_id,
        snapshotId
    });

    // 2. Get Insights for this forecast
    const insights = await this.insightService.getInsights({
        tenant_id,
        company_id,
        snapshotId,
        forecast: baselineForecast,
        correlation_id,
        user_id
    });

    // 3. Initialize Recommendation Context
    const context: RecommendationContext = {
        insightContext: (insights as any)._context || {}, // Note: InsightService needs to export context or we re-fetch
        baselineForecast,
        simulationResults: []
    };

    // 4. Run Recommendation Rules
    const recommendations: Recommendation[] = [];
    for (const rule of this.rules) {
        try {
            const results = rule.generate(context);
            recommendations.push(...results);
        } catch (err) {
            this.logger.error(`Recommendation rule ${rule.type} failed: ${err.message}`, correlation_id);
        }
    }

    // 5. Final Ranking & Pruning (Phase 4.4)
    return this.processPipeline(recommendations);
  }

  /**
   * Final Ranking & Pruning (Phase 4.4)
   */
  private processPipeline(recommendations: Recommendation[]): Recommendation[] {
    // 1. Calculate / Re-verify Priority Scores
    const scored = recommendations.map(rec => ({
        ...rec,
        priorityScore: this.calculatePriorityScore(rec)
    }));

    // 2. Pruning (Threshold: 4.0)
    const filtered = scored.filter(rec => rec.priorityScore >= 4.0);

    // 3. De-duplication (Keep highest score for specific action/target overlap)
    const unique = new Map<string, Recommendation>();
    for (const rec of filtered) {
        const key = `${rec.type}:${rec.basedOnInsightId || 'GLOBAL'}`;
        const existing = unique.get(key);
        if (!existing || rec.priorityScore > existing.priorityScore) {
            unique.set(key, rec);
        }
    }

    // 4. Deterministic Sorting & Deep Freeze
    return Array.from(unique.values())
        .sort((a, b) => b.priorityScore - a.priorityScore || a.id.localeCompare(b.id))
        .map(r => this.deepFreeze(r));
  }

  private calculatePriorityScore(rec: Recommendation): number {
      const impactScore = Math.min(10, (rec.expectedImpact.runwayDeltaDays / 7) * 2); // 35 days = 10
      const confidenceScore = rec.confidence === 'HIGH' ? 10 : rec.confidence === 'MEDIUM' ? 7 : 4;
      const feasibilityScore = rec.constraints.length === 0 ? 10 : rec.constraints.length === 1 ? 7 : 4;
      
      // Basic Urgency 
      const urgencyScore = rec.expectedImpact.riskReduction * 10;

      const score = (impactScore * 0.4) + (urgencyScore * 0.3) + (confidenceScore * 0.2) + (feasibilityScore * 0.1);
      return Number(score.toFixed(2));
  }

  private deepFreeze(obj: any): any {
    Object.freeze(obj);
    Object.getOwnPropertyNames(obj).forEach((prop) => {
      if (
        obj.hasOwnProperty(prop) &&
        obj[prop] !== null &&
        (typeof obj[prop] === 'object' || typeof obj[prop] === 'function') &&
        !Object.isFrozen(obj[prop])
      ) {
        this.deepFreeze(obj[prop]);
      }
    });
    return obj;
  }
}
