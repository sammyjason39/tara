import { Module } from '@nestjs/common';
import { useDbPersistence } from '../../shared/persistence.mode';
import { SalesController } from './sales.controller';
import { SalesService } from './sales.service';
import { SalesDbRepository } from './repositories/sales.db.repository';
import { SalesMockRepository } from './repositories/sales.mock.repository';
import { ISalesRepository } from './repositories/sales.repository.interface';

@Module({
  controllers: [SalesController],
  providers: [
    SalesService,
    {
      provide: ISalesRepository,
      useClass: useDbPersistence() ? SalesDbRepository : SalesMockRepository,
    },
  ],
  exports: [SalesService],
})
export class SalesModule {}
