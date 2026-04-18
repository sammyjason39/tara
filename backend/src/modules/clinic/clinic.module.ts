import { Module } from '@nestjs/common';
import { ClinicService } from './clinic.service';
import { ClinicController } from './clinic.controller';
import { ClinicRepository } from './repositories/clinic.repository';
import { ClinicDbRepository } from './repositories/clinic.db.repository';

@Module({
  imports: [],
  providers: [
    ClinicService,
    {
      provide: ClinicRepository,
      useClass: ClinicDbRepository,
    },
  ],
  controllers: [ClinicController],
  exports: [ClinicService],
})
export class ClinicModule {}
