import { Injectable, Logger, Inject, OnModuleInit } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import { PrismaService } from '../../../persistence/prisma.service';
import { EventBusService } from './event-bus.service';
import { SystemSettingsService } from './system-settings.service';

/**
 * Interface for the AWS Device API client.
 *
 * This is an injectable abstraction since the real AWS device API
 * is not available during development. Consumers can provide a stub
 * or real implementation via the AWS_DEVICE_API_CLIENT injection token.
 *
 * Each record returned represents a single attendance punch (clock-in or clock-out)
 * from an AWS fingerprint device.
 */
export interface AwsDeviceApiClient {
  /**
   * Fetch attendance records from the AWS device API.
   * @param since - ISO timestamp; fetch records after this time
   * @returns Array of raw attendance records from AWS devices
   */
  fetchAttendanceRecords(since: string): Promise<AwsAttendanceRecord[]>;
}

export interface AwsAttendanceRecord {
  aws_employee_id: string;
  aws_device_id: string;
  timestamp: string;
  device_location?: string;
}

export const AWS_DEVICE_API_CLIENT = Symbol('AWS_DEVICE_API_CLIENT');

/**
 * Stub implementation of the AWS Device API Client.
 * Returns an empty array — used when no real API is available.
 */
@Injectable()
export class StubAwsDeviceApiClient implements AwsDeviceApiClient {
  async fetchAttendanceRecords(_since: string): Promise<AwsAttendanceRecord[]> {
    return [];
  }
}

export interface BatchSyncResult {
  total: number;
  success: number;
  failed: number;
  skipped: number;
  errors: Array<{ aws_employee_id: string; reason: string }>;
  startedAt: Date;
  completedAt: Date;
}

/**
 * AWS Device Batch Sync Service
 *
 * Periodically pulls attendance records from the AWS device API and
 * processes them through the same mapping/validation pipeline used by
 * the webhook receiver. Uses $transaction for batch safety.
 *
 * The sync interval is configurable via SystemSettings (key: aws_batch_sync_interval_minutes)
 * with a valid range of 15–1440 minutes (15 min to 24 hr).
 *
 * Requirements: 24.2
 * Task: 24.3
 */
