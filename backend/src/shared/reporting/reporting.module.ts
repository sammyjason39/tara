import { Module, Global } from '@nestjs/common';
import { ReportingService } from './reporting.service';
import { ReportJobService } from './report-job.service';
import { ReportingWorkerService } from './reporting-worker.service';
import { ReportingController } from './reporting.controller';
import { IReportRepository } from './repositories/report.repository.interface';
import { ReportPrismaRepository } from './repositories/report.prisma.repository';
import { PersistenceModule } from '../../persistence/persistence.module';

@Global()
@Module({
  imports: [PersistenceModule],
  providers: [
    ReportingService,
    ReportJobService,
    ReportingWorkerService,
    {
      provide: IReportRepository,
      useClass: ReportPrismaRepository,
    },
  ],
  controllers: [ReportingController],
  exports: [ReportingService, ReportJobService],
})
export class ReportingModule {}
