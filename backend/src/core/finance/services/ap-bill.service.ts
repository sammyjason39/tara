import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { APVendorBill, BillStatus } from '../domain/ap.interfaces';
import { PostingGatewayService } from './posting-gateway.service';
import { FiscalPeriodService } from './fiscal-period.service';
import { AccountingMappingService } from './accounting-mapping.service';
import { SubledgerEntryStatus, SubledgerEntryType, FinanceSubledgerEntry, AccountingDirection } from '../entities/finance-subledger.entity';
import { v4 as uuid } from 'uuid';
import { TaxEngineService } from './tax-engine.service';
import { WorkflowIntegrationService } from './workflow-integration.service';
import { ExpensePolicyService } from './expense-policy.service';



@Injectable()
export class APBillService {
  private readonly logger = new Logger(APBillService.name);

  constructor(
    private readonly gateway: PostingGatewayService,
    private readonly fiscalPeriodService: FiscalPeriodService,
    private readonly mappingService: AccountingMappingService,
    private readonly repository: any, // Generic repo for subledger
    private readonly taxEngineService: TaxEngineService,
    private readonly workflowService: WorkflowIntegrationService,
    private readonly expensePolicyService: ExpensePolicyService,
  ) {}



  /**
   * Approves a vendor bill and triggers financial posting.
   * Standardized Lifecycle: PENDING -> VALIDATED -> POSTING -> POSTED
   */
  async approveBill(tenantId: string, companyId: string, billId: string, approverId: string): Promise<any> {
    const bill = await this.repository.findById(tenantId, companyId, billId);
    if (!bill) throw new Error('Bill not found');

    // 1. Evaluate Expense Policy
    const policyResult = await this.expensePolicyService.evaluateExpense(tenantId, 'AP_BILL', bill.totalAmount);
    if (policyResult.status === 'REJECTED') {
        throw new Error(`Bill rejected by expense policy: ${policyResult.reason}`);
    }

    // 2. Submit for Approval in Workflow engine
    await this.workflowService.submitForApproval(tenantId, 'AP_BILL', billId, approverId, {
        amount: bill.totalAmount,
        vendor: bill.vendorName
    });

    // 3. Update status to VALIDATED
    // 4. Resolve Open Fiscal Period & VALIDATE
    const currentPeriodId = await this.fiscalPeriodService.validatePeriodOpenForPosting(
      bill.tenantId, 
      bill.companyId, 
      'SYS_AUTO', 
      'SYS_USER'
    );

    // 2. Resolve Accounting Accounts
    const mapping = await this.mappingService.resolveAccounts(
        bill.tenantId,
        bill.companyId,
        SubledgerEntryType.AP_EXPENSE,
        'BILL'
    );

    const postingRequestId = uuid();

    // 3. Create Subledger Entry (State: VALIDATED)
    // Micro-Hardened with Source Module, Direction, and FX context
    const subledgerEntry: Partial<FinanceSubledgerEntry> = {
        id: uuid(),
        tenantId: bill.tenantId,
        companyId: bill.companyId,
        sourceModule: 'ACCOUNTS_PAYABLE', // Explicit source
        referenceType: 'BILL',
        referenceId: bill.id,
        postingRequestId,
        entryType: SubledgerEntryType.AP_EXPENSE,
        status: SubledgerEntryStatus.VALIDATED,
        direction: AccountingDirection.CREDIT, // Credit AP Liability
        amount: bill.totalAmount,
        currency: bill.currency,
        baseAmount: bill.totalAmount, // Minimal FX - assumes functional currency for now
        baseCurrency: 'USD',
        exchangeRate: new Prisma.Decimal(1.0),
        debitAccountId: mapping.debitAccountId,
        creditAccountId: mapping.creditAccountId,
        accountingPeriodId: currentPeriodId,
        effectiveDate: new Date(), // Business date (Audit Hardening)
        createdAt: new Date(),
    };
    
    // In production, save(subledgerEntry) happens here

    // 3.5 Calculate Tax
    const taxResults = await this.taxEngineService.calculateTax(
      bill.tenantId,
      'BRANCH_AUTO',
      'ID',
      bill.totalAmount,
      'AP_BILL'
    );

    // 4. Update to POSTING

    subledgerEntry.status = SubledgerEntryStatus.POSTING;

    // 5. Map to UFPG Event
    const postingRequest = {
        requestId: postingRequestId,
        tenantId: bill.tenantId,
        companyId: bill.companyId,
        sourceModule: subledgerEntry.sourceModule,
        sourceEventId: bill.id,
        eventType: 'VENDOR_BILL_APPROVED',
        payload: {
          vendorId: bill.vendorId,
          totalAmount: bill.totalAmount,
          currency: bill.currency,
          fiscalPeriodId: currentPeriodId,
          debitAccountId: subledgerEntry.debitAccountId,
          creditAccountId: subledgerEntry.creditAccountId,
          direction: subledgerEntry.direction,
          baseAmount: subledgerEntry.baseAmount,
          exchangeRate: subledgerEntry.exchangeRate,
          taxLines: taxResults,
        },
        createdAt: new Date(),
    };


    // ATOMICITY GUARD: Post to Gateway
    const result = await this.gateway.postEvent(postingRequest as any);
    
    if (result.status === 'POSTED') {
      bill.status = BillStatus.APPROVED;
      subledgerEntry.status = SubledgerEntryStatus.POSTED;
      subledgerEntry.glJournalId = result.journalId;
      subledgerEntry.postedAt = new Date();
      this.logger.log(`Bill ${bill.billNumber} successfully posted: ${result.journalId}`);
    } else {
      subledgerEntry.status = SubledgerEntryStatus.FAILED;
      subledgerEntry.failureType = 'INTEGRATION_ERROR';
      subledgerEntry.failureMessage = result.errorMessage;
      this.logger.error(`Failed to post bill: ${result.errorMessage}`);
      throw new Error(`Financial posting failed: ${result.errorMessage}`);
    }
  }

  /**
   * VOID Logic: Allowed ONLY before POSTED
   */
  async voidBill(bill: APVendorBill): Promise<void> {
    if (bill.status === BillStatus.APPROVED) {
        throw new Error('Cannot VOID a posted bill. Use REVERSAL workflow instead.');
    }
    
    bill.status = BillStatus.VOIDED as any;
    this.logger.log(`Bill ${bill.id} marked as VOIDED (Operational level).`);
  }
}
