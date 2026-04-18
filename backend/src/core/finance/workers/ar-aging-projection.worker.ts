import { Injectable, Logger } from '@nestjs/common';
import { ARAgingService } from '../services/ar-aging.service';
import { ARInvoice } from '../domain/ar.interfaces';

@Injectable()
export class ARAgingProjectionWorker {
  private readonly logger = new Logger(ARAgingProjectionWorker.name);

  constructor(private readonly agingService: ARAgingService) {}

  /**
   * Listens to Ledger/Gateway events and updates the customer's aging profile.
   * In production, this would be a @SqsConsumer or @KafkaListener.
   */
  async handleEvent(event: any): Promise<void> {
    const { tenant_id, customer_id } = event.payload;

    this.logger.log(`Received trigger for Customer ${customer_id}. Recalculating aging...`);

    // 1. Fetch all outstanding invoices for the customer
    const openInvoices = await this.fetchOpenInvoices(tenant_id, customer_id);

    // 2. Calculate new buckets
    const newBucket = this.agingService.calculateAging(customer_id, openInvoices);

    // 3. Persist to ARAgingBucket table
    await this.persistBucket(newBucket);
    
    this.logger.log(`Aging buckets updated for Customer ${customer_id}.`);
  }

  private async fetchOpenInvoices(tenant_id: string, customer_id: string): Promise<ARInvoice[]> {
    // Mock fetch logic
    return [];
  }

  private async persistBucket(bucket: any): Promise<void> {
    // Mock persistence logic
    this.logger.debug(`Bucket Persisted: ${JSON.stringify(bucket)}`);
  }
}
