import { Injectable, BadRequestException, Inject, Logger } from '@nestjs/common';
import { IFiscalPeriodRepository } from '../repositories/interfaces/fiscal.repository.interface';
import { IJournalRepository } from '../repositories/interfaces/journal.repository.interface';
import { FiscalPeriodStatus } from '../domain/finance.constants';
import { FinanceFiscalPeriod, FinanceFiscalYear, PeriodClosingRecord } from '../domain/finance.interfaces';

@Injectable()
export class FiscalPeriodService {
  private readonly logger = new Logger(FiscalPeriodService.name);

  constructor(
    @Inject('IFiscalPeriodRepository')
    private readonly fiscalRepo: IFiscalPeriodRepository,
    @Inject('IJournalRepository')
    private readonly journalRepo: IJournalRepository,
  ) {}

  async validatePeriodOpenForPosting(tenant_id: string, company_id: string, source: string, user_id: string): Promise<string> {
    // Standard implementation: Find current open period.
    // In many Zenvix modules, we fetch the latest "OPEN" period.
    const years = await this.listYears(tenant_id, company_id);
    if (!years.length) throw new BadRequestException('No fiscal years defined');
    
    const latestYear = years[0];
    const periods = await this.fiscalRepo.findPeriods(tenant_id, company_id, latestYear.id);
    const openPeriod = periods.find(p => p.status === FiscalPeriodStatus.OPEN);
    
    if (!openPeriod) {
      throw new BadRequestException('Posting Error: No open fiscal period found for the current date.');
    }
    
    return openPeriod.id;
  }

  async getPeriod(tenant_id: string, company_id: string, id: string): Promise<FinanceFiscalPeriod> {
    const period = await this.fiscalRepo.findById(tenant_id, company_id, id);
    if (!period) throw new BadRequestException(`Fiscal period ${id} not found`);
    return period;
  }

  async getClosingRecord(tenant_id: string, company_id: string, periodId: string): Promise<PeriodClosingRecord | null> {
    return this.fiscalRepo.getClosingRecord(tenant_id, company_id, periodId);
  }

  async listYears(tenant_id: string, company_id: string): Promise<FinanceFiscalYear[]> {
    // IFiscalPeriodRepository needs to support listYears or we derive it from findYear
    // For now, returning a mock or calling repository if updated.
    const currentYear = new Date().getFullYear();
    const year = await this.fiscalRepo.findYear(tenant_id, company_id, currentYear);
    return year ? [year] : [];
  }

  async validateTransition(tenant_id: string, company_id: string, periodId: string, targetStatus: FiscalPeriodStatus): Promise<void> {
    const period = await this.getPeriod(tenant_id, company_id, periodId);
    const currentStatus = period.status as FiscalPeriodStatus;
    
    const allowedTransitions: Record<FiscalPeriodStatus, FiscalPeriodStatus[]> = {
      [FiscalPeriodStatus.OPEN]: [FiscalPeriodStatus.SOFT_LOCK, FiscalPeriodStatus.CLOSING, FiscalPeriodStatus.HARD_LOCK],
      [FiscalPeriodStatus.SOFT_LOCK]: [FiscalPeriodStatus.OPEN, FiscalPeriodStatus.HARD_LOCK],
      [FiscalPeriodStatus.CLOSING]: [FiscalPeriodStatus.CLOSED, FiscalPeriodStatus.OPEN],
      [FiscalPeriodStatus.CLOSED]: [FiscalPeriodStatus.OPEN, FiscalPeriodStatus.HARD_LOCK],
      [FiscalPeriodStatus.HARD_LOCK]: [],
    };

    const allowed = allowedTransitions[currentStatus] || [];
    if (!allowed.includes(targetStatus)) {
      throw new BadRequestException(`Invalid State Transition: ${currentStatus} -> ${targetStatus}`);
    }

    // BUG-5 FIX: Auto-void DRAFT journals when transitioning to HARD_LOCK
    if (targetStatus === FiscalPeriodStatus.HARD_LOCK) {
      const draftCount = await this.journalRepo.countDraftsInPeriod(tenant_id, company_id, periodId);
      if (draftCount > 0) {
        this.logger.log(`Auto-voiding ${draftCount} DRAFT journals in period ${periodId} before HARD_LOCK transition`);
        await this.journalRepo.voidDraftsInPeriod(tenant_id, company_id, periodId);
      }
    }

    // Guard: No DRAFT journals allowed in locked/closing periods
    if ([FiscalPeriodStatus.SOFT_LOCK, FiscalPeriodStatus.HARD_LOCK, FiscalPeriodStatus.CLOSING].includes(targetStatus)) {
      const draftCount = await this.journalRepo.countDraftsInPeriod(tenant_id, company_id, periodId);
      if (draftCount > 0) {
        throw new BadRequestException(`Cannot transition to ${targetStatus}: ${draftCount} DRAFT journals remain in period ${periodId}. Please post or void them.`);
      }
    }
  }

  async transitionStatus(tenant_id: string, company_id: string, periodId: string, status: FiscalPeriodStatus, user_id: string): Promise<FinanceFiscalPeriod> {
    await this.validateTransition(tenant_id, company_id, periodId, status);
    return this.fiscalRepo.updateStatus(tenant_id, company_id, periodId, status);
  }
}
