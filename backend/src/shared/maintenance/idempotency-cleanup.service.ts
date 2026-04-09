import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../persistence/prisma.service';

@Injectable()
export class IdempotencyCleanupService {
  private readonly logger = new Logger(IdempotencyCleanupService.name);

  constructor(private readonly prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_HOUR)
  async handleCleanup() {
    this.logger.log('Starting idempotency key cleanup worker...');
    
    try {
      const now = new Date(); // Added 'now' variable
      // PHASE 2: Short grace period (5 minutes) to avoid collisions with in-flight retries
      const gracePeriodThreshold = new Date(now.getTime() - 5 * 60 * 1000);
      const result = await this.prisma.sysIdempotencyKey.deleteMany({
        where: {
          expiresAt: {
            lt: gracePeriodThreshold,
          },
          status: { not: 'PENDING' }, // NEVER delete in-flight requests even if expired
        },
      });

      this.logger.log(`Cleanup complete. Removed ${result.count} expired idempotency keys.`);
    } catch (error) {
      this.logger.error('Failed to cleanup idempotency keys:', error.stack);
    }
  }
}
