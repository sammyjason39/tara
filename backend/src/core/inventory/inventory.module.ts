import { Module } from '@nestjs/common';
import { useDbPersistence } from '../../shared/persistence.mode';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';
import { InventoryDbRepository } from './repositories/inventory.db.repository';
import { InventoryMockRepository } from './repositories/inventory.mock.repository';
import { IInventoryRepository } from './repositories/inventory.repository.interface';

@Module({
  controllers: [InventoryController],
  providers: [
    InventoryService,
    {
      provide: IInventoryRepository,
      useClass: useDbPersistence() ? InventoryDbRepository : InventoryMockRepository,
    },
  ],
  exports: [InventoryService],
})
export class InventoryModule {}

