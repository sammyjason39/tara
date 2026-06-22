import { Module } from "@nestjs/common";
import { useDbPersistence } from "../../shared/persistence.mode";
import { PrismaService } from "../../persistence/prisma.service";
import { ScopeModule } from "../../shared/scope/scope.module";
import { AtomicOperationModule } from "../shared/atomic";
import { ProcurementController } from "./procurement.controller";
import { ProcurementService } from "./procurement.service";
import { ProcurementDbRepository } from "./repositories/procurement.db.repository";
import { ProcurementMockRepository } from "./repositories/procurement.mock.repository";
import { IProcurementRepository } from "./repositories/procurement.repository.interface";

@Module({
  imports: [ScopeModule, AtomicOperationModule],
  controllers: [ProcurementController],
  providers: [
    PrismaService,
    ProcurementService,
    {
      provide: IProcurementRepository,
      useClass: useDbPersistence()
        ? ProcurementDbRepository
        : ProcurementMockRepository,
    },
  ],
  exports: [ProcurementService],
})
export class ProcurementModule {}
