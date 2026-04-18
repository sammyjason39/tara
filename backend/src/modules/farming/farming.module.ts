import { Module } from '@nestjs/common';
import { FarmingService } from './farming.service';
import { FarmingController } from './farming.controller';
import { FarmingRepository } from './repositories/farming.repository';
import { FarmingDbRepository } from './repositories/farming.db.repository';
import { IoTGatewayService } from './iot-gateway.service';

@Module({
  imports: [],
  providers: [
    FarmingService,
    IoTGatewayService,
    {
      provide: 'ISensorRepository',
      useClass: FarmingDbRepository,
    },
  ],
  controllers: [FarmingController],
  exports: [FarmingService, IoTGatewayService],
})
export class FarmingModule {}
