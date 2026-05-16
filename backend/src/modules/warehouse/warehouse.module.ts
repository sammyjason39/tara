import { Module } from "@nestjs/common";
import { WarehouseController } from "./warehouse.controller";
import { WarehouseService } from "./warehouse.service";
import { IWarehouseRepository } from "./repositories/interfaces/warehouse.repository.interface";
import { WarehouseDbRepository } from "./repositories/warehouse.db.repository";
import { PrismaService } from "../../persistence/prisma.service";
import { PersistenceModule } from "../../persistence/persistence.module";

@Module({
  imports: [PersistenceModule],
  controllers: [WarehouseController],
  providers: [
    WarehouseService,
    PrismaService,
    {
      provide: IWarehouseRepository,
      useClass: WarehouseDbRepository,
    },
  ],
  exports: [WarehouseService, IWarehouseRepository],
})
export class WarehouseModule {}
