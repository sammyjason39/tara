import { Global, Module } from '@nestjs/common';
import { EventBusService } from './event-bus.service';
import { LocalEmitterService } from './local-emitter.service';
import { EventsController } from './events.controller';

@Global()
@Module({
  controllers: [EventsController],
  providers: [EventBusService, LocalEmitterService],
  exports: [EventBusService, LocalEmitterService],
})
export class EventsModule {}
