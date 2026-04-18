import { Injectable, Logger } from '@nestjs/common';
import { ARInvoice, ARPayment, ARPaymentAllocation } from '../domain/ar.interfaces';
import { PostingGatewayService } from './posting-gateway.service';
import { AccountingMappingService } from './accounting-mapping.service';
import { SubledgerEntryStatus, SubledgerEntryType } from '../entities/finance-subledger.entity';
import { v4 as uuid } from 'uuid';

@Injectable()
export class ARAllocationService {
  private readonly logger = new Logger(ARAllocationService.name);

  constructor(
    private readonly gateway: PostingGatewayService,
    private readonly mappingService: AccountingMappingService,
  ) {}

  /**
   * Allocates a payment amount to a specific invoice.
   * Standardized Lifecycle: PENDING -> VALIDATED -> POSTING -> POSTED
   */
  async allocate(payment: ARPayment, invoice: ARInvoice, amount: number): Promise<ARPaymentAllocation> {
    if (amount > payment.unallocatedAmount) throw new Error('Insufficient unallocated payment amount.');
    if (amount > invoice.balanceDue) throw new Error('Allocation exceeds invoice balance.');

    this.logger.log(`Allocating ${amount} from Payment ${payment.paymentNumber} to Invoice ${invoice.invoiceNumber}`);

    // 1. Resolve Accounting Mapping for ALLOCATION
    const mapping = await this.mappingService.resolveAccounts(
        payment.tenant_id,
        payment.company_id,
        SubledgerEntryType.AR_ALLOCATION,
        'ALLOCATION'
    );

    const postingRequestId = uuid();

    // 2. Create Allocation Record
    const allocation: ARPaymentAllocation = {
      id: `ALC-${Date.now()}`,
      paymentId: payment.id,
      invoiceId: invoice.id,
      amount,
      allocatedAt: new Date(),
    };

    // 3. Update balances (VALIDATED state)
    payment.unallocatedAmount -= amount;
    invoice.balanceDue -= amount;

    // 4. Trigger Financial Event (POSTING)
    const postingRequest = {
        request_id: postingRequestId,
        tenant_id: payment.tenant_id,
        company_id: payment.company_id,
        source_module: 'ACCOUNTS_RECEIVABLE',
        sourceEventId: allocation.id,
        event_type: SubledgerEntryType.AR_ALLOCATION,
        payload: {
          paymentId: payment.id,
          invoiceId: invoice.id,
          amount,
          currency: payment.currency,
          debitAccountId: mapping.debitAccountId,
          creditAccountId: mapping.creditAccountId,
          fiscalPeriodId: 'SYS_AUTO', // Real app resolves this
        },
        created_at: new Date(),
    };

    const result = await this.gateway.postEvent(postingRequest as any);
    
    if (result.status === 'POSTED') {
        this.logger.log(`AR Allocation ${allocation.id} successfully posted.`);
    }

    return allocation;
  }
}
