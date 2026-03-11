import { Module } from "@nestjs/common";
import { PersistenceModule } from "../../persistence/persistence.module";
import { InventoryController } from "./inventory.controller";
import { InventoryService } from "./inventory.service";
import { SkuGeneratorService } from "./sku-generator.service";
import { LabelTemplateService } from "./label-template.service";
import { InventoryDbRepository } from "./repositories/inventory.db.repository";
import { IInventoryRepository } from "./repositories/inventory.repository.interface";
import { FileProcessingModule } from "../../shared/file-processing/file-processing.module";
import { AuditModule } from "../../shared/audit/audit.module";
import { PrismaService } from "../../persistence/prisma.service";

@Module({
  imports: [PersistenceModule, FileProcessingModule, AuditModule],
  controllers: [InventoryController],
  providers: [
    InventoryService,
    SkuGeneratorService,
    LabelTemplateService,
    PrismaService,
    {
      provide: IInventoryRepository,
      useClass: InventoryDbRepository,
    },
  ],
  exports: [InventoryService, SkuGeneratorService, LabelTemplateService],
})
export class InventoryModule {}
