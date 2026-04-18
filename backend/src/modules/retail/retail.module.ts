import { Module, forwardRef } from "@nestjs/common";
import { AdminModule } from "../../core/admin/admin.module";
import { InventoryModule } from "../../core/inventory/inventory.module";
import { EventsModule } from "../../shared/events/events.module";
import { RetailController } from "./retail.controller";
import { RetailInfrastructureController } from "./retail-infrastructure.controller";
import { RetailPublicGatewayController } from "./retail-public.gateway.controller";
import { RetailPublicAuthController } from "./retail-public-auth.controller";
import { RetailPublicCustomerController } from "./retail-public-customer.controller";
import { RetailEventsController } from "./retail-events.controller";
import { EcommerceHubController } from "./ecommerce-hub.controller";
import { RetailService } from "./retail.service";
import { RetailInfrastructureService } from "./retail-infrastructure.service";
import { RetailGatewayService } from "./retail-gateway.service";
import { RetailPublicAuthService } from "./retail-public-auth.service";
import { RetailPublicCustomerService } from "./retail-public-customer.service";
import { RetailEventsService } from "./retail-events.service";
import { EcommerceHubService } from "./ecommerce-hub.service";
import { IRetailRepository } from "./repositories/retail.repository.interface";
import { RetailMockRepository } from "./repositories/retail.mock.repository";
import { RetailDbRepository } from "./repositories/retail.db.repository";
import { IRetailInfrastructureRepository } from "./repositories/retail-infrastructure.repository.interface";
import { RetailInfrastructureDbRepository } from "./repositories/retail-infrastructure.db.repository";
import { IEcommerceHubRepository } from "./repositories/ecommerce-hub.repository.interface";
import { EcommerceHubDbRepository } from "./repositories/ecommerce-hub.db.repository";
import { ChannelCredentialsGuard } from "./guards/channel-credentials.guard";
import { CustomerAuthGuard } from "./guards/customer-auth.guard";
import { EcommerceConnectorGuard } from "./guards/ecommerce-connector.guard";
import { AuditModule } from "../../shared/audit/audit.module";
import { RetailSeeder } from "./seeders/retail.seeder";

import { PersistenceModule } from "../../persistence/persistence.module";

@Module({
  imports: [
    PersistenceModule,
    AdminModule,
    forwardRef(() => InventoryModule),
    EventsModule,
    AuditModule,
  ],
  controllers: [
    RetailController,
    RetailInfrastructureController,
    RetailPublicGatewayController,
    RetailPublicAuthController,
    RetailPublicCustomerController,
    RetailEventsController,
    EcommerceHubController,
  ],
  providers: [
    RetailService,
    RetailInfrastructureService,
    RetailGatewayService,
    RetailPublicAuthService,
    RetailPublicCustomerService,
    RetailEventsService,
    ChannelCredentialsGuard,
    CustomerAuthGuard,
    EcommerceConnectorGuard,
    EcommerceHubService,
    RetailSeeder,
    {
      provide: IRetailRepository,
      useClass: RetailDbRepository,
    },
    {
      provide: IRetailInfrastructureRepository,
      useClass: RetailInfrastructureDbRepository,
    },
    {
      provide: IEcommerceHubRepository,
      useClass: EcommerceHubDbRepository,
    },
  ],
  exports: [RetailService, RetailInfrastructureService, RetailSeeder],
})
export class RetailModule {}
