import { Injectable, Logger } from '@nestjs/common';
import { APVendorBill, APVendorAgingBucket } from '../domain/ap.interfaces';

@Injectable()
export class APAgingService {
  private readonly logger = new Logger(APAgingService.name);

  /**
   * Groups vendor bills into aging buckets based on their due dates.
   */
  calculateAging(vendorId: string, bills: APVendorBill[]): APVendorAgingBucket {
    const now = new Date();
    const bucket: APVendorAgingBucket = {
      vendorId,
      bucket0_30: 0,
      bucket31_60: 0,
      bucket61_90: 0,
      bucket91_plus: 0,
      updated_at: now,
    };

    for (const bill of bills) {
      if (bill.balanceDue <= 0) continue;

      const diffDays = Math.floor((now.getTime() - bill.dueDate.getTime()) / (1000 * 3600 * 24));

      if (diffDays <= 0) {
        bucket.bucket0_30 += bill.balanceDue;
      } else if (diffDays <= 30) {
        bucket.bucket0_30 += bill.balanceDue;
      } else if (diffDays <= 60) {
        bucket.bucket31_60 += bill.balanceDue;
      } else if (diffDays <= 90) {
        bucket.bucket61_90 += bill.balanceDue;
      } else {
        bucket.bucket91_plus += bill.balanceDue;
      }
    }

    return bucket;
  }
}
