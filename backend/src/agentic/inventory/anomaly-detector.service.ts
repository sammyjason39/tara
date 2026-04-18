import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../persistence/prisma.service';

@Injectable()
export class AnomalyDetectorService {
  private readonly logger = new Logger(AnomalyDetectorService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Detects if a current stock movement is a "spike" (significantly above the average).
   */
  async detectSpike(tenant_id: string, product_id: string, location_id: string, currentQty: number): Promise<boolean> {
    const windowDays = 30;
    const start_date = new Date();
    start_date.setDate(start_date.getDate() - windowDays);

    const historicalMovements = await this.prisma.stock_movements.findMany({
      where: {
        tenant_id: tenant_id,
        product_id: product_id,
        location_id: location_id,
        type: { in: ['OUT', 'CONSUME_RESERVED'] },
        created_at: { gte: start_date },
      },
      take: 50,
    });

    if (historicalMovements.length < 5) return false; // Not enough data

    const avg = historicalMovements.reduce((sum: number, m: any) => sum + Math.abs(Number(m.quantity)), 0) / historicalMovements.length;
    
    // Threshold: 3x the average
    if (Math.abs(currentQty) > avg * 3) {
      this.logger.warn(`Potential Stock Spike detected for Product ${product_id}: ${currentQty} vs Avg ${avg.toFixed(2)}`);
      return true;
    }

    return false;
  }

  /**
   * Identifies "Dead Stock" (no movement for X days).
   */
  async isDeadStock(tenant_id: string, product_id: string, location_id: string, days: number = 90): Promise<boolean> {
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() - days);

    const recentMovement = await this.prisma.stock_movements.findFirst({
      where: {
        tenant_id: tenant_id,
        product_id: product_id,
        location_id: location_id,
        created_at: { gte: thresholdDate },
      },
    });

    return !recentMovement;
  }
}
