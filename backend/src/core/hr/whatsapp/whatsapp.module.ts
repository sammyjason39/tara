/**
 * WhatsApp Agent Module (Barrel file)
 *
 * All WhatsApp providers and controllers are registered directly in HrModule
 * (same pattern as Hermes) to avoid NestJS DI scope issues.
 *
 * This file serves as documentation and barrel export of the WhatsApp Agent subsystem.
 *
 * Components:
 * - Services: WhatsAppClientService, WhatsAppInboundService, WhatsAppOutboundService,
 *             WhatsAppSessionService, WhatsAppAuditService, WhatsAppVerificationService
 * - Controller: WhatsAppWebhookController, WhatsAppSettingsController
 * - Agent: WhatsAppAgent (event-driven, listens to whatsapp.message.inbound)
 */
export { WhatsAppClientService } from './services/whatsapp-client.service';
export { WhatsAppInboundService } from './services/whatsapp-inbound.service';
export { WhatsAppOutboundService } from './services/whatsapp-outbound.service';
export { WhatsAppSessionService } from './services/whatsapp-session.service';
export { WhatsAppAuditService } from './services/whatsapp-audit.service';
export { WhatsAppVerificationService } from './services/whatsapp-verification.service';
export { WhatsAppWebhookController } from './controllers/whatsapp-webhook.controller';
export { WhatsAppSettingsController } from './controllers/whatsapp-settings.controller';
export { WhatsAppAgent } from './whatsapp.agent';
