import { Injectable, Logger } from '@nestjs/common';
import { APAgingService } from '../services/ap-aging.service';
import { APVendorBill } from '../domain/ap.interfaces';

@Injectable()
export class APAgingProjectionWorker {
  private readonly logger = new Logger(APAgingProjectionWorker.name);

  constructor(private readonly agingService: APAgingService) {}

  /**
   * Listens to AP events and updates the vendor's aging profile.
   */
  async handleEvent(event: any): Promise<void> {
    const { tenant_id, vendorId } = event.payload;

    this.logger.log(`Recalculating aging for Vendor ${vendorId}...`);

    // 1. Fetch outstanding bills
    const openBills = await this.fetchOpenBills(tenant_id, vendorId);

    // 2. Calculate buckets
    const newBucket = this.agingService.calculateAging(vendorId, openBills);

    // 3. Persist
    await this.persistBucket(newBucket);
    
    this.logger.log(`Aging updated for Vendor ${vendorId}.`);
  }

  private async fetchOpenBills(tenant_id: string, vendorId: string): Promise<APVendorBill[]> {
    return []; // Mock
  }

  private async persistBucket(bucket: any): Promise<void> {
    this.logger.debug(`Bucket Persisted: ${JSON.stringify(bucket)}`);
  }
}
