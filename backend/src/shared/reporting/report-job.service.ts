import { Injectable, Logger } from '@nestjs/common';
import { IReportRepository } from './repositories/report.repository.interface';
import { sys_report_jobs } from '@prisma/client';

@Injectable()
export class ReportJobService {
  private readonly logger = new Logger(ReportJobService.name);

  constructor(private readonly repository: IReportRepository) {}

  async createJob(tenant_id: string, user_id: string, report_type: string, format: string, payload?: any) {
    this.logger.log(`Creating ${format} report job [${report_type}] for user ${user_id}`);
    return this.repository.createJob({
      tenant_id,
      user_id,
      report_type,
      format,
      payload
    });
  }

  async getJobStatus(id: string): Promise<sys_report_jobs | null> {
    return this.repository.getJob(id);
  }

  async updateProgress(id: string, progress: number, status: string = 'PROCESSING') {
    return this.repository.updateJob(id, { 
      progress, 
      status,
      last_progress_at: new Date()
    });
  }

  async completeJob(id: string, file_path: string) {
    return this.repository.updateJob(id, { 
      status: 'COMPLETED', 
      progress: 100, 
      file_path 
    });
  }

  async failJob(id: string, error_message: string) {
    return this.repository.updateJob(id, { 
      status: 'FAILED', 
      error_message 
    });
  }

  async getJobSafe(id: string, tenant_id: string, user_id: string, isPlatformAdmin: boolean = false): Promise<sys_report_jobs | null> {
    const job = await this.repository.getJob(id);
    if (!job) return null;
    
    if (!isPlatformAdmin && (job.tenant_id !== tenant_id || job.user_id !== user_id)) {
      this.logger.warn(`Unauthorized access attempt for report job ${id} by user ${user_id}`);
      return null;
    }
    
    return job;
  }

  async retryJob(id: string, tenant_id: string, user_id: string) {
    const job = await this.getJobSafe(id, tenant_id, user_id);
    if (!job) return null;

    if (job.status !== 'FAILED') {
      throw new Error('Only failed jobs can be retried');
    }

    return this.repository.updateJob(id, {
      status: 'PENDING',
      progress: 0,
      error_message: null
    });
  }

  async cleanupStaleJobs(ageInMinutes: number = 15) {
    const staleJobs = await this.repository.getStaleJobs(ageInMinutes);
    if (staleJobs.length === 0) return;

    this.logger.log(`Cleaning up ${staleJobs.length} stale report jobs...`);
    for (const job of staleJobs) {
      await this.failJob(job.id, `Job timed out after ${ageInMinutes} minutes of inactivity.`);
    }
  }
}
