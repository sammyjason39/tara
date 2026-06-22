import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../persistence/prisma.service';
import { IReportRepository } from './report.repository.interface';
import { sys_report_jobs } from '@prisma/client';
import { PaginationParams } from '../../pipes/pagination.pipe';

@Injectable()
export class ReportPrismaRepository extends IReportRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async createJob(data: {
    tenant_id: string;
    user_id: string;
    report_type: string;
    format: string;
    payload?: any;
  }): Promise<sys_report_jobs> {
    return this.prisma.sys_report_jobs.create({
      data: {
        tenant_id: data.tenant_id,
        user_id: data.user_id,
        report_type: data.report_type,
        format: data.format,
        payload: data.payload || {},
        status: 'PENDING',
        progress: 0,
      },
    });
  }

  async updateJob(
    id: string,
    data: Partial<Pick<sys_report_jobs, 'status' | 'progress' | 'file_path' | 'error_message' | 'last_progress_at'>>
  ): Promise<sys_report_jobs> {
    return this.prisma.sys_report_jobs.update({
      where: { id },
      data: {
        ...data,
        updated_at: new Date(),
      },
    });
  }

  async getJob(id: string): Promise<sys_report_jobs | null> {
    return this.prisma.sys_report_jobs.findUnique({
      where: { id },
    });
  }

  async getPendingJobs(pagination?: PaginationParams): Promise<sys_report_jobs[]> {
    const page = pagination?.page ?? 1;
    const pageSize = pagination?.pageSize ?? 50;
    const skip = (page - 1) * pageSize;

    return this.prisma.sys_report_jobs.findMany({
      where: { status: 'PENDING' },
      orderBy: { created_at: 'asc' },
      skip,
      take: pageSize,
    });
  }

  async getStaleJobs(ageInMinutes: number, pagination?: PaginationParams): Promise<sys_report_jobs[]> {
    const page = pagination?.page ?? 1;
    const pageSize = pagination?.pageSize ?? 50;
    const skip = (page - 1) * pageSize;
    const cutoff = new Date(Date.now() - ageInMinutes * 60000);

    return this.prisma.sys_report_jobs.findMany({
      where: {
        status: 'PROCESSING',
        last_progress_at: { lt: cutoff },
      },
      skip,
      take: pageSize,
    });
  }
}
