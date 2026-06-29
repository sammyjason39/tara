import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { WhatsAppClient } from '@kapso/whatsapp-cloud-api';

/**
 * WhatsApp Client Service — Kapso SDK wrapper.
 *
 * Manages the singleton WhatsAppClient instance configured to use
 * the Kapso proxy (storage, conversation history, webhooks).
 *
 * Environment:
 *   KAPSO_API_KEY           — Project API key
 *   KAPSO_PHONE_NUMBER_ID   — Default phone number ID
 */
@Injectable()
export class WhatsAppClientService implements OnModuleInit {
  private readonly logger = new Logger(WhatsAppClientService.name);
  private client: WhatsAppClient | null = null;
  private phoneNumberId: string;

  onModuleInit() {
    const apiKey = process.env.KAPSO_API_KEY;
    this.phoneNumberId = process.env.KAPSO_PHONE_NUMBER_ID || '1177690982091942';

    if (!apiKey) {
      this.logger.warn('KAPSO_API_KEY not set — WhatsApp agent will be disabled');
      return;
    }

    this.client = new WhatsAppClient({
      baseUrl: 'https://api.kapso.ai/meta/whatsapp',
      kapsoApiKey: apiKey,
    });

    this.logger.log(`WhatsApp Client initialized (phoneNumberId: ${this.phoneNumberId})`);
  }

  /**
   * Check if the WhatsApp client is configured and available.
   */
  isAvailable(): boolean {
    return this.client !== null;
  }

  /**
   * Get the underlying Kapso WhatsAppClient instance.
   * @throws Error if client is not configured
   */
  getClient(): WhatsAppClient {
    if (!this.client) {
      throw new Error('WhatsApp client not configured — set KAPSO_API_KEY');
    }
    return this.client;
  }

  /**
   * Get the configured phone number ID.
   */
  getPhoneNumberId(): string {
    return this.phoneNumberId;
  }

  /**
   * Send a text message to a WhatsApp number.
   * @param to - Recipient phone number in international format (e.g., '6281234567890')
   * @param body - Message text content
   * @returns Kapso/Meta message response with wamid
   */
  async sendText(to: string, body: string): Promise<{ messageId?: string; success: boolean }> {
    if (!this.client) {
      this.logger.error('Cannot send — WhatsApp client not configured');
      return { success: false };
    }

    try {
      const result = await this.client.messages.sendText({
        phoneNumberId: this.phoneNumberId,
        to: this.normalizePhoneNumber(to),
        body,
      });

      const messageId = (result as any)?.messages?.[0]?.id;
      this.logger.log(`[WA] Message sent to ${to} — wamid: ${messageId}`);
      return { messageId, success: true };
    } catch (error) {
      this.logger.error(`[WA] Failed to send text to ${to}: ${error.message}`);
      return { success: false };
    }
  }

  /**
   * Send an interactive button message.
   */
  async sendButtons(
    to: string,
    body: string,
    buttons: { id: string; title: string }[],
  ): Promise<{ messageId?: string; success: boolean }> {
    if (!this.client) {
      return { success: false };
    }

    const normalizedTo = this.normalizePhoneNumber(to);
    const kapsoButtons = buttons.slice(0, 3).map((b) => ({
      id: b.id,
      title: b.title.substring(0, 20),
    }));

    try {
      const result = await this.client.messages.sendInteractiveButtons({
        phoneNumberId: this.phoneNumberId,
        to: normalizedTo,
        bodyText: body,
        buttons: kapsoButtons,
      });

      const messageId = (result as { messages?: Array<{ id?: string }> })?.messages?.[0]?.id;
      this.logger.log(`[WA] Buttons sent to ${to} — wamid: ${messageId}`);
      return { messageId, success: true };
    } catch (error) {
      this.logger.error(`[WA] Failed to send buttons to ${to}: ${error.message}`);
      const fallbackBody = `${body}\n\nBalas: ${kapsoButtons.map((b) => b.title).join(' / ')}`;
      return this.sendText(to, fallbackBody);
    }
  }

  /**
   * Mark a message as read (shows blue ticks).
   */
  async markRead(messageId: string): Promise<void> {
    if (!this.client) return;

    try {
      await this.client.messages.markRead({
        phoneNumberId: this.phoneNumberId,
        messageId,
      });
    } catch (error) {
      this.logger.warn(`[WA] Failed to mark read ${messageId}: ${error.message}`);
    }
  }

  /**
   * Normalize phone number to international format without '+'.
   * Kapso expects numbers like '6281234567890' (no plus sign).
   */
  private normalizePhoneNumber(phone: string): string {
    let normalized = phone.replace(/[\s\-\(\)]/g, '');
    if (normalized.startsWith('+')) {
      normalized = normalized.substring(1);
    }
    // Indonesian numbers: 08xxx → 628xxx
    if (normalized.startsWith('08')) {
      normalized = '62' + normalized.substring(1);
    }
    return normalized;
  }
}
