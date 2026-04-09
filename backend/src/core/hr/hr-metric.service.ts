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
  async refreshMetrics(tenantId: string) {
    try {
      // 1. Calculate Anomaly Detection Rate (Insights with anomaly / total)
      const totalInsights = await this.prisma.hrInsight.count({ where: { tenantId } });
      const anomalyInsights = await this.prisma.hrInsight.count({ 
        where: { tenantId, metadata: { path: ['diffPercent'], gte: 20 } } 
      });
      const anomalyRate = totalInsights > 0 ? (anomalyInsights / totalInsights) * 100 : 0;

      // 2. Calculate False Positive Rate (via Rejections)
      const recommendations = await this.prisma.hrRecommendation.count({ where: { tenantId } });
      const rejections = await this.prisma.hrRecommendationFeedback.count({ 
        where: { tenantId, actionTaken: 'REJECTED' } 
      });
      const falsePositiveRate = recommendations > 0 ? (rejections / recommendations) * 100 : 0;

      // 3. Persist Metrics
      await this.prisma.hrSystemMetric.createMany({
        data: [
          { tenantId, metricName: 'ANOMALY_RATE', value: anomalyRate },
          { tenantId, metricName: 'FALSE_POSITIVE_RATE', value: falsePositiveRate },
          { tenantId, metricName: 'RECOMMENDATION_ACCEPTANCE_RATE', value: 100 - falsePositiveRate },
        ],
      });

      this.logger.log(`[AI_METRICS] Refreshed health metrics for tenant ${tenantId}. Anomaly Rate: ${anomalyRate.toFixed(2)}%`);
    } catch (error) {
      this.logger.error('Failed to refresh HR metrics:', error.stack);
    }
  }
}
