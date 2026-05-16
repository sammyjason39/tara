import { Module } from "@nestjs/common";
import { InventoryController } from "./inventory.controller";
import { InventoryService } from "./inventory.service";
import { IInventoryRepository } from "./repositories/inventory.repository.interface";
import { InventoryDbRepository } from "./repositories/inventory.db.repository";
import { SkuGeneratorService } from "./sku-generator.service";
import { LabelTemplateService } from "./label-template.service";
import { ItemImageService } from "./item-image.service";
import { PrismaService } from "../../persistence/prisma.service";
import { InventoryRolesGuard } from "./guards/inventory-roles.guard";
import { PersistenceModule } from "../../persistence/persistence.module";
import { FileProcessingModule } from "../../shared/file-processing/file-processing.module";
import { AuditModule } from "../../shared/audit/audit.module";
import { RetailListener } from "./listeners/retail.listener";
import { ProcurementListener } from "./listeners/procurement.listener";
import { ITDeviceListener } from "./listeners/it-device.listener";
import { InventoryEventListener } from "./listeners/inventory-event.listener";
import { InventoryAgentModule } from "../../agentic/inventory/inventory-agent.module";
import { ExplorerModule } from "../explorer/explorer.module";


import { InventoryCleanupService } from "./inventory-cleanup.service";
import { InventoryEdgeController } from "./controllers/inventory-edge.controller";
import { ProcurementModule } from "../procurement/procurement.module";

@Module({
  imports: [PersistenceModule, FileProcessingModule, AuditModule, InventoryAgentModule, ProcurementModule, ExplorerModule],
  controllers: [InventoryController, InventoryEdgeController],
  providers: [
    InventoryService,
    SkuGeneratorService,
    LabelTemplateService,
    ItemImageService,
    InventoryCleanupService,
    PrismaService,
    InventoryRolesGuard,
    RetailListener,
    ProcurementListener,
    ITDeviceListener,
    InventoryEventListener,
    {
      provide: IInventoryRepository,
      useClass: InventoryDbRepository,
    },
  ],
  exports: [
    InventoryService,
    SkuGeneratorService,
    LabelTemplateService,
    ItemImageService,
    IInventoryRepository,
  ],
})
export class InventoryModule {}
