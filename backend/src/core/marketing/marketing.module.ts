import { Module } from "@nestjs/common";
import { useDbPersistence } from "../../shared/persistence.mode";
import { PrismaService } from "../../persistence/prisma.service";
import { MarketingController } from "./marketing.controller";
import { MarketingService } from "./marketing.service";
import { MarketingDbRepository } from "./repositories/marketing.db.repository";
import { MarketingMockRepository } from "./repositories/marketing.mock.repository";
import { IMarketingRepository } from "./repositories/marketing.repository.interface";
import { Customer360Service } from "./customer-360.service";
import { OmnichannelService } from "./omnichannel.service";
import { SocialSyncService } from "./social-sync.service";
import { SocialSyncWorker } from "./social-sync.worker";
import { MarketingAutomationEngine } from "./automation-engine.service";
import { BookingService } from "./booking.service";
import { EventsModule } from "../../shared/events/events.module";
import { AuditModule } from "../../shared/audit/audit.module";
import { ScopeModule } from "../../shared/scope/scope.module";
import { AtomicOperationModule } from "../shared/atomic";
import { AsyncRejectionModule } from "../shared/async";
import { ConfigModule } from "@nestjs/config";

@Module({
  imports: [
    EventsModule,
    AuditModule,
    ScopeModule,
    AtomicOperationModule,
    AsyncRejectionModule,
  ],
  controllers: [MarketingController],
  providers: [
    PrismaService,
    MarketingService,
    Customer360Service,
    OmnichannelService,
    SocialSyncService,
    SocialSyncWorker,
    MarketingAutomationEngine,
    BookingService,
    {
      provide: IMarketingRepository,
      useClass: useDbPersistence()
        ? MarketingDbRepository
        : MarketingMockRepository,
    },
  ],
  exports: [
    MarketingService,
    Customer360Service,
    OmnichannelService,
    SocialSyncService,
    BookingService,
  ],
})
export class MarketingModule {}
