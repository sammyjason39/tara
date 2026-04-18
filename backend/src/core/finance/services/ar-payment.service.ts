import { Injectable, Logger } from '@nestjs/common';
import { ARPayment } from '../domain/ar.interfaces';
import { PostingGatewayService } from './posting-gateway.service';
import { ExchangeRateService } from './exchange-rate.service';

@Injectable()
export class ARPaymentService {
  private readonly logger = new Logger(ARPaymentService.name);

  constructor(
    private readonly gateway: PostingGatewayService,
    private readonly exchangeRateService: ExchangeRateService,
  ) {}

  /**
   * Processes an incoming payment, normalizes currency, and triggers financial posting.
   */
  async processPayment(payment: ARPayment): Promise<void> {
    this.logger.log(`Processing Payment ${payment.paymentNumber} of ${payment.amount} ${payment.currency}`);

    // 1. Get Exchange Rate for multi-currency safety
    const rateInfo = await this.exchangeRateService.getRate(payment.currency, 'USD');

    // 2. Trigger Financial Event: PAYMENT_RECEIVED
    const postingRequest = {
        request_id: `AR-PAY-${payment.id}`,
        tenant_id: payment.tenant_id,
        company_id: payment.company_id,
        source_module: 'ACCOUNTS_RECEIVABLE',
        sourceEventId: payment.id,
        event_type: 'PAYMENT_RECEIVED',
        eventVersion: '1.0.0',
        schemaVersion: '2026-Q1',
        payload: {
          customer_id: payment.customer_id,
          amount: payment.amount,
          currency: payment.currency,
          exchangeRate: rateInfo.rate,
          fiscalPeriodId: '2026-03',
        },
        created_at: new Date(),
    };

    const result = await this.gateway.postEvent(postingRequest as any);

    if (result.status === 'POSTED') {
      this.logger.log(`Payment ${payment.paymentNumber} posted to ledger. Status: ${result.status}`);
    } else {
      throw new Error(`Payment posting failed: ${result.errorMessage}`);
    }
  }
}
