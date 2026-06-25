/**
 * Hermes Injection Tokens
 *
 * Centralized token definitions for NestJS DI.
 * Using string tokens to ensure uniqueness across module boundaries.
 */

/**
 * Token for the Notification Service adapter.
 * The host app must supply a class implementing IHermesNotificationAdapter.
 */
export const HERMES_NOTIFICATION_SERVICE = 'HERMES_NOTIFICATION_SERVICE';

/**
 * Token for the Hermes Integration/Config Service.
 * The host app must supply a class implementing IHermesIntegrationService.
 */
export const HERMES_INTEGRATION_SERVICE = 'HERMES_INTEGRATION_SERVICE';

/**
 * Token for the Event Bus Service (optional).
 * If the host wants event-stream forwarding to Hermes agents.
 */
export const HERMES_EVENT_BUS_SERVICE = 'HERMES_EVENT_BUS_SERVICE';

/**
 * Token for the WhatsApp Agent (optional).
 * Only needed if the host app uses WhatsApp integration.
 */
export const HERMES_WHATSAPP_AGENT = 'HERMES_WHATSAPP_AGENT';
