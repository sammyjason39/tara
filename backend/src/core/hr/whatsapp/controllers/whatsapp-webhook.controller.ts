import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  Headers,
  HttpCode,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { WhatsAppInboundService, WebhookPayload } from '../services/whatsapp-inbound.service';
import * as crypto from 'crypto';

/**
 * WhatsApp Webhook Controller
 *
 * Receives incoming webhooks from Kapso/Meta:
 * - GET  /api/whatsapp/webhook — verification challenge (Meta setup)
 * - POST /api/whatsapp/webhook — inbound messages & status updates
 *
 * Security: Validates X-Webhook-Signature header using KAPSO_WEBHOOK_SECRET.
 */
@Controller('whatsapp/webhook')
export class WhatsAppWebhookController {
  private readonly logger = new Logger(WhatsAppWebhookController.name);
  private readonly webhookSecret = process.env.KAPSO_WEBHOOK_SECRET || '';

  constructor(private readonly inboundService: WhatsAppInboundService) {}

  /**
   * Webhook verification (GET) — Meta sends a challenge during setup.
   * Returns the hub.challenge value if hub.verify_token matches.
   */
  @Get()
  verifyWebhook(
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') verifyToken: string,
    @Query('hub.challenge') challenge: string,
  ): string {
    if (mode === 'subscribe' && verifyToken === this.webhookSecret) {
      this.logger.log('[WEBHOOK] Verification successful');
      return challenge;
    }

    this.logger.warn('[WEBHOOK] Verification failed — token mismatch');
    throw new UnauthorizedException('Webhook verification failed');
  }

  /**
   * Receive webhook events (POST) — inbound messages and delivery statuses.
   */
  @Post()
  @HttpCode(200)
  async receiveWebhook(
    @Body() payload: WebhookPayload,
    @Headers('x-webhook-signature') signature: string,
  ): Promise<{ status: string }> {
    // Validate signature if webhook secret is configured
    if (this.webhookSecret && signature) {
      const isValid = this.validateSignature(JSON.stringify(payload), signature);
      if (!isValid) {
        this.logger.warn('[WEBHOOK] Invalid signature — rejecting payload');
        throw new UnauthorizedException('Invalid webhook signature');
      }
    }

    // Process asynchronously (return 200 immediately per WhatsApp requirements)
    setImmediate(async () => {
      try {
        await this.inboundService.processWebhook(payload);
      } catch (error) {
        this.logger.error(`[WEBHOOK] Processing error: ${error.message}`, error.stack);
      }
    });

    return { status: 'ok' };
  }

  /**
   * Validate Kapso X-Webhook-Signature using HMAC-SHA256.
   */
  private validateSignature(body: string, signature: string): boolean {
    if (!this.webhookSecret) return true; // Skip if no secret configured

    const hmac = crypto
      .createHmac('sha256', this.webhookSecret)
      .update(body)
      .digest('hex');

    const expected = `sha256=${hmac}`;
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expected),
    );
  }
}
