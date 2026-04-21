import { Module } from '@nestjs/common';
import { SettingsController } from './settings.controller';
import { SettingsService } from './settings.service';
import { SettingsDbRepository } from './repositories/settings.db.repository';
import { PersistenceModule } from '../../persistence/persistence.module';
import { AuditModule } from '../../shared/audit/audit.module';

@Module({
  imports: [PersistenceModule, AuditModule],
  controllers: [SettingsController],
  providers: [SettingsService, SettingsDbRepository],
  exports: [SettingsService],
})
export class SettingsModule {}
