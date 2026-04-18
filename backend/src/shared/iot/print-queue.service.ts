import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/persistence/prisma.service';

@Injectable()
export class PrintQueueService {
  private readonly logger = new Logger(PrintQueueService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Queue a print job for an IoT terminal
   */
  async dispatchJob(tenantId: string, deviceId: string, payload: any) {
    this.logger.log(`Dispatching print job for device ${deviceId} in tenant ${tenantId}`);
    
    return await this.prisma.print_job_queue.create({
      data: {
        id: crypto.randomUUID(),
        tenant_id: tenantId,
        device_id: deviceId,
        shift_summary_json: payload,
        status: 'PENDING'
      }
    });
  }

  async getPendingJobs(tenantId: string, deviceId: string) {
    return await this.prisma.print_job_queue.findMany({
      where: { tenant_id: tenantId, device_id: deviceId, status: 'PENDING' }
    });
  }
}
