// Hermes Agentic AI Integration — Public Exports

// Module (the main entry point for integration)
export { HermesModule, HermesModuleOptions } from './hermes.module';

// Injection tokens
export {
  HERMES_NOTIFICATION_SERVICE,
  HERMES_INTEGRATION_SERVICE,
  HERMES_EVENT_BUS_SERVICE,
  HERMES_WHATSAPP_AGENT,
} from './hermes.tokens';

// Interfaces (for implementing adapters)
export * from './hermes.interfaces';

// Adapter interfaces for implementers
export type { IHermesNotificationAdapter } from './executors/notification.executor';
export type { IHermesIntegrationService } from './hermes-api-key.guard';
export type { IHermesEventBusAdapter } from './hermes-suggestion.service';
