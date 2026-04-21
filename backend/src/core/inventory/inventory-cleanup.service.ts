import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InventoryService } from './inventory.service';

@Injectable()
export class InventoryCleanupService {
  private readonly logger = new Logger(InventoryCleanupService.name);

  constructor(private readonly inventoryService: InventoryService) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async handleExpirationCleanup() {
    this.logger.log('Running automated stock reservation cleanup...');
    try {
      const cleanedCount = await this.inventoryService.cleanupExpiredReservations();
      if (cleanedCount > 0) {
        this.logger.log(`Successfully released ${cleanedCount} expired reservations.`);
      }
    } catch (error) {
      this.logger.error(`Error during reservation cleanup: ${error.message}`);
    }
  }
}
