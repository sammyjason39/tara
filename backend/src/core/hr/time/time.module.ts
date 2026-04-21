import { Module, forwardRef } from '@nestjs/common';
import { EventsModule } from '../../../shared/events/events.module';
import { HRModule } from '../hr.module';
import { TimeAndAttendanceController } from './time.controller';
import { AttendanceDeviceController } from './device.controller';
import { TimeAndAttendanceService } from './time.service';

@Module({
  imports: [
    EventsModule,
    forwardRef(() => HRModule),
  ],
  controllers: [TimeAndAttendanceController, AttendanceDeviceController],
  providers: [TimeAndAttendanceService],
  exports: [TimeAndAttendanceService],
})
export class TimeAndAttendanceModule {}
