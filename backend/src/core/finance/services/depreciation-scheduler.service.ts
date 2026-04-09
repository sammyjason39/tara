import { Injectable, Logger, Inject } from '@nestjs/common';
import { Asset, DepreciationSchedule, DepreciationRun } from '../domain/asset.interfaces';
import { Prisma } from '@prisma/client';
import { PostingGatewayService } from './posting-gateway.service';
import { FiscalPeriodService } from './fiscal-period.service';
import { AccountingMappingService } from './accounting-mapping.service';
import { SubledgerEntryStatus, SubledgerEntryType, FinanceSubledgerEntry, AccountingDirection } from '../entities/finance-subledger.entity';
import { IAssetCategoryRepository } from '../repositories/interfaces/asset-category.repository.interface';
import { v4 as uuid } from 'uuid';

@Injectable()
export class DepreciationScheduler {
  private readonly logger = new Logger(DepreciationScheduler.name);

  constructor(
    private readonly gateway: PostingGatewayService,
    private readonly fiscalPeriodService: FiscalPeriodService,
    private readonly mappingService: AccountingMappingService,
    @Inject('IAssetCategoryRepository')
    private readonly categoryRepo: IAssetCategoryRepository,
  ) {}

  /**
   * Runs depreciation for a collection of assets.
   * Standardized Lifecycle: PENDING -> VALIDATED -> POSTING -> POSTED
   */
  async runBatchDepreciation(assets: Asset[]): Promise<DepreciationRun> {
    const runId = `DEPR-RUN-${Date.now()}`;
    const run: DepreciationRun = {
      id: runId,
      runDate: new Date(),
      assetsProcessed: 0,
      totalDepreciationPosted: new Prisma.Decimal(0),
      status: 'STARTED',
    };

    const currentPeriodId = await this.fiscalPeriodService.validatePeriodOpenForPosting(
      assets[0]?.tenantId || 'DEFAULT', 
      assets[0]?.companyId || 'DEFAULT', 
      'SYS_AUTO', 
      'SYSTEM'
    );

    for (const asset of assets) {
      const pendingPeriod: DepreciationSchedule = { 
        id: `DEPR-${asset.id}-${currentPeriodId}`, 
        assetId: asset.id, 
        amount: new Prisma.Decimal(100), 
        periodDate: new Date(), 
        status: 'PENDING' 
      };

      try {
        await this.runDepreciation(pendingPeriod, asset, currentPeriodId, runId);
        run.assetsProcessed++;
        run.totalDepreciationPosted = run.totalDepreciationPosted.plus(pendingPeriod.amount);
      } catch (err) {
        this.logger.error(`Failed to process asset ${asset.id}: ${err.message}`);
      }
    }

    run.status = 'COMPLETED';
    return run;
  }

  /**
   * Triggers the periodic depreciation posting via UFPG.
   */
  async runDepreciation(scheduleItem: DepreciationSchedule, asset: Asset, periodId: string, runId: string): Promise<void> {
    // 1. Resolve Accounting Mapping
    const mapping = await this.mappingService.resolveAccounts(
        asset.tenantId,
        asset.companyId,
        SubledgerEntryType.ASSET_DEPRECIATION,
        'ASSET_RUN'
    );

    const postingRequestId = `ASSET-DEPR-${asset.id}-${periodId}`;

    // 2. Create Asset Subledger Entry (VALIDATED)
    // Micro-Hardened with Source Module, Direction, and FX context
    const subledgerEntry: Partial<FinanceSubledgerEntry> = {
        id: uuid(),
        tenantId: asset.tenantId,
        companyId: asset.companyId,
        sourceModule: 'ASSET_MANAGEMENT',
        referenceType: 'ASSET_RUN',
        referenceId: runId,
        referenceLineId: asset.id,
        postingRequestId,
        entryType: SubledgerEntryType.ASSET_DEPRECIATION,
        status: SubledgerEntryStatus.VALIDATED,
        direction: AccountingDirection.DEBIT, // Debit Depreciation Expense
        amount: scheduleItem.amount,
        currency: asset.currency,
        baseAmount: scheduleItem.amount,
        baseCurrency: 'USD',
        exchangeRate: new Prisma.Decimal(1.0),
        debitAccountId: mapping.debitAccountId,
        creditAccountId: mapping.creditAccountId,
        accountingPeriodId: periodId,
        effectiveDate: new Date(), // Business date (Audit Hardening)
        createdAt: new Date(),
    };

    // 3. Map to UFPG Event (POSTING)
    subledgerEntry.status = SubledgerEntryStatus.POSTING;

    const postingRequest = {
        requestId: postingRequestId,
        tenantId: asset.tenantId,
        companyId: asset.companyId,
        sourceModule: subledgerEntry.sourceModule,
        sourceEventId: scheduleItem.id,
        eventType: SubledgerEntryType.ASSET_DEPRECIATION,
        payload: {
          assetId: asset.id,
          amount: scheduleItem.amount,
          currency: asset.currency,
          debitAccountId: mapping.debitAccountId,
          creditAccountId: mapping.creditAccountId,
          direction: subledgerEntry.direction,
          baseAmount: subledgerEntry.baseAmount,
          exchangeRate: subledgerEntry.exchangeRate,
          fiscalPeriodId: periodId,
          runId,
        },
        createdAt: new Date(),
    };

    const result = await this.gateway.postEvent(postingRequest as any);
    
    if (result.status === 'POSTED') {
      scheduleItem.status = 'POSTED';
      subledgerEntry.status = SubledgerEntryStatus.POSTED;
      subledgerEntry.glJournalId = result.journalId;
      this.logger.log(`Depreciation for asset ${asset.id} successfully posted.`);
    }
  }
}
