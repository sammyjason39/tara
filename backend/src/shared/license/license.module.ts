import { Module, Global } from '@nestjs/common';
import { LicenseService } from './license.service';
import { LicenseController } from './license.controller';
import { LicenseGuard } from './license.guard';
import { PersistenceModule } from '../../persistence/persistence.module';

@Global()
@Module({
  imports: [PersistenceModule],
  providers: [LicenseService, LicenseGuard],
  controllers: [LicenseController],
  exports: [LicenseService, LicenseGuard],
})
export class LicenseModule {}
