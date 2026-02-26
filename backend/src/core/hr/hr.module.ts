import { Module } from "@nestjs/common";
import { HRController } from "./hr.controller";
import { HRService } from "./hr.service";
import { IHRRepository } from "./repositories/hr.repository.interface";
import { HRDbRepository } from "./repositories/hr.db.repository";
import { PrismaService } from "../../persistence/prisma.service";

import { FileProcessingModule } from "../../shared/file-processing/file-processing.module";
import { AuditModule } from "../../shared/audit/audit.module";

/**
 * HR Module
 * Core module for Human Resources operations
 */
@Module({
  imports: [FileProcessingModule, AuditModule],
  controllers: [HRController],
  providers: [
    HRService,
    PrismaService,
    {
      provide: IHRRepository,
      useClass: HRDbRepository,
    },
  ],
  exports: [HRService], // Export for cross-module usage
})
export class HRModule {}
