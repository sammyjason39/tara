import { Injectable, Logger } from '@nestjs/common';
import { APVendorPayment } from '../domain/ap.interfaces';
import { PostingGatewayService } from './posting-gateway.service';

@Injectable()
export class APPaymentService {
  private readonly logger = new Logger(APPaymentService.name);

  constructor(private readonly gateway: PostingGatewayService) {}

  /**
   * Executes a vendor payment and triggers financial posting.
   */
  async executePayment(payment: APVendorPayment): Promise<void> {
    this.logger.log(`Executing Payment ${payment.paymentNumber} of ${payment.amount} ${payment.currency}`);

    // Map to UFPG Event
    const postingRequest = {
        request_id: `AP-PAY-${payment.id}`,
        tenant_id: payment.tenant_id,
        company_id: payment.company_id,
        source_module: 'ACCOUNTS_PAYABLE',
        sourceEventId: payment.id,
        event_type: 'VENDOR_PAYMENT_CREATED',
        eventVersion: '1.0.0',
        schemaVersion: '2026-Q1',
        payload: {
          vendorId: payment.vendorId,
          amount: payment.amount,
          currency: payment.currency,
          fiscalPeriodId: '2026-03',
        },
        created_at: new Date(),
    };

    const result = await this.gateway.postEvent(postingRequest as any);
    
    if (result.status === 'POSTED') {
      this.logger.log(`Payment ${payment.paymentNumber} successfully posted.`);
    } else {
      this.logger.error(`Failed to post payment: ${result.errorMessage}`);
      throw new Error(`Financial posting failed: ${result.errorMessage}`);
    }
  }
}
