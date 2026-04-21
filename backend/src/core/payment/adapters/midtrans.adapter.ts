import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PaymentAdapter, PaymentIntentResult } from "./payment.adapter.interface";

@Injectable()
export class MidtransAdapter implements PaymentAdapter {
  constructor(private configService: ConfigService) {}

  async isAvailable(tenant_id: string): Promise<boolean> {
    // Return true if MIDTRANS_SERVER_KEY is configured
    return !!this.configService.get("MIDTRANS_SERVER_KEY");
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
      throw new Error("Midtrans is not configured");
    }

    // Mock implementation returning a dummy payment URL
    return {
      transaction_id: `mdt_${Date.now()}`,
      checkout_url: `https://app.sandbox.midtrans.com/snap/v2/vtweb/${data.order_id}`,
    };
  }

  async handleWebhook(payload: any, signature: string, secret?: string) {
    if (!(await this.isAvailable(""))) {
      throw new Error("Midtrans is not configured");
    }

    // Stub logic
    const external_ref = payload.order_id;
    const status = payload.transaction_status === "settlement" ? "PAID" : "FAILED";
    const gross = payload.gross_amount;
    const fee = payload.fee || 0; // Simulated

    return {
      external_ref,
      status: status as "PAID" | "FAILED",
      gross_amount: Number(gross),
      gateway_fee: fee,
      net_amount: Number(gross) - fee,
      raw_event: payload,
    };
  }

  async checkStatus(external_ref: string): Promise<{
    status: "PENDING" | "PAID" | "FAILED";
    fee?: number;
    net_amount?: number;
    provider_response: any;
  }> {
    const secret = this.configService.get("MIDTRANS_SERVER_KEY");
    if (!secret) throw new Error("Midtrans is not configured");

    const isSandbox = secret.includes("SB-");
    const baseUrl = isSandbox ? "https://api.sandbox.midtrans.com" : "https://api.midtrans.com";

    const response = await fetch(`${baseUrl}/v2/${external_ref}/status`, {
      method: "GET",
      headers: {
        "Authorization": `Basic ${Buffer.from(secret + ":").toString("base64")}`,
        "Accept": "application/json",
      },
    });

    if (!response.ok && response.status !== 404) {
      throw new Error(`Midtrans API Error: ${response.statusText}`);
    }

    const data = await response.json();
    let status: "PENDING" | "PAID" | "FAILED" = "PENDING";
    
    if (data.transaction_status === "settlement" || data.transaction_status === "capture") {
      status = "PAID";
    } else if (data.transaction_status === "cancel" || data.transaction_status === "expire" || data.transaction_status === "deny") {
      status = "FAILED";
    }

    const gross = Number(data.gross_amount || 0);
    // Note: Midtrans does not always return exact fee in status API, often requires fetching from dashboard or webhook payload. We fallback to 0.
    const fee = 0; 

    return {
      status,
      fee,
      net_amount: gross - fee,
      provider_response: data
    };
  }

  async refund(external_ref: string, amount?: number): Promise<boolean> {
    const secret = this.configService.get("MIDTRANS_SERVER_KEY");
    if (!secret) throw new Error("Midtrans is not configured");

    const isSandbox = secret.includes("SB-");
    const baseUrl = isSandbox ? "https://api.sandbox.midtrans.com" : "https://api.midtrans.com";

    try {
      const response = await fetch(`${baseUrl}/v2/${external_ref}/refund`, {
        method: "POST",
        headers: {
          "Authorization": `Basic ${Buffer.from(secret + ":").toString("base64")}`,
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
        body: JSON.stringify({
          amount: amount,
          reason: "Requested by Merchant"
        })
      });

      return response.ok;
    } catch (e: any) {
      console.error(`Midtrans Refund Error [${external_ref}]: ${e.message}`);
      return false;
    }
  }
}
