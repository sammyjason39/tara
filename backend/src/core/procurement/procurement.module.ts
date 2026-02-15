import { Module } from '@nestjs/common';
import { useDbPersistence } from '../../shared/persistence.mode';
import { ProcurementController } from './procurement.controller';
import { ProcurementService } from './procurement.service';
import { ProcurementDbRepository } from './repositories/procurement.db.repository';
import { ProcurementMockRepository } from './repositories/procurement.mock.repository';
import { IProcurementRepository } from './repositories/procurement.repository.interface';

@Module({
  controllers: [ProcurementController],
  providers: [
    ProcurementService,
    {
      provide: IProcurementRepository,
      useClass: useDbPersistence() ? ProcurementDbRepository : ProcurementMockRepository,
    },
  ],
  exports: [ProcurementService],
})
export class ProcurementModule {}

