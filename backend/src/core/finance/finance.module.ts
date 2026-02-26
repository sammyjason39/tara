import { Module } from "@nestjs/common";
import { FinanceController } from "./finance.controller";
import { FinanceService } from "./finance.service";
import { IFinanceRepository } from "./repositories/finance.repository.interface";
import { FinanceMockRepository } from "./repositories/finance.mock.repository";
import { FinanceDbRepository } from "./repositories/finance.db.repository";
import { useDbPersistence } from "../../shared/persistence.mode";
import { AuditModule } from "../../shared/audit/audit.module";
import { FileProcessingModule } from "../../shared/file-processing/file-processing.module";

/**
 * Finance Module
 * Core module for financial operations
 *
 * In DEV_MOCK_MODE: Uses FinanceMockRepository
 * In PRODUCTION: Will use real database repository (swap provider)
 */
@Module({
  imports: [AuditModule, FileProcessingModule],
  controllers: [FinanceController],
  providers: [
    FinanceService,
    {
      provide: IFinanceRepository,
      useClass: useDbPersistence()
        ? FinanceDbRepository
        : FinanceMockRepository,
    },
  ],
  exports: [FinanceService], // Export for cross-module usage
})
export class FinanceModule {}
