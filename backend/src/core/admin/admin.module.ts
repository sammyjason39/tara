import { Module } from '@nestjs/common';
import { useDbPersistence } from '../../shared/persistence.mode';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { IAdminRepository } from './repositories/admin.repository.interface';
import { AdminDbRepository } from './repositories/admin.db.repository';
import { AdminMockRepository } from './repositories/admin.mock.repository';

@Module({
  controllers: [AdminController],
  providers: [
    AdminService,
    {
      provide: IAdminRepository,
      useClass: useDbPersistence() ? AdminDbRepository : AdminMockRepository,
    },
  ],
  exports: [AdminService],
})
export class AdminModule {}

