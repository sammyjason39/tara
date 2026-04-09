import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../persistence/prisma.service';

@Injectable()
export class AnomalyDetectorService {
  private readonly logger = new Logger(AnomalyDetectorService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Detects if a current stock movement is a "spike" (significantly above the average).
   */
  async detectSpike(tenantId: string, productId: string, locationId: string, currentQty: number): Promise<boolean> {
    const windowDays = 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - windowDays);

    const historicalMovements = await this.prisma.stockMovement.findMany({
      where: {
        tenantId,
        productId,
        locationId,
        type: { in: ['OUT', 'CONSUME_RESERVED'] },
        createdAt: { gte: startDate },
      },
      take: 50,
    });

    if (historicalMovements.length < 5) return false; // Not enough data

    const avg = historicalMovements.reduce((sum: number, m: any) => sum + Math.abs(Number(m.quantity)), 0) / historicalMovements.length;
    
    // Threshold: 3x the average
    if (Math.abs(currentQty) > avg * 3) {
      this.logger.warn(`Potential Stock Spike detected for Product ${productId}: ${currentQty} vs Avg ${avg.toFixed(2)}`);
      return true;
    }

    return false;
  }

  /**
   * Identifies "Dead Stock" (no movement for X days).
   */
  async isDeadStock(tenantId: string, productId: string, locationId: string, days: number = 90): Promise<boolean> {
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() - days);

    const recentMovement = await this.prisma.stockMovement.findFirst({
      where: {
        tenantId,
        productId,
        locationId,
        createdAt: { gte: thresholdDate },
      },
    });

    return !recentMovement;
  }
}
