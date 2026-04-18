import { Module } from '@nestjs/common';
import { FnbService } from './fnb.service';
import { FnbController } from './fnb.controller';
import { FnbRepository } from './repositories/fnb.repository';
import { FnbDbRepository } from './repositories/fnb.db.repository';
import { InventoryModule } from '../../core/inventory/inventory.module';

@Module({
  imports: [InventoryModule],
  providers: [
    FnbService,
    {
      provide: 'IFnbRepository',
      useClass: FnbDbRepository,
    },
  ],
  controllers: [FnbController],
  exports: [FnbService],
})
export class FnbModule {}
