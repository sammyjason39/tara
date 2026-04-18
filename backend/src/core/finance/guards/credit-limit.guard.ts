import { Injectable, Logger } from '@nestjs/common';
import { ARCustomerBalance } from '../domain/ar.interfaces';

@Injectable()
export class CreditLimitGuard {
  private readonly logger = new Logger(CreditLimitGuard.name);

  /**
   * Checks if an invoice approval would exceed the customer's credit limit.
   */
  async checkLimit(balance: ARCustomerBalance, newInvoiceAmount: number): Promise<boolean> {
    const projectedExposure = balance.totalBalance + newInvoiceAmount;
    
    if (projectedExposure > balance.creditLimit) {
      this.logger.warn(`Credit Limit Breach: Customer ${balance.customer_id} (Limit: ${balance.creditLimit}, Exposure: ${projectedExposure})`);
      return false;
    }

    return true;
  }
}
