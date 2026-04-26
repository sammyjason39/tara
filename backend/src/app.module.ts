import { Module, NestModule, MiddlewareConsumer } from "@nestjs/common";
import { TenantMiddleware } from "./gateway/tenant.middleware";
import { FinanceModule } from "./core/finance/finance.module";
import { HRModule } from "./core/hr/hr.module";
import { ITSettingsModule } from "./core/it-settings/it-settings.module";
import { ProcurementModule } from "./core/procurement/procurement.module";
import { InventoryModule } from "./core/inventory/inventory.module";
import { AdminModule } from "./core/admin/admin.module";
import { ITModule } from "./core/it/it.module";
import { SalesModule } from "./core/sales/sales.module";
import { MarketingModule } from "./core/marketing/marketing.module";
import { PaymentModule } from "./core/payment/payment.module";
import { RetailModule } from "./modules/retail/retail.module";
import { ExplorerModule } from "./support/explorer/explorer.module";
import { PersistenceModule } from "./persistence/persistence.module";
import { AuditModule } from "./shared/audit/audit.module";
import { AuthModule } from "./core/auth/auth.module";
import { LoggerModule } from './shared/logger/logger.module';
import { LicenseModule } from './shared/license/license.module';
import { CommsModule } from './shared/comms/comms.module';
import { EventsModule } from "./shared/events/events.module";
import { WorkflowModule } from "./shared/workflow/workflow.module";
import { AutomationModule } from "./shared/automation/automation.module";
import { CommandBusModule } from "./shared/command-bus/command-bus.module";
import { ComplianceEngineModule } from "./modules/compliance/compliance.module";
import { HealthController } from "./gateway/health.controller";
import { PricingModule } from "./core/pricing/pricing.module";
import { AgenticModule } from "./agentic/agentic.module";
import { WorkflowEngineModule } from "./core/workflow/workflow.module";
import { MaintenanceModule } from "./shared/maintenance/maintenance.module";
import { IotModule } from "./shared/iot/iot.module";
import { ReportingModule } from "./shared/reporting/reporting.module";
import { SettingsModule } from "./core/settings/settings.module";
import { IncentivesModule } from "./core/incentives/incentives.module";


import { APP_GUARD } from "@nestjs/core";
import { ThrottlerModule, ThrottlerGuard } from "@nestjs/throttler";
import { ScheduleModule } from "@nestjs/schedule";
import { ConfigModule } from "@nestjs/config";
import { validate } from "./config/env.validation";

/**
 * App Module
 * Root application module for Zenvix Backend
 */
@Module({
  imports: [
    ConfigModule.forRoot({
      validate,
      isGlobal: true,
    }),
    ...(process.env.VERCEL === "1" ? [] : [ScheduleModule.forRoot()]),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 100,
      },
    ]),
    LoggerModule,
    LicenseModule,
    CommsModule,
    PersistenceModule,
    EventsModule,
    WorkflowModule,
    CommandBusModule,
    ComplianceEngineModule,
    AutomationModule,
    AuditModule,
    ReportingModule,
    FinanceModule,
    HRModule,
    ITSettingsModule,
    ProcurementModule,
    InventoryModule,
    AdminModule,
    ITModule,
    SalesModule,
    MarketingModule,
    PaymentModule,
    RetailModule,
    ExplorerModule,
    AuthModule,
    PricingModule,
    AgenticModule,
    WorkflowEngineModule,
    MaintenanceModule,
    IotModule,
    SettingsModule,
    IncentivesModule,
  ],
  controllers: [HealthController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(TenantMiddleware)
      .exclude("auth/*path", "retail/public/*path", "monitoring/*path")
      .forRoutes("*path");
  }
}
