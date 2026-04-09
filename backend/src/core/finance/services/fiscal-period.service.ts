import { Injectable, BadRequestException, Inject } from '@nestjs/common';
import { IFiscalPeriodRepository } from '../repositories/interfaces/fiscal.repository.interface';
import { IJournalRepository } from '../repositories/interfaces/journal.repository.interface';
import { FiscalPeriodStatus } from '../domain/finance.constants';
import { FinanceFiscalPeriod, FinanceFiscalYear, PeriodClosingRecord } from '../domain/finance.interfaces';

@Injectable()
export class FiscalPeriodService {
  constructor(
    private readonly fiscalRepo: IFiscalPeriodRepository,
    @Inject('IJournalRepository')
    private readonly journalRepo: IJournalRepository,
  ) {}

  async validatePeriodOpenForPosting(tenantId: string, companyId: string, source: string, userId: string): Promise<string> {
    // Standard implementation: Find current open period.
    // In many Zenvix modules, we fetch the latest "OPEN" period.
    const years = await this.listYears(tenantId, companyId);
    if (!years.length) throw new BadRequestException('No fiscal years defined');
    
    const latestYear = years[0];
    const periods = await this.fiscalRepo.findPeriods(tenantId, companyId, latestYear.id);
    const openPeriod = periods.find(p => p.status === FiscalPeriodStatus.OPEN);
    
    if (!openPeriod) {
      throw new BadRequestException('Posting Error: No open fiscal period found for the current date.');
    }
    
    return openPeriod.id;
  }

  async getPeriod(tenantId: string, companyId: string, id: string): Promise<FinanceFiscalPeriod> {
    const period = await this.fiscalRepo.findById(tenantId, companyId, id);
    if (!period) throw new BadRequestException(`Fiscal period ${id} not found`);
    return period;
  }

  async getClosingRecord(tenantId: string, companyId: string, periodId: string): Promise<PeriodClosingRecord | null> {
    return this.fiscalRepo.getClosingRecord(tenantId, companyId, periodId);
  }

  async listYears(tenantId: string, companyId: string): Promise<FinanceFiscalYear[]> {
    // IFiscalPeriodRepository needs to support listYears or we derive it from findYear
    // For now, returning a mock or calling repository if updated.
    const currentYear = new Date().getFullYear();
    const year = await this.fiscalRepo.findYear(tenantId, companyId, currentYear);
    return year ? [year] : [];
  }

  async validateTransition(tenantId: string, companyId: string, periodId: string, targetStatus: FiscalPeriodStatus): Promise<void> {
    const period = await this.getPeriod(tenantId, companyId, periodId);
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

    // Guard: No DRAFT journals allowed in locked/closing periods
    if ([FiscalPeriodStatus.SOFT_LOCK, FiscalPeriodStatus.HARD_LOCK, FiscalPeriodStatus.CLOSING].includes(targetStatus)) {
      const draftCount = await this.journalRepo.countDraftsInPeriod(tenantId, companyId, periodId);
      if (draftCount > 0) {
        throw new BadRequestException(`Cannot transition to ${targetStatus}: ${draftCount} DRAFT journals remain in period ${periodId}. Please post or void them.`);
      }
    }
  }

  async transitionStatus(tenantId: string, companyId: string, periodId: string, status: FiscalPeriodStatus, userId: string): Promise<FinanceFiscalPeriod> {
    await this.validateTransition(tenantId, companyId, periodId, status);
    return this.fiscalRepo.updateStatus(tenantId, companyId, periodId, status);
  }
}
