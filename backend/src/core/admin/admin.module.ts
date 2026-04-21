import { Module } from "@nestjs/common";
import { useDbPersistence } from "../../shared/persistence.mode";
import { AdminController } from "./admin.controller";
import { AdminService } from "./admin.service";
import { IAdminRepository } from "./repositories/admin.repository.interface";
import { AdminPrismaRepository } from "./repositories/admin.prisma.repository";
import { MaintenanceModule } from "../../shared/maintenance/maintenance.module";

@Module({
  imports: [MaintenanceModule],
  controllers: [AdminController],
  providers: [
    AdminService,
    {
      provide: IAdminRepository,
      useClass: AdminPrismaRepository,
    },
  ],
  exports: [AdminService],
})
export class AdminModule {}
