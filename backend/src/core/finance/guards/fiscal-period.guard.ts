import { Injectable, Logger, Inject } from '@nestjs/common';
import { IFiscalPeriodRepository } from '../repositories/interfaces/fiscal.repository.interface';
import { FiscalPeriodStatus } from '../domain/finance.constants';

@Injectable()
export class FiscalPeriodGuard {
  private readonly logger = new Logger(FiscalPeriodGuard.name);

  constructor(
    @Inject('IFiscalPeriodRepository')
    private readonly fiscalRepo: IFiscalPeriodRepository,
  ) {}

  /**
   * Validates if a fiscal period is open for posting.
   */
  async canPost(tenant_id: string, company_id: string, fiscalPeriodId: string): Promise<boolean> {
    const period = await this.fiscalRepo.findById(tenant_id, company_id, fiscalPeriodId);
    
    if (!period) {
      this.logger.error(`Fiscal period ${fiscalPeriodId} not found.`);
      return false;
    }

    if (period.status === FiscalPeriodStatus.CLOSED || period.status === FiscalPeriodStatus.HARD_LOCK) {
      this.logger.warn(`Posting blocked: Fiscal period ${fiscalPeriodId} is ${period.status}`);
      return false;
    }

    return true;
  }
}
