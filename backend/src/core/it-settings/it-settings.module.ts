import { Module } from '@nestjs/common';
import { ITSettingsController } from './it-settings.controller';
import { ITSettingsService } from './it-settings.service';
import { IITSettingsRepository } from './repositories/it-settings.repository.interface';
import { ITSettingsMockRepository } from './repositories/it-settings.mock.repository';
import { ITSettingsDbRepository } from './repositories/it-settings.db.repository';
import { useDbPersistence } from '../../shared/persistence.mode';

@Module({
  controllers: [ITSettingsController],
  providers: [
    ITSettingsService,
    {
      provide: IITSettingsRepository,
      useClass: useDbPersistence() ? ITSettingsDbRepository : ITSettingsMockRepository,
    },
  ],
  exports: [ITSettingsService],
})
export class ITSettingsModule {}
