export interface PaymentIntentResult {
  transaction_id?: string;
  client_secret?: string;
  checkout_url?: string;
  qr_code?: string;
}

export interface PaymentAdapter {
  createPaymentIntent(data: {
    amount: number;
    currency: string;
    tenant_id: string;
    order_id: string;
    transfer_data?: { destination: string };
    application_fee_amount?: number;
  }): Promise<PaymentIntentResult>;

  handleWebhook(payload: any, signature: string, secret?: string): Promise<{
    external_ref: string;
    status: "PAID" | "FAILED";
    gross_amount: number;
    gateway_fee: number;
    net_amount: number;
    provider_fee_details?: any;
    raw_event: any;
  }>;

  checkStatus(external_ref: string): Promise<{
    status: "PENDING" | "PAID" | "FAILED";
    fee?: number;
    net_amount?: number;
    provider_response: any;
  }>;

  refund(external_ref: string, amount?: number): Promise<boolean>;

  isAvailable(tenant_id: string): Promise<boolean>;
}
