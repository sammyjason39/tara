import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../persistence/prisma.service';

@Injectable()
export class ForecasterService {
  private readonly logger = new Logger(ForecasterService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Calculates a simple moving average demand for a product at a location.
   * Default window: 30 days.
   */
  async getForecast(tenantId: string, productId: string, locationId: string, daysWindow: number = 30): Promise<number> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysWindow);

    // Fetch OUT movements (consumption/sales)
    const movements = await this.prisma.stockMovement.findMany({
      where: {
        tenantId,
        productId,
        locationId,
        type: { in: ['OUT', 'CONSUME_RESERVED', 'TRANSFER_OUT'] },
        createdAt: { gte: startDate },
      },
    });

    const totalConsumed = movements.reduce((sum: number, m: any) => sum + Math.abs(Number(m.quantity)), 0);
    const averageDailyDemand = totalConsumed / daysWindow;

    this.logger.debug(`Forecast for Product ${productId} at Location ${locationId}: ${averageDailyDemand.toFixed(2)} units/day`);
    
    return averageDailyDemand;
  }
}
