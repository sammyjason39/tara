import { Injectable } from "@nestjs/common";
import Stripe from "stripe";
import { ConfigService } from "@nestjs/config";
import { PaymentAdapter, PaymentIntentResult } from "./payment.adapter.interface";

@Injectable()
export class StripeAdapter implements PaymentAdapter {
  private stripe: any;
  private readonly isConfigured: boolean;

  constructor(private configService: ConfigService) {
    const key = this.configService.get<string>("STRIPE_SECRET_KEY");
    this.isConfigured = !!key;
    if (this.isConfigured) {
      this.stripe = new Stripe(key!, {
        apiVersion: "2025-01-27" as any,
      });
    }
  }

  async isAvailable(tenant_id: string): Promise<boolean> {
    // Advanced: Check tenant's custom stripe connect status in DB. 
    // Basic: Check if Stripe API key is configured.
    return this.isConfigured;
  }

  async createPaymentIntent(data: {
    amount: number;
    currency: string;
    tenant_id: string;
    order_id: string;
    transfer_data?: { destination: string }; // For Stripe Connect
    application_fee_amount?: number; // 1% Zenvix fee
  }): Promise<PaymentIntentResult> {
    if (!this.isConfigured) throw new Error("Stripe is not configured");
    
    const session = await this.stripe.paymentIntents.create({
      amount: data.amount,
      currency: data.currency.toLowerCase(),
      metadata: {
        tenant_id: data.tenant_id,
        order_id: data.order_id,
      },
      transfer_data: data.transfer_data,
      application_fee_amount: data.application_fee_amount,
    });

    return {
      client_secret: session.client_secret,
    };
  }

  async handleWebhook(payload: any, signature: string, secret?: string) {
    if (!this.isConfigured) throw new Error("Stripe is not configured");
    if (!secret) throw new Error("Webhook secret is required for Stripe");

    let event: any;
    try {
      event = this.stripe.webhooks.constructEvent(payload, signature, secret);
    } catch (err: any) {
      throw new Error(`Webhook Error: ${err.message}`);
    }

    const pi = event.data.object;

    if (event.type === 'payment_intent.succeeded') {
      const balanceTransaction = pi.charges?.data?.[0]?.balance_transaction;
      // Note: In a real environment with Stripe, the balance transaction needs to be fetched
      // if it's just an ID returned in the PI object. Assuming simple object mapping here.
      const fee = balanceTransaction?.fee || 0;
      const net = balanceTransaction?.net || pi.amount;

      return {
        external_ref: pi.id,
        status: "PAID" as const,
        gross_amount: pi.amount,
        gateway_fee: fee,
        net_amount: net,
        raw_event: event,
      };
    } else if (event.type === 'payment_intent.payment_failed') {
      return {
        external_ref: pi.id,
        status: "FAILED" as const,
        gross_amount: pi.amount,
        gateway_fee: 0,
        net_amount: 0,
        raw_event: event,
      };
    }

    throw new Error(`Unhandled Stripe event type: ${event.type}`);
  }

  async checkStatus(external_ref: string): Promise<{
    status: "PENDING" | "PAID" | "FAILED";
    fee?: number;
    net_amount?: number;
    provider_response: any;
  }> {
    if (!this.isConfigured) throw new Error("Stripe is not configured");

    const pi = await this.stripe.paymentIntents.retrieve(external_ref, {
      expand: ['charges.data.balance_transaction']
    });

    let status: "PENDING" | "PAID" | "FAILED" = "PENDING";
    let fee = 0;
    let net_amount = pi.amount;

    if (pi.status === "succeeded") {
      status = "PAID";
      const balanceTransaction = pi.charges?.data?.[0]?.balance_transaction;
      if (balanceTransaction && typeof balanceTransaction !== "string") {
        fee = balanceTransaction.fee || 0;
        net_amount = balanceTransaction.net || pi.amount;
      }
    } else if (pi.status === "canceled" || pi.status === "requires_payment_method") {
      // In a real flow, requires_payment_method might just be pending or failed based on timing
      // We map canceled cleanly to failed.
      status = "FAILED";
    }

    return {
      status,
      fee,
      net_amount,
      provider_response: pi
    };
  }

  async refund(external_ref: string, amount?: number): Promise<boolean> {
    if (!this.isConfigured) throw new Error("Stripe is not configured");
    try {
      await this.stripe.refunds.create({
        payment_intent: external_ref,
        ...(amount ? { amount } : {})
      });
      return true;
    } catch (e: any) {
      console.error(`Stripe Refund Error [${external_ref}]: ${e.message}`);
      return false;
    }
  }

  calculateZenvixFee(amount: number): number {
    // 1% Zenvix Platform Fee
    return Math.floor(amount * 0.01);
  }
}
