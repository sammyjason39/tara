import { Module } from '@nestjs/common';
import { useDbPersistence } from '../../shared/persistence.mode';
import { MarketingController } from './marketing.controller';
import { MarketingService } from './marketing.service';
import { MarketingDbRepository } from './repositories/marketing.db.repository';
import { MarketingMockRepository } from './repositories/marketing.mock.repository';
import { IMarketingRepository } from './repositories/marketing.repository.interface';

@Module({
  controllers: [MarketingController],
  providers: [
    MarketingService,
    {
      provide: IMarketingRepository,
      useClass: useDbPersistence() ? MarketingDbRepository : MarketingMockRepository,
    },
  ],
  exports: [MarketingService],
})
export class MarketingModule {}

