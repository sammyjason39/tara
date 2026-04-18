import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../persistence/prisma.service';
import { ForecasterService } from './forecaster.service';

@Injectable()
export class ReplenishmentService {
  private readonly logger = new Logger(ReplenishmentService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly forecaster: ForecasterService,
  ) {}

  /**
   * Evaluates if a product needs replenishment at a given location.
   * Returns a recommendation object if replenishment is needed.
   */
  async evaluateReplenishment(tenant_id: string, product_id: string, location_id: string) {
    const level = await this.prisma.stock_levels.findUnique({
      where: {
        location_id_product_id_department_id: {
          location_id: location_id,
          product_id: product_id,
          department_id: null as any,
        },
      },
    });

    if (!level) return null;

    const dailyDemand = await this.forecaster.getForecast(tenant_id, product_id, location_id);
    
    // Default safety stock: 7 days of demand (if forecasting enabled)
    // If dailyDemand is 0, we use static reorder points from the StockLevel
    if (dailyDemand > 0) {
      const runwayDays = Number(level.available) / dailyDemand;
      const safetyThresholdDays = 7; 

      if (runwayDays < safetyThresholdDays) {
        const suggestQty = Math.ceil(dailyDemand * 14); // Restock for 14 days
        
        return {
          product_id,
          location_id,
          currentAvailable: level.available,
          dailyDemand: dailyDemand.toFixed(2),
          runwayDays: runwayDays.toFixed(1),
          recommendedQty: suggestQty,
          reason: `LOW_RUNWAY: ${runwayDays.toFixed(1)} days left (Target: ${safetyThresholdDays})`,
        };
      }
    } else if (level.available <= level.min_buffer) {
      // Static reorder point fallback
      return {
        product_id,
        location_id,
        currentAvailable: level.available,
        dailyDemand: 0,
        runwayDays: 'INF',
        recommendedQty: Number((level as any).maxCapacity || 0) - Number(level.available),
        reason: `BUFFER_VIOLATION: Available ${level.available} <= Min ${level.min_buffer}`,
      };
    }

    return null;
  }
}
