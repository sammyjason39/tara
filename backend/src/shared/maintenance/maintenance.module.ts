import { Module } from '@nestjs/common';
import { IdempotencyCleanupService } from './idempotency-cleanup.service';
import { OutboxWorkerService } from './outbox-worker.service';
import { MonitoringJobService } from './monitoring-job.service';
import { PersistenceModule } from '../../persistence/persistence.module';

@Module({
  providers: [
    IdempotencyCleanupService, 
    OutboxWorkerService,
    MonitoringJobService
  ],
  exports: [
    IdempotencyCleanupService, 
    OutboxWorkerService,
    MonitoringJobService
  ],
})
export class MaintenanceModule {}
