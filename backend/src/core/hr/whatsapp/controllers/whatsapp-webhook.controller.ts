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
  Req,
} from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import { WhatsAppInboundService } from '../services/whatsapp-inbound.service';
import { verifyKapsoWebhookSignature } from '../whatsapp-webhook.util';

/**
 * WhatsApp Webhook Controller
 *
 * Receives incoming webhooks from Kapso/Meta:
 * - GET  /api/whatsapp/webhook — verification challenge (Meta setup)
 * - POST /api/whatsapp/webhook — Kapso v2 events + Meta payload forwarding
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
   * Receive webhook events (POST) — Kapso v2 or Meta-forwarded payloads.
   */
  @Post()
  @HttpCode(200)
  async receiveWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Body() payload: Record<string, unknown>,
    @Headers('x-webhook-signature') signature: string,
    @Headers('x-webhook-event') webhookEvent: string,
  ): Promise<{ status: string }> {
    const rawBody =
      req.rawBody?.toString('utf8') ??
      (typeof payload === 'string' ? payload : JSON.stringify(payload));

    if (this.webhookSecret && signature) {
      const isValid = verifyKapsoWebhookSignature(
        signature,
        this.webhookSecret,
        rawBody,
        payload,
      );
      if (!isValid) {
        this.logger.warn(
          `[WEBHOOK] Invalid signature for event ${webhookEvent || 'unknown'}`,
        );
        throw new UnauthorizedException('Invalid webhook signature');
      }
    }

    if (webhookEvent) {
      this.logger.log(`[WEBHOOK] Received Kapso event: ${webhookEvent}`);
    }

    setImmediate(async () => {
      try {
        await this.inboundService.processWebhook(payload, webhookEvent);
      } catch (error) {
        this.logger.error(`[WEBHOOK] Processing error: ${error.message}`, error.stack);
      }
    });

    return { status: 'ok' };
  }
}
