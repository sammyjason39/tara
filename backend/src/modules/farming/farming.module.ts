import { Module } from '@nestjs/common';
import { FarmingService } from './farming.service';
import { FarmingController } from './farming.controller';
import { FarmingRepository } from './repositories/farming.repository';
import { FarmingDbRepository } from './repositories/farming.db.repository';
import { IoTGatewayService } from './iot-gateway.service';
import { FarmingMissionService } from './farming-mission.service';
import { SensorThresholdListener } from './listeners/sensor-threshold.listener';

@Module({
  imports: [],
  providers: [
    FarmingService,
    IoTGatewayService,
    FarmingMissionService,
    SensorThresholdListener,
    {
      provide: 'ISensorRepository',
      useClass: FarmingDbRepository,
    },
  ],
  controllers: [FarmingController],
  exports: [FarmingService, IoTGatewayService, FarmingMissionService],
})
export class FarmingModule {}
