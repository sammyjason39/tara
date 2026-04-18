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
  async getForecast(tenant_id: string, product_id: string, location_id: string, daysWindow: number = 30): Promise<number> {
    const start_date = new Date();
    start_date.setDate(start_date.getDate() - daysWindow);

    // Fetch OUT movements (consumption/sales)
    const movements = await this.prisma.stock_movements.findMany({
      where: {
        tenant_id: tenant_id,
        product_id: product_id,
        location_id: location_id,
        type: { in: ['OUT', 'CONSUME_RESERVED', 'TRANSFER_OUT'] },
        created_at: { gte: start_date },
      },
    });

    const totalConsumed = movements.reduce((sum: number, m: any) => sum + Math.abs(Number(m.quantity)), 0);
    const averageDailyDemand = totalConsumed / daysWindow;

    this.logger.debug(`Forecast for Product ${product_id} at Location ${location_id}: ${averageDailyDemand.toFixed(2)} units/day`);
    
    return averageDailyDemand;
  }
}