@Injectable()
export class AwsDeviceBatchSyncService implements OnModuleInit {
  private readonly logger = new Logger(AwsDeviceBatchSyncService.name);
  private static readonly SYNC_INTERVAL_KEY = 'aws_batch_sync_interval_minutes';
  private static readonly LAST_SYNC_KEY = 'aws_batch_sync_last_run';
  private static readonly CRON_JOB_NAME = 'aws-batch-sync';
  private static readonly DEFAULT_INTERVAL_MINUTES = 60;
  private static readonly MIN_INTERVAL_MINUTES = 15;
  private static readonly MAX_INTERVAL_MINUTES = 1440; // 24 hours

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventBusService: EventBusService,
    private readonly systemSettingsService: SystemSettingsService,
    private readonly schedulerRegistry: SchedulerRegistry,
    @Inject(AWS_DEVICE_API_CLIENT)
    private readonly apiClient: AwsDeviceApiClient,
  ) {}

  /**
   * Bootstrap: register the initial cron job on module init.
   * Defaults to every 60 minutes. HR_Team can change interval via settings.
   */
  async onModuleInit(): Promise<void> {
    if (this.schedulerRegistry.doesExist('cron', AwsDeviceBatchSyncService.CRON_JOB_NAME)) {
      this.logger.log('AWS batch sync cron already registered — skipping duplicate init');
      return;
    }

    const intervalMinutes = await this.getConfiguredInterval();
    this.registerCronJob(intervalMinutes);
    this.logger.log(
      `AWS batch sync initialized with interval: ${intervalMinutes} minutes`,
    );
  }

  /**
   * Re-configure the sync interval at runtime. Called when HR_Team
   * updates the aws_batch_sync_interval_minutes setting.
   */
  async updateSyncInterval(minutes: number): Promise<void> {
    const clamped = Math.max(
      AwsDeviceBatchSyncService.MIN_INTERVAL_MINUTES,
      Math.min(AwsDeviceBatchSyncService.MAX_INTERVAL_MINUTES, minutes),
    );

    // Remove old job and register new one
    this.removeCronJob();
    this.registerCronJob(clamped);
    this.logger.log(`AWS batch sync interval updated to ${clamped} minutes`);
  }

  /**
   * Execute a full batch sync cycle.
   * Can be invoked by the cron job or manually by HR_Team.
   */
  async executeBatchSync(): Promise<BatchSyncResult> {
    const startedAt = new Date();
    this.logger.log('Starting AWS device batch sync...');

    const result: BatchSyncResult = {
      total: 0,
      success: 0,
      failed: 0,
      skipped: 0,
      errors: [],
      startedAt,
      completedAt: startedAt,
    };

    try {
      // Determine "since" timestamp from last successful sync
      const since = await this.getLastSyncTimestamp();

      // Fetch records from the AWS device API
      const records = await this.apiClient.fetchAttendanceRecords(since);
      result.total = records.length;

      if (records.length === 0) {
        this.logger.log('No new records from AWS device API');
        result.completedAt = new Date();
        await this.saveLastSyncTimestamp(result.completedAt);
        await this.logSyncResult(result);
        return result;
      }

      // Process records within a transaction for batch safety
      await this.prisma.$transaction(async (tx) => {
        for (const record of records) {
          try {
            await this.processRecord(tx, record, result);
          } catch (err: any) {
            result.failed++;
            result.errors.push({
              aws_employee_id: record.aws_employee_id,
              reason: err.message || 'Unknown error',
            });
            this.logger.warn(
              `Failed to process record for aws_employee_id=${record.aws_employee_id}: ${err.message}`,
            );
          }
        }
      });

      result.completedAt = new Date();
      await this.saveLastSyncTimestamp(result.completedAt);
    } catch (err: any) {
      this.logger.error(`Batch sync failed: ${err.message}`, err.stack);
      result.completedAt = new Date();
    }

    await this.logSyncResult(result);
    this.logger.log(
      `Batch sync completed: total=${result.total}, success=${result.success}, failed=${result.failed}, skipped=${result.skipped}`,
    );

    return result;
  }

  /**
   * Process a single attendance record from the batch.
   * Reuses the same validation pipeline as the webhook:
   * 1. Look up employee mapping
   * 2. Validate mapping is active
   * 3. Validate timestamp
   * 4. Emit event to Event Bus
   */
  private async processRecord(
    tx: any,
    record: AwsAttendanceRecord,
    result: BatchSyncResult,
  ): Promise<void> {
    // Step 1: Look up the employee mapping
    const mapping = await tx.aWSDeviceMapping.findUnique({
      where: { aws_employee_id: record.aws_employee_id },
    });

    if (!mapping) {
      result.skipped++;
      result.errors.push({
        aws_employee_id: record.aws_employee_id,
        reason: `No mapping found for aws_employee_id: ${record.aws_employee_id}`,
      });
      return;
    }

    // Step 2: Check if the mapping is active
    if (!mapping.is_active) {
      result.skipped++;
      result.errors.push({
        aws_employee_id: record.aws_employee_id,
        reason: `Mapping for aws_employee_id ${record.aws_employee_id} is inactive`,
      });
      return;
    }

    // Step 3: Validate timestamp
    const parsedTimestamp = new Date(record.timestamp);
    if (isNaN(parsedTimestamp.getTime())) {
      result.failed++;
      result.errors.push({
        aws_employee_id: record.aws_employee_id,
        reason: `Invalid timestamp format: ${record.timestamp}`,
      });
      return;
    }

    // Step 4: Emit event to Event Bus for downstream processing
    await this.eventBusService.emit({
      event_type: 'attendance.aws_device_received',
      event_version: '1.0',
      event_timestamp: new Date(),
      actor: {
        id: mapping.tara_employee_id,
        type: 'system',
      },
      entity: {
        id: mapping.tara_employee_id,
        type: 'attendance',
      },
      payload: {
        aws_employee_id: record.aws_employee_id,
        aws_device_id: record.aws_device_id,
        tara_employee_id: mapping.tara_employee_id,
        timestamp: parsedTimestamp.toISOString(),
        device_location: record.device_location ?? null,
        source: 'batch_sync',
      },
    });

    result.success++;
  }

  /**
   * Get the configured sync interval from SystemSettings.
   * Falls back to default (60 minutes) if not configured.
   */
  async getConfiguredInterval(): Promise<number> {
    try {
      const setting = await this.systemSettingsService.getByKey(
        AwsDeviceBatchSyncService.SYNC_INTERVAL_KEY,
      );
      const minutes = Number(setting.setting_value);
      if (
        isNaN(minutes) ||
        minutes < AwsDeviceBatchSyncService.MIN_INTERVAL_MINUTES ||
        minutes > AwsDeviceBatchSyncService.MAX_INTERVAL_MINUTES
      ) {
        return AwsDeviceBatchSyncService.DEFAULT_INTERVAL_MINUTES;
      }
      return minutes;
    } catch {
      // Setting not found — use default
      return AwsDeviceBatchSyncService.DEFAULT_INTERVAL_MINUTES;
    }
  }

  /**
   * Get the timestamp of the last successful sync.
   * Defaults to 24 hours ago if never synced.
   */
  private async getLastSyncTimestamp(): Promise<string> {
    try {
      const setting = await this.systemSettingsService.getByKey(
        AwsDeviceBatchSyncService.LAST_SYNC_KEY,
      );
      return setting.setting_value as string;
    } catch {
      // Default to 24 hours ago
      const yesterday = new Date();
      yesterday.setHours(yesterday.getHours() - 24);
      return yesterday.toISOString();
    }
  }

  /**
   * Persist the last sync timestamp in SystemSettings.
   */
  private async saveLastSyncTimestamp(timestamp: Date): Promise<void> {
    try {
      await this.systemSettingsService.upsert({
        setting_key: AwsDeviceBatchSyncService.LAST_SYNC_KEY,
        setting_value: timestamp.toISOString(),
        setting_category: 'aws_integration',
        description: 'Timestamp of last successful AWS batch sync',
      });
    } catch (err: any) {
      this.logger.warn(`Failed to save last sync timestamp: ${err.message}`);
    }
  }

  /**
   * Log the sync result to the Event Bus for audit purposes.
   */
  private async logSyncResult(result: BatchSyncResult): Promise<void> {
    try {
      await this.eventBusService.emit({
        event_type: 'aws_device.batch_sync_completed',
        event_version: '1.0',
        event_timestamp: new Date(),
        actor: { id: 'system', type: 'system' },
        entity: { id: 'aws_batch_sync', type: 'integration' },
        payload: {
          total: result.total,
          success: result.success,
          failed: result.failed,
          skipped: result.skipped,
          duration_ms:
            result.completedAt.getTime() - result.startedAt.getTime(),
          errors: result.errors.slice(0, 20), // Limit logged errors
        },
      });
    } catch (err: any) {
      this.logger.warn(`Failed to log sync result: ${err.message}`);
    }
  }

  /**
   * Register a cron job with the given interval in minutes.
   */
  private registerCronJob(intervalMinutes: number): void {
    const cronExpression = `*/${intervalMinutes} * * * *`;
    const job = new CronJob(cronExpression, () => {
      this.executeBatchSync().catch((err) => {
        this.logger.error(`Scheduled batch sync failed: ${err.message}`);
      });
    });

    this.schedulerRegistry.addCronJob(
      AwsDeviceBatchSyncService.CRON_JOB_NAME,
      job as any,
    );
    job.start();
  }

  /**
   * Remove the existing cron job (if any) before re-registering.
   */
  private removeCronJob(): void {
    try {
      this.schedulerRegistry.deleteCronJob(
        AwsDeviceBatchSyncService.CRON_JOB_NAME,
      );
    } catch {
      // Job doesn't exist yet — that's fine
    }
  }
}
