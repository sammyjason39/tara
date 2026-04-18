import { Injectable, Inject, BadRequestException, NotFoundException } from '@nestjs/common';
import { IArCreditMemoRepository } from '../repositories/interfaces/ar-credit-memo.repository.interface';
import { LedgerPostingService } from '../../services/ledger-posting.service';
import { FiscalPeriodService } from '../../services/fiscal-period.service';
import { IArCreditMemo } from '../domain/ar.interfaces';
import { AR_EVENT_TYPES } from '../domain/ar.constants';

@Injectable()
export class ArCreditMemoService {
  constructor(
    @Inject('IArCreditMemoRepository')
    private readonly creditMemoRepo: IArCreditMemoRepository,
    private readonly ledgerPostingService: LedgerPostingService,
    private readonly fiscalPeriodService: FiscalPeriodService,
  ) {}

  async issueCreditMemo(tenant_id: string, company_id: string, data: any): Promise<IArCreditMemo> {
    // Audit check
    await this.fiscalPeriodService.validatePeriodOpenForPosting(tenant_id, company_id, 'FISCAL_AUTO', 'SYS_USER');

    const creditMemo = await this.creditMemoRepo.create(tenant_id, company_id, data);

    // Enqueue for Ledger
    await this.ledgerPostingService.enqueuePosting(
      tenant_id,
      company_id,
      AR_EVENT_TYPES.CREDIT_MEMO_ISSUED,
      `ar-cm-${creditMemo.id}`,
      {
        creditMemoId: creditMemo.id,
        amount: creditMemo.creditAmount,
        customer_id: creditMemo.customer_id,
        branch_id: 'BRANCH_AUTO',
        location_id: 'LOC_AUTO',
        fiscalPeriodId: 'FISCAL_AUTO',
      }
    );

    return creditMemo;
  }
}
