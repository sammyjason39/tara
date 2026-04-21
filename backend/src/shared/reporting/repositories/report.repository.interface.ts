import { sys_report_jobs } from '@prisma/client';

export abstract class IReportRepository {
  abstract createJob(data: {
    tenant_id: string;
    user_id: string;
    report_type: string;
    format: string;
    payload?: any;
  }): Promise<sys_report_jobs>;

  abstract updateJob(
    id: string,
    data: Partial<Pick<sys_report_jobs, 'status' | 'progress' | 'file_path' | 'error_message' | 'last_progress_at'>>
  ): Promise<sys_report_jobs>;

  abstract getJob(id: string): Promise<sys_report_jobs | null>;

  abstract getPendingJobs(): Promise<sys_report_jobs[]>;
  abstract getStaleJobs(ageInMinutes: number): Promise<sys_report_jobs[]>;
}
