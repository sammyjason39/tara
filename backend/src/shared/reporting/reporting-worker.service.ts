import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ReportJobService } from './report-job.service';
import { ReportingService } from './reporting.service';
import { IReportRepository } from './repositories/report.repository.interface';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class ReportingWorkerService implements OnModuleInit {
  private readonly logger = new Logger(ReportingWorkerService.name);
  private readonly storagePath = path.join(process.cwd(), 'storage', 'reports');

  constructor(
    private readonly repository: IReportRepository,
    private readonly jobService: ReportJobService,
    private readonly reportingService: ReportingService,
  ) {}

  onModuleInit() {
    if (!fs.existsSync(this.storagePath)) {
      fs.mkdirSync(this.storagePath, { recursive: true });
      this.logger.log(`Created report storage directory at ${this.storagePath}`);
    }
  }

  /**
   * Background Processor for Report Jobs
   * Runs every minute to poll for PENDING jobs.
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async processJobs() {
    // 1. Cleanup stale jobs first
    await this.jobService.cleanupStaleJobs(15);

    const pendingJobs = await this.repository.getPendingJobs();
    if (pendingJobs.length === 0) return;

    this.logger.log(`Found ${pendingJobs.length} pending report jobs. Processing...`);

    for (const job of pendingJobs) {
      try {
        await this.jobService.updateProgress(job.id, 10, 'PROCESSING');
        
        let buffer: Buffer;
        const filename = `${job.report_type.toLowerCase()}_${job.id}.${job.format.toLowerCase()}`;
        const fullPath = path.join(this.storagePath, filename);

        // Simulated data retrieval based on report type
        // In a real scenario, this would call specialized services
        const mockData = [
          { id: '1', date: new Date().toISOString(), detail: 'Sample Report Entry A' },
          { id: '2', date: new Date().toISOString(), detail: 'Sample Report Entry B' },
        ];
        const headers = ['ID', 'Date', 'Detail'];

        await this.jobService.updateProgress(job.id, 40);

        if (job.format === 'PDF') {
          buffer = await this.reportingService.generatePdf(job.report_type, headers, mockData);
        } else {
          buffer = await this.reportingService.generateExcel(job.report_type, headers, mockData);
        }

        await this.jobService.updateProgress(job.id, 80);

        fs.writeFileSync(fullPath, buffer);
        
        await this.jobService.completeJob(job.id, fullPath);
        this.logger.log(`Successfully completed report job ${job.id}. Saved to ${fullPath}`);
      } catch (error) {
        this.logger.error(`[BACKGROUND_REPORT_FAILURE] Module: REPORTING | Job: ${job.id} | Tenant: ${job.tenant_id} | Error: ${error.message}`, error.stack);
        await this.jobService.failJob(job.id, `Worker Processing Error: ${error.message}`);
      }
    }
  }
}
