import { Module, forwardRef } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AiModule } from '../ai/ai.module';

// Hermes Integration — now a self-contained module
import { HermesModule } from './hermes/hermes.module';

// WhatsApp Agent Integration
import { WhatsAppClientService } from './whatsapp/services/whatsapp-client.service';
import { WhatsAppInboundService } from './whatsapp/services/whatsapp-inbound.service';
import { WhatsAppOutboundService } from './whatsapp/services/whatsapp-outbound.service';
import { WhatsAppSessionService } from './whatsapp/services/whatsapp-session.service';
import { WhatsAppAuditService } from './whatsapp/services/whatsapp-audit.service';
import { WhatsAppVerificationService } from './whatsapp/services/whatsapp-verification.service';
import { WhatsAppWebhookController } from './whatsapp/controllers/whatsapp-webhook.controller';
import { WhatsAppSettingsController } from './whatsapp/controllers/whatsapp-settings.controller';
import { WhatsAppAgent } from './whatsapp/whatsapp.agent';

// Controllers
import { TaraEmployeeController } from './controllers/tara-employee.controller';
import { TaraLeaveController } from './controllers/tara-leave.controller';
import { DepartmentController } from './controllers/department.controller';
import { RoleController } from './controllers/role.controller';
import { SupervisorController } from './controllers/supervisor.controller';
import { GeoFenceOverrideController } from './controllers/geo-fence-override.controller';
import { AbsensiAgentController } from './controllers/absensi-agent.controller';
import { NotificationController } from './controllers/notification.controller';
import { SettingsController } from './controllers/settings.controller';
import { AwsDeviceWebhookController } from './controllers/aws-device-webhook.controller';
import { AwsDeviceMappingController } from './controllers/aws-device-mapping.controller';
import { OfficeLocationController } from './controllers/office-location.controller';
import { AdminSettingsController } from './controllers/admin-settings.controller';
import { PayrollController } from './controllers/payroll.controller';
import { ScheduleController } from './controllers/schedule.controller';

// Core Services
import { EventBusService } from './services/event-bus.service';
import { TaraEmployeeService } from './services/tara-employee.service';
import { EmployeeManagementService } from './services/employee-management.service';
import { GeoService } from './services/geo.service';
import { GeoFenceOverrideService } from './services/geo-fence-override.service';
import { TaraAttendanceService } from './services/tara-attendance.service';
import { AttendancePhotoService } from './services/attendance-photo.service';
import { NotificationService } from './services/notification.service';
import { LeaveService } from './services/leave.service';
import { WeeklyCheckinService } from './services/weekly-checkin.service';
import { SystemSettingsService } from './services/system-settings.service';
import { ConfigurationValidationService } from './services/configuration-validation.service';
import { AgentConfigService } from './services/agent-config.service';
import { ConfigChangeHistoryService } from './services/config-change-history.service';
import { WarningLetterService } from './services/warning-letter.service';
import { AwsDeviceWebhookService } from './services/aws-device-webhook.service';
import { AwsDeviceMappingService } from './services/aws-device-mapping.service';
import { ConflictResolutionService } from './services/conflict-resolution.service';
import { AwsDeviceBatchSyncService, AWS_DEVICE_API_CLIENT, StubAwsDeviceApiClient } from './services/aws-device-batch-sync.service';
import { OfficeLocationService } from './services/office-location.service';
import { OrganizationService } from './services/organization.service';
import { NotificationChannelService } from './services/notification-channel.service';
import { HermesIntegrationService } from './services/hermes-integration.service';
import { AttendanceConfigService } from './services/attendance-config.service';
import { PayrollService } from './services/payroll.service';
import { LoanService } from './services/loan.service';
import { ScheduleService } from './services/schedule.service';
import { CacheAsideService } from '../../shared/cache/cache-aside.service';
import { AuditService } from '../../shared/audit/audit.service';
import { LoggerService } from '../../shared/logger/logger.service';
import { TaraContextQueryService } from '../auth/services/tara-context-query.service';
import { TenantScopeResolver } from './scope/tenant-scope.resolver';
import { CompanyBrandingService } from './services/company-branding.service';
import { FeatureFlagsService } from './services/feature-flags.service';
import { FeatureEnabledGuard } from './guards/feature-enabled.guard';

// Events & WebSocket
import { EventStreamGateway } from './events/event-stream.gateway';
import { SessionDataPushGateway } from './events/session-data-push.gateway';
import { EventSubscriptionRegistry } from './events/event-subscription.registry';
import { EventSubscriptionController } from './events/event-subscription.controller';
import { WebApiController } from './controllers/web-api.controller';
import { PublicController } from './controllers/public.controller';

// i18n
import { I18nService } from './i18n/i18n.service';

