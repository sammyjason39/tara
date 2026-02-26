import { Module } from "@nestjs/common";
import { AdminModule } from "../admin/admin.module";
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
import { RetailDbRepository } from "./repositories/retail.db.repository";
import { IRetailInfrastructureRepository } from "./repositories/retail-infrastructure.repository.interface";
import { RetailInfrastructureDbRepository } from "./repositories/retail-infrastructure.db.repository";
import { IEcommerceHubRepository } from "./repositories/ecommerce-hub.repository.interface";
import { EcommerceHubDbRepository } from "./repositories/ecommerce-hub.db.repository";
import { PrismaService } from "../../persistence/prisma.service";
import { ChannelCredentialsGuard } from "./guards/channel-credentials.guard";
import { CustomerAuthGuard } from "./guards/customer-auth.guard";
import { EcommerceConnectorGuard } from "./guards/ecommerce-connector.guard";
import { AuditModule } from "../../shared/audit/audit.module";

@Module({
  imports: [AdminModule, AuditModule],
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
    PrismaService,
    EcommerceHubService,
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
  exports: [RetailService, RetailInfrastructureService],
})
export class RetailModule {}
