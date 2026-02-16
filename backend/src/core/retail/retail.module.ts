import { Module } from '@nestjs/common';
import { RetailController } from './retail.controller';
import { RetailService } from './retail.service';
import { IRetailRepository } from './repositories/retail.repository.interface';
import { RetailMockRepository } from './repositories/retail.mock.repository';

@Module({
  controllers: [RetailController],
  providers: [
    RetailService,
    {
      provide: IRetailRepository,
      useClass: RetailMockRepository,
    },
  ],
  exports: [RetailService],
})
export class RetailModule {}