// Agents (7 autonomous agents)
import { AbsensiAgent } from './agents/absensi.agent';
import { LeaveRequestAgent } from './agents/leave-request.agent';
import { ClockConfirmationAgent } from './agents/clock-confirmation.agent';
import { WeeklyCheckinAgent } from './agents/weekly-checkin.agent';
import { LateReportAgent } from './agents/late-report.agent';
import { OnboardingAgent } from './agents/onboarding.agent';
import { SaldoCutiAgent } from './agents/saldo-cuti.agent';
import { PayrollAgent } from './agents/payroll.agent';
import { LoanAgent } from './agents/loan.agent';
import { SchedulingAgent } from './agents/scheduling.agent';
import { WarningLetterAgent } from './agents/warning-letter.agent';
import { HealthCheckAgent } from './agents/health-check.agent';
import { OnboardingStatusService } from './agents/onboarding-status.service';
import { ONBOARDING_INTEGRATIONS, StubOnboardingIntegrations } from './agents/onboarding-integrations';

// HR root services
import { DepartmentService } from './department.service';
import { RoleService } from './role.service';
import { SupervisorService } from './supervisor.service';

// i18n
import { I18nModule } from './i18n/i18n.module';

/**
 * TARA HR Module — houses all HR services, 7 autonomous agents, and controllers.
 * Clean, focused — no payroll, recruitment, OCR, or other multi-department cruft.
 */
@Module({
  imports: [
    AuthModule,
    forwardRef(() => AiModule),
    forwardRef(() =>
      HermesModule.forRoot({
        notificationService: NotificationService,
        integrationService: HermesIntegrationService,
        eventBusService: EventBusService,
        whatsAppAgent: WhatsAppAgent,
        useExistingAdapters: true,
        imports: [AuthModule, forwardRef(() => HrModule)],
      }),
    ),
  ],
  controllers: [
    TaraEmployeeController,
    TaraLeaveController,
    DepartmentController,
    RoleController,
    SupervisorController,
    GeoFenceOverrideController,
    AbsensiAgentController,
    NotificationController,
    SettingsController,
    AwsDeviceWebhookController,
    AwsDeviceMappingController,
    OfficeLocationController,
    AdminSettingsController,
    PayrollController,
    ScheduleController,
    EventSubscriptionController,
    // WhatsApp Integration
    WhatsAppWebhookController,
    WhatsAppSettingsController,
    WebApiController,
    PublicController,
  ],
  providers: [
    // Core services
    EventBusService,
    TaraEmployeeService,
    EmployeeManagementService,
    GeoService,
    GeoFenceOverrideService,
    TaraAttendanceService,
    AttendancePhotoService,
    NotificationService,
    LeaveService,
    WeeklyCheckinService,
    SystemSettingsService,
    ConfigurationValidationService,
    AgentConfigService,
    ConfigChangeHistoryService,
    WarningLetterService,
    AwsDeviceWebhookService,
    AwsDeviceMappingService,
    ConflictResolutionService,
    AwsDeviceBatchSyncService,
    OfficeLocationService,
    OrganizationService,
    NotificationChannelService,
    HermesIntegrationService,
    AttendanceConfigService,
    PayrollService,
    LoanService,
    ScheduleService,
    CompanyBrandingService,
    FeatureFlagsService,
    FeatureEnabledGuard,
    { provide: AWS_DEVICE_API_CLIENT, useClass: StubAwsDeviceApiClient },

    // 12 Autonomous Agents
    AbsensiAgent,
    LeaveRequestAgent,
    ClockConfirmationAgent,
    WeeklyCheckinAgent,
    LateReportAgent,
    OnboardingAgent,
    SaldoCutiAgent,
    PayrollAgent,
    LoanAgent,
    SchedulingAgent,
    WarningLetterAgent,
    HealthCheckAgent,
    OnboardingStatusService,
    { provide: ONBOARDING_INTEGRATIONS, useClass: StubOnboardingIntegrations },

    // Organization services
    DepartmentService,
    RoleService,
    SupervisorService,
    CacheAsideService,
    AuditService,
    LoggerService,
    EventStreamGateway,
    SessionDataPushGateway,
    EventSubscriptionRegistry,
    I18nService,
    TaraContextQueryService,
    TenantScopeResolver,

    // WhatsApp Agent Integration
    WhatsAppClientService,
    WhatsAppInboundService,
    WhatsAppOutboundService,
    WhatsAppSessionService,
    WhatsAppAuditService,
    WhatsAppVerificationService,
    WhatsAppAgent,
  ],
  exports: [
    EventBusService,
    TaraEmployeeService,
    EmployeeManagementService,
    GeoService,
    NotificationService,
    HermesIntegrationService,
    LeaveService,
    LoanService,
    SystemSettingsService,
    AgentConfigService,
    WarningLetterService,
    DepartmentService,
    RoleService,
    SupervisorService,
    WhatsAppOutboundService,
    WhatsAppAgent,
    FeatureFlagsService,
    FeatureEnabledGuard,
  ],
})
export class HrModule {}
