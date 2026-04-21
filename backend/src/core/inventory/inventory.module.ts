import { Module } from "@nestjs/common";
import { InventoryController } from "./inventory.controller";
import { InventoryService } from "./inventory.service";
import { IInventoryRepository } from "./repositories/inventory.repository.interface";
import { InventoryDbRepository } from "./repositories/inventory.db.repository";
import { WarehouseDbRepository } from "./repositories/warehouse.db.repository";
import { IWarehouseRepository } from "./repositories/interfaces/warehouse.repository.interface";
import { SkuGeneratorService } from "./sku-generator.service";
import { LabelTemplateService } from "./label-template.service";
import { WarehouseService } from "./warehouse.service";
import { WarehouseController } from "./warehouse.controller";
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

import { InventoryCleanupService } from "./inventory-cleanup.service";
import { InventoryEdgeController } from "./controllers/inventory-edge.controller";

@Module({
  imports: [PersistenceModule, FileProcessingModule, AuditModule, InventoryAgentModule],
  controllers: [InventoryController, WarehouseController, InventoryEdgeController],
  providers: [
    InventoryService,
    WarehouseService,
    SkuGeneratorService,
    LabelTemplateService,
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
    {
      provide: IWarehouseRepository,
      useClass: WarehouseDbRepository,
    },
  ],
  exports: [
    InventoryService,
    SkuGeneratorService,
    LabelTemplateService,
    IInventoryRepository,
  ],
})
export class InventoryModule {}
