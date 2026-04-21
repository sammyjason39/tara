import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PaymentAdapter, PaymentIntentResult } from "./payment.adapter.interface";

@Injectable()
export class XenditAdapter implements PaymentAdapter {
  constructor(private configService: ConfigService) {}

  async isAvailable(tenant_id: string): Promise<boolean> {
    // Return true if XENDIT_SECRET_KEY is configured
    return !!this.configService.get("XENDIT_SECRET_KEY");
  }

  async createPaymentIntent(data: {
    amount: number;
    currency: string;
    tenant_id: string;
    order_id: string;
    transfer_data?: { destination: string };
    application_fee_amount?: number;
  }): Promise<PaymentIntentResult> {
    if (!(await this.isAvailable(data.tenant_id))) {
      throw new Error("Xendit is not configured");
    }

    // Mock implementation returning a dummy checkout URL
    return {
      transaction_id: `xnd_${Date.now()}`,
      checkout_url: `https://checkout.xendit.co/web/${data.order_id}`,
    };
  }

  async handleWebhook(payload: any, signature: string, secret?: string) {
    if (!(await this.isAvailable(""))) {
      throw new Error("Xendit is not configured");
    }

    // Stub logic
    const external_ref = payload.external_id;
    const status = payload.status === "PAID" ? "PAID" : "FAILED";
    const gross = payload.amount;
    const fee = payload.fee || 0; // Simulated

    return {
      external_ref,
      status: status as "PAID" | "FAILED",
      gross_amount: gross,
      gateway_fee: fee,
      net_amount: gross - fee,
      raw_event: payload,
    };
  }

  async checkStatus(external_ref: string): Promise<{
    status: "PENDING" | "PAID" | "FAILED";
    fee?: number;
    net_amount?: number;
    provider_response: any;
  }> {
    const secret = this.configService.get("XENDIT_SECRET_KEY");
    if (!secret) throw new Error("Xendit is not configured");

    const response = await fetch(`https://api.xendit.co/v2/invoices/${external_ref}`, {
      method: "GET",
      headers: {
        "Authorization": `Basic ${Buffer.from(secret + ":").toString("base64")}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Xendit API Error: ${response.statusText}`);
    }

    const data = await response.json();
    let status: "PENDING" | "PAID" | "FAILED" = "PENDING";
    let fee = data.fees ? data.fees.reduce((acc: number, f: any) => acc + f.value, 0) : 0;
    
    if (data.status === "PAID" || data.status === "SETTLED") {
      status = "PAID";
    } else if (data.status === "EXPIRED" || data.status === "FAILED") {
      status = "FAILED";
    }

    return {
      status,
      fee,
      net_amount: data.amount - fee,
      provider_response: data
    };
  }

  async refund(external_ref: string, amount?: number): Promise<boolean> {
    const secret = this.configService.get("XENDIT_SECRET_KEY");
    if (!secret) throw new Error("Xendit is not configured");

    // Important: Xendit requires invoice ID or payment ID based on payment channel.
    // Assuming external_ref is the invoice ID. 
    try {
      const response = await fetch(`https://api.xendit.co/refunds`, {
        method: "POST",
        headers: {
          "Authorization": `Basic ${Buffer.from(secret + ":").toString("base64")}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          invoice_id: external_ref,
          amount: amount,
          reason: "REQUESTED_BY_CUSTOMER"
        })
      });

      return response.ok;
    } catch (e: any) {
      console.error(`Xendit Refund Error [${external_ref}]: ${e.message}`);
      return false;
    }
  }
}
