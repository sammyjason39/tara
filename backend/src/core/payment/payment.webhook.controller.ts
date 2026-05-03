import { Controller, Post, Headers, Req, Res, RawBodyRequest } from "@nestjs/common";
import { Request, Response } from "express";
import { PaymentService } from "./payment.service";

// Note: Stripe Webhooks require raw body. In NestJS, this needs to be enabled at main.ts
// Usually via rawBody: true in NestFactory.create()

@Controller('payment/webhook')
export class PaymentWebhookController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post("stripe")
  async handleStripeWebhook(
    @Headers("stripe-signature") signature: string,
    @Req() req: RawBodyRequest<Request>, // We need the raw buffer
    @Res() res: Response
  ) {
    if (!signature) {
      res.status(400).send("No signature provided");
      return;
    }

    // Usually webhooks don't have a single tenant context in the header, 
    // it's embedded in the payload. PaymentService will handle extracting it.
    try {
      console.log(`[Webhook] Stripe event received. Signature: ${signature.substring(0, 10)}...`);
      await this.paymentService.handleGatewayWebhookPayload(
        "STRIPE",
        req.rawBody || req.body,
        signature,
      );

      console.log(`[Webhook] Stripe event processed successfully.`);
      res.status(200).send({ received: true });
    } catch (err: any) {
      console.error(`[Webhook Error] Stripe failure:`, err.message);
      res.status(400).send(`Webhook Error: ${err.message}`);
    }
  }

  @Post("xendit")
  async handleXenditWebhook(
    @Headers("x-callback-token") token: string,
    @Req() req: Request,
    @Res() res: Response
  ) {
    try {
      await this.paymentService.handleGatewayWebhookPayload(
        "XENDIT",
        req.body,
        token || "",
      );
      res.status(200).send({ received: true });
    } catch (err: any) {
      res.status(400).send(`Webhook Error: ${err.message}`);
    }
  }

  @Post("midtrans")
  async handleMidtransWebhook(
    @Req() req: Request,
    @Res() res: Response
  ) {
    try {
      // Signature is in the body or headers for midtrans
      const signature = req.body.signature_key || "";
      await this.paymentService.handleGatewayWebhookPayload(
        "MIDTRANS",
        req.body,
        signature,
      );
      res.status(200).send({ received: true });
    } catch (err: any) {
      res.status(400).send(`Webhook Error: ${err.message}`);
    }
  }
}
