import { Module, DynamicModule, Provider, Type } from '@nestjs/common';
import { HermesApiKeyGuard } from './hermes-api-key.guard';
import { HermesAuthorityGuard } from './hermes-authority.guard';
import { HermesRateLimitGuard } from './hermes-rate-limit.guard';
import { HermesSafetyService } from './hermes-safety.service';
import { HermesAuditService } from './hermes-audit.service';
import { HermesSuggestionService } from './hermes-suggestion.service';
import { HermesFollowUpProcessor } from './hermes-followup.processor';
import { HermesNotificationExecutor } from './executors/notification.executor';
import { HermesFollowUpExecutor } from './executors/follow-up.executor';
import { HermesQueryExecutor } from './executors/query.executor';
import { HermesActionController } from './hermes-action.controller';
import { HermesSuggestionController } from './hermes-suggestion.controller';
import { HermesEventsController } from './hermes-events.controller';
import {
  HERMES_NOTIFICATION_SERVICE,
  HERMES_INTEGRATION_SERVICE,
  HERMES_EVENT_BUS_SERVICE,
  HERMES_WHATSAPP_AGENT,
} from './hermes.tokens';

// ─────────────────────────────────────────────────────────────────────────────
// Re-export tokens from centralized file
// ─────────────────────────────────────────────────────────────────────────────
export {
  HERMES_NOTIFICATION_SERVICE,
  HERMES_INTEGRATION_SERVICE,
  HERMES_EVENT_BUS_SERVICE,
  HERMES_WHATSAPP_AGENT,
} from './hermes.tokens';

// ─────────────────────────────────────────────────────────────────────────────
// Configuration Interface
// ─────────────────────────────────────────────────────────────────────────────

export interface HermesModuleOptions {
  /**
   * The class or value implementing notification sending.
   * Must have sendNotification() and sendBulkNotification() methods.
   */
  notificationService: Type<any> | any;

  /**
   * The class or value implementing Hermes config management.
   * Must have getConfig() returning HermesConfig with enabled, api_key, agents[].
   */
  integrationService: Type<any> | any;

  /**
   * Optional: EventBus service for forwarding domain events to Hermes agents.
   */
  eventBusService?: Type<any> | any;

  /**
   * Optional: WhatsApp agent for handling send_whatsapp_reply actions.
   * If not provided, WhatsApp actions will return "not configured" errors.
   */
  whatsAppAgent?: Type<any> | any;

  /**
   * Optional: Additional modules to import (e.g., PersistenceModule).
   */
  imports?: any[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Hermes Module
// ─────────────────────────────────────────────────────────────────────────────

/**
 * HermesModule — Self-contained Agentic AI integration layer.
 *
 * ## Plug-and-Play Usage
 *
 * ```typescript
 * @Module({
 *   imports: [
 *     HermesModule.forRoot({
 *       notificationService: NotificationService,
 *       integrationService: HermesIntegrationService,
 *       eventBusService: EventBusService,       // optional
 *       whatsAppAgent: WhatsAppAgent,           // optional
 *       imports: [PersistenceModule],           // whatever provides PrismaService
 *     }),
 *   ],
 * })
 * export class AppModule {}
 * ```
 *
 * ## What this gives you
 *
 * Controllers automatically mounted:
 * - GET  /hermes/actions/catalog
 * - POST /hermes/actions
 * - POST /hermes/query
 * - POST /hermes/suggestions
 * - GET  /hermes/suggestions (HR review)
 * - GET  /hermes/events/replay
 *
 * Safety guardrails, rate limiting, authority checks, and full audit logging
 * are all included and configured via the integrationService.
 */
@Module({})
export class HermesModule {
  /**
   * Register Hermes with the host application.
   *
   * @param options - Adapters the host provides (notification, config, etc.)
   * @returns DynamicModule ready to import
   */
  static forRoot(options: HermesModuleOptions): DynamicModule {
    const providers: Provider[] = [
      // Adapter bindings — the host supplies these implementations
      {
        provide: HERMES_NOTIFICATION_SERVICE,
        useClass: options.notificationService,
      },
      {
        provide: HERMES_INTEGRATION_SERVICE,
        useClass: options.integrationService,
      },

      // Hermes internal services
      HermesApiKeyGuard,
      HermesAuthorityGuard,
      HermesRateLimitGuard,
      HermesSafetyService,
      HermesAuditService,
      HermesSuggestionService,
      HermesFollowUpProcessor,
      HermesNotificationExecutor,
      HermesFollowUpExecutor,
      HermesQueryExecutor,
    ];

    // Optional: EventBus
    if (options.eventBusService) {
      providers.push({
        provide: HERMES_EVENT_BUS_SERVICE,
        useClass: options.eventBusService,
      });
    } else {
      providers.push({
        provide: HERMES_EVENT_BUS_SERVICE,
        useValue: null,
      });
    }

    // Optional: WhatsApp Agent
    if (options.whatsAppAgent) {
      providers.push({
        provide: HERMES_WHATSAPP_AGENT,
        useClass: options.whatsAppAgent,
      });
    } else {
      providers.push({
        provide: HERMES_WHATSAPP_AGENT,
        useValue: null,
      });
    }

    return {
      module: HermesModule,
      imports: options.imports || [],
      controllers: [
        HermesActionController,
        HermesSuggestionController,
        HermesEventsController,
      ],
      providers,
      exports: [
        HermesSafetyService,
        HermesAuditService,
        HermesSuggestionService,
        HermesNotificationExecutor,
        HermesFollowUpExecutor,
        HermesQueryExecutor,
        HERMES_NOTIFICATION_SERVICE,
        HERMES_INTEGRATION_SERVICE,
      ],
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Re-exports for convenience
// ─────────────────────────────────────────────────────────────────────────────
export { HermesApiKeyGuard } from './hermes-api-key.guard';
export { HermesAuthorityGuard, RequiresAuthority } from './hermes-authority.guard';
export { HermesRateLimitGuard } from './hermes-rate-limit.guard';
export { HermesSafetyService } from './hermes-safety.service';
export { HermesAuditService } from './hermes-audit.service';
export { HermesSuggestionService } from './hermes-suggestion.service';
export { HermesFollowUpProcessor } from './hermes-followup.processor';
export { HermesNotificationExecutor } from './executors/notification.executor';
export { HermesFollowUpExecutor } from './executors/follow-up.executor';
export { HermesQueryExecutor } from './executors/query.executor';
export { HermesActionController } from './hermes-action.controller';
export { HermesSuggestionController } from './hermes-suggestion.controller';
export { HermesEventsController } from './hermes-events.controller';
export { HERMES_ACTION_CATALOG } from './hermes-action.catalog';
export * from './hermes.interfaces';
