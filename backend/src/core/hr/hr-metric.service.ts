import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../persistence/prisma.service';

/**
 * HRMetricService
 * Phase 6 — System Health Metrics
 * 
 * Tracks AI health and event latency.
 */
@Injectable()
export class HRMetricService {
  private readonly logger = new Logger(HRMetricService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Refreshes and persists health metrics for a tenant.
   */
  async refreshMetrics(tenant_id: string) {
    try {
      // 1. Calculate Anomaly Detection Rate (Insights with anomaly / total)
      const totalInsights = await this.prisma.hr_insights.count({ where: { tenant_id: tenant_id } });
      const anomalyInsights = await this.prisma.hr_insights.count({ 
        where: { tenant_id: tenant_id, metadata: { path: ['diffPercent'], gte: 20 } } 
      });
      const anomalyRate = totalInsights > 0 ? (anomalyInsights / totalInsights) * 100 : 0;

      // 2. Calculate False Positive Rate (via Rejections)
      const recommendations = await this.prisma.hr_recommendations.count({ where: { tenant_id: tenant_id } });
      const rejections = await this.prisma.hr_recommendation_feedbacks.count({ 
        where: { tenant_id: tenant_id, action_taken: 'REJECTED' } 
      });
      const falsePositiveRate = recommendations > 0 ? (rejections / recommendations) * 100 : 0;

      // 3. Persist Metrics
      await this.prisma.hr_system_metrics.createMany({
        data: [
          { tenant_id: tenant_id, metric_name: 'ANOMALY_RATE', value: anomalyRate },
          { tenant_id: tenant_id, metric_name: 'FALSE_POSITIVE_RATE', value: falsePositiveRate },
          { tenant_id: tenant_id, metric_name: 'RECOMMENDATION_ACCEPTANCE_RATE', value: 100 - falsePositiveRate },
        ],
      });

      this.logger.log(`[AI_METRICS] Refreshed health metrics for tenant ${tenant_id}. Anomaly Rate: ${anomalyRate.toFixed(2)}%`);
    } catch (error) {
      this.logger.error('Failed to refresh HR metrics:', error.stack);
    }
  }
}
