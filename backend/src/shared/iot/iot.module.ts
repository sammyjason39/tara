import { Module, Global } from '@nestjs/common';
import { IotController } from './iot.controller';
import { PrintQueueService } from './print-queue.service';
import { DevicePairingService } from './device-pairing.service';
import { UniversalIoTService } from './universal-iot.service';
import { IIoTRepository } from './repositories/iot.repository.interface';
import { IoTDbRepository } from './repositories/iot.db.repository';
import { PersistenceModule } from '../../persistence/persistence.module';
import { AuditModule } from '../audit/audit.module';
import { EventsModule } from '../events/events.module';

@Global()
@Module({
  imports: [PersistenceModule, AuditModule, EventsModule],
  controllers: [IotController],
  providers: [
    PrintQueueService,
    DevicePairingService,
    UniversalIoTService,
    {
      provide: IIoTRepository,
      useClass: IoTDbRepository,
    },
  ],
  exports: [UniversalIoTService],
})
export class IotModule {}
