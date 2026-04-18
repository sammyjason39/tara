import { Injectable, Logger } from '@nestjs/common';
import { ARInvoice, ARAgingBucket } from '../domain/ar.interfaces';

@Injectable()
export class ARAgingService {
  private readonly logger = new Logger(ARAgingService.name);

  /**
   * Groups a list of invoices into aging buckets based on their due dates.
   */
  calculateAging(customer_id: string, invoices: ARInvoice[]): ARAgingBucket {
    const now = new Date();
    const bucket: ARAgingBucket = {
      customer_id,
      bucket0_30: 0,
      bucket31_60: 0,
      bucket61_90: 0,
      bucket91_plus: 0,
      updated_at: now,
    };

    for (const inv of invoices) {
      if (inv.balanceDue <= 0) continue;

      const diffDays = Math.floor((now.getTime() - inv.dueDate.getTime()) / (1000 * 3600 * 24));

      if (diffDays <= 0) {
        bucket.bucket0_30 += inv.balanceDue;
      } else if (diffDays <= 30) {
        bucket.bucket0_30 += inv.balanceDue;
      } else if (diffDays <= 60) {
        bucket.bucket31_60 += inv.balanceDue;
      } else if (diffDays <= 90) {
        bucket.bucket61_90 += inv.balanceDue;
      } else {
        bucket.bucket91_plus += inv.balanceDue;
      }
    }

    return bucket;
  }
}
