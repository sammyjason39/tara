import { Module, Global, OnModuleInit, Logger, forwardRef, Inject } from '@nestjs/common';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { assertFinanceExecutionSafety, getFinanceExecutionMode, FinanceExecutionMode } from './utils/finance-safety.utils';
import { FinanceController } from './finance.controller';
import { FinanceService } from './finance.service';
import { ChartOfAccountService } from './services/chart-of-account.service';
import { FiscalPeriodService } from './services/fiscal-period.service';
import { PostingRuleService } from './services/posting-rule.service';
import { TrialBalanceVerificationService } from './services/trial-balance-verification.service';
import { LedgerPostingService } from './services/ledger-posting.service';
import { JournalReversalService } from './services/journal-reversal.service';
import { JournalValidationService } from './services/journal-validation.service';
import { DimensionValidationService } from './services/dimension-validation.service';
import { SnapshotEngineService } from './services/snapshot-engine.service';
import { LedgerIntegrityService } from './services/ledger-integrity.service';
import { LedgerInvariantService } from './services/ledger-invariant.service';
import { LedgerArchitectureGuard } from './services/ledger-architecture-guard.service';
import { LedgerDlqReplayService } from './services/ledger-dlq-replay.service';
import { LedgerMerkleCheckpointService } from './services/ledger-merkle-checkpoint.service';
import { LedgerWorkerService } from './workers/ledger-worker.service';
import { LedgerEventIngestionWorker } from './services/ledger-event-ingestion-worker.service';
import { LedgerEventLogRetentionService } from './services/ledger-event-log-retention.service';
import { FinancialProjectionWorkerService } from './services/financial-projection-worker.service';
import { ProjectionRebuildService } from './services/projection-rebuild.service';
import { FinancialSnapshotService } from './services/financial-snapshot.service';
import { AccountingMappingService } from './services/accounting-mapping.service';
import { ReportDefinitionRegistry } from './domain/report-definition.registry';
import { ProjectionCheckpointService } from './services/projection-checkpoint.service';
import { ProfitLossService } from './services/profit-loss.service';
import { BalanceSheetService } from './services/balance-sheet.service';
import { CashFlowService } from './services/cash-flow.service';
import { FinancialReportService } from './services/financial-report.service';
import { ReportingEngineService } from './services/reporting-engine.service';
import { PeriodClosingService } from './services/period-closing.service';
import { ArCreditMemoService } from './ar/services/ar-credit-memo.service';

// Repositories
import { CoaDbRepository } from './repositories/coa.db.repository';
import { FiscalPeriodDbRepository } from './repositories/fiscal-period.db.repository';
import { PostingRuleDbRepository } from './repositories/posting-rule.db.repository';
import { LedgerPostingDbRepository } from './repositories/ledger-posting.db.repository';
import { JournalDbRepository } from './repositories/journal.db.repository';
import { JournalReversalDbRepository } from './repositories/journal-reversal.db.repository';
import { AccountBalanceDbRepository } from './repositories/account-balance.db.repository';
import { LedgerEventLogDbRepository } from './repositories/ledger-event-log.db.repository';
import { AssetDbRepository } from './repositories/asset.db.repository';
import { PayrollDbRepository } from './repositories/payroll.db.repository';
import { ArInvoiceDbRepository } from './ar/repositories/ar-invoice.db.repository';
import { ArPaymentDbRepository } from './ar/repositories/ar-payment.db.repository';
import { ArCustomerDbRepository } from './ar/repositories/ar-customer.db.repository';
import { ArCustomerCreditDbRepository } from './ar/repositories/ar-customer-credit.db.repository';
import { ArCreditMemoDbRepository } from './ar/repositories/ar-credit-memo.db.repository';
import { InventorySubledgerDbRepository } from './subledger/repositories/inventory-subledger.db.repository';
import { DbUnitOfWork } from './repositories/uow.db';
import { IFinanceRepository } from './repositories/finance.repository.interface';
import { FinanceDbRepository } from './repositories/finance.db.repository';
import { AssetService } from './services/asset.service';
import { DepreciationScheduler } from './services/depreciation-scheduler.service';

// Mocks
import { CoaMockRepository } from './repositories/coa.mock.repository';
import { FiscalMockRepository } from './repositories/fiscal.mock.repository';
import { PostingRuleMockRepository } from './repositories/posting-rule.mock.repository';
import { LedgerPostingMockRepository } from './repositories/ledger-posting.mock.repository';
import { JournalMockRepository } from './repositories/journal.mock.repository';
import { JournalReversalMockRepository } from './repositories/journal-reversal.mock.repository';
import { AccountBalanceMockRepository } from './repositories/account-balance.mock.repository';
import { LedgerEventLogMockRepository } from './repositories/ledger-event-log.mock.repository';
import { AssetMockRepository } from './repositories/asset.mock.repository';
import { FinanceMockRepository } from './repositories/finance.mock.repository';
import { MockUnitOfWork as UowMock } from './repositories/uow.mock';
import { ArInvoiceMockRepository } from './ar/repositories/ar-invoice.mock.repository';
import { ArPaymentMockRepository } from './ar/repositories/ar-payment.mock.repository';
import { ArCustomerMockRepository } from './ar/repositories/ar-customer.mock.repository';
import { ArCustomerCreditMockRepository } from './ar/repositories/ar-customer-credit.mock.repository';
import { ArCreditMemoMockRepository } from './ar/repositories/ar-credit-memo.mock.repository';
import { InventorySubledgerMockRepository } from './subledger/repositories/inventory-subledger.mock.repository';


// Mock Fallbacks (for missing schema models)
import { LedgerEventLogArchiveMockRepository } from './repositories/ledger-event-log-archive.mock.repository';
import { LedgerHashAnchorMockRepository } from './repositories/ledger-hash-anchor.mock.repository';
import { LedgerMerkleCheckpointMockRepository } from './repositories/ledger-merkle-checkpoint.mock.repository';
import { TrialBalanceProjectionMockRepository } from './repositories/trial-balance-projection.mock.repository';
import { GeneralLedgerProjectionMockRepository } from './repositories/general-ledger-projection.mock.repository';
import { AccountStatementProjectionMockRepository } from './repositories/account-statement-projection.mock.repository';
import { LedgerProjectionCheckpointMockRepository } from './repositories/ledger-projection-checkpoint.mock.repository';
import { FinancialSnapshotMockRepository } from './repositories/financial-snapshot.mock.repository';
import { FinancialReportSnapshotMockRepository } from './repositories/financial-report-snapshot.mock.repository';
import { AssetCategoryMockRepository } from './repositories/asset-category.mock.repository';
import { CompanyGroupMockRepository } from './repositories/company-group.mock.repository';
import { IntercompanyEliminationMockRepository } from './repositories/intercompany-elimination.mock.repository';
import { ConsolidatedSnapshotMockRepository } from './repositories/consolidated-snapshot.mock.repository';
import { AccountBalanceSnapshotMockRepository } from './repositories/account-balance-snapshot.mock.repository';

// Infrastructure
import { AuditModule } from '../../shared/audit/audit.module';
import { ArModule } from './ar/ar.module';
import { FileProcessingModule } from '../../shared/file-processing/file-processing.module';
import { CommsModule } from '../../shared/comms/comms.module';
import { PersistenceModule } from '../../persistence/persistence.module';
import { LoggerModule } from '../../shared/logger/logger.module';

import { PostingAuditService } from './services/posting-audit.service';
import { InventorySubledgerService } from './subledger/inventory-subledger.service';
import { IInventorySubledgerService } from './subledger/inventory-subledger.service.interface';
import { CostingEngineService } from './subledger/costing-engine.service';
import { InventoryAccountingIntegrationService } from './subledger/inventory-accounting-integration.service';
import { InventoryMovementListener } from './subledger/listeners/inventory-movement.listener';
import { PrePostingValidator } from './subledger/validators/pre-posting.validator';
import { FinancialDashboardController } from './financial-dashboard.controller';
import { FinancialDashboardService } from './services/financial-dashboard.service';
import { CashflowService } from './services/cashflow.service';
import { ReportingController } from './controllers/reporting.controller';
import { OperationsController } from './controllers/operations.controller';
import { ComplianceController } from './controllers/compliance.controller';
import { FinancialIntelligenceController } from './controllers/financial-intelligence.controller';
import { InsightService } from './services/insight.service';
import { ForecastService } from './services/forecast.service';
import { RecommendationService } from './services/recommendation.service';
import { SimulationAdapter } from './adapters/simulation.adapter';
import { AuditCertificationService } from './services/audit-certification.service';
import { CertifiedReportingController } from './controllers/certified-reporting.controller';
import { PaymentLifecycleService } from './services/payment-lifecycle.service';
import { BankIngestionService } from './services/bank-ingestion.service';
import { ReconciliationService } from './services/reconciliation.service';
import { TaxEngineService, IndonesiaTaxStrategy } from './services/tax-engine.service';
import { BudgetingService } from './services/budgeting.service';
import { WorkflowIntegrationService } from './services/workflow-integration.service';
import { ExpensePolicyService } from './services/expense-policy.service';
import { TaxExportService } from './services/tax-export.service';
import { AuditDashboardService } from './services/audit-dashboard.service';
import { ScalingService } from './services/scaling.service';
import { PostingLockManager } from './guards/posting-lock';
import { FiscalPeriodGuard } from './guards/fiscal-period.guard';
import { LedgerPostingAdapter } from './adapters/ledger-posting.adapter';
import { FinancialEventRegistryService } from './services/financial-event-registry.service';
import { AccountResolverService } from './services/account-resolver.service';
import { DimensionResolverService } from './services/dimension-resolver.service';
import { PostingValidatorService } from './services/posting-validator.service';
import { JournalDraftStore } from './services/journal-draft-store';
import { ExchangeRateService } from './services/exchange-rate.service';
import { PostingGatewayService } from './services/posting-gateway.service';
import { ConsolidationReportService } from './services/consolidation-report.service';
import { PostingMonitoringService } from './services/posting-monitoring.service';
import { HashingService } from './utils/hashing.service';

/**
 * Helper to determine which repository class to use based on mode.
 * In production/staging, it ALWAYS returns the DB version if available, 
 * or throws an error if it attempts to use a mock.
 */
function getRepository(dbClass: any, mockClass: any) {
  const isProd = process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'staging';
  const mode = getFinanceExecutionMode();

  if (isProd) {
    if (!dbClass) {
        return class {
            constructor() {
                throw new Error(`CRITICAL: A required DB repository is missing in production. Mocks are forbidden.`);
            }
        };
    }
    return dbClass;
  }

  return mode === FinanceExecutionMode.MOCK ? mockClass : dbClass;
}

@Module({
  imports: [
    AuditModule,
    forwardRef(() => ArModule),
    FileProcessingModule,
    CommsModule,
    PersistenceModule,
    LoggerModule,
    ThrottlerModule.forRoot([{
      ttl: 60000,
      limit: 100,
    }]),
  ],
  controllers: [
    FinanceController, 
    FinancialDashboardController, 
    FinancialIntelligenceController,
    CertifiedReportingController,
    ReportingController,
    OperationsController,
    ComplianceController,
  ],
  providers: [
    FinanceService,
    CashflowService,
    InsightService,
    ForecastService,
    RecommendationService,
    SimulationAdapter,
    AuditCertificationService,
    ChartOfAccountService,
    FiscalPeriodService,
    PostingRuleService,
    LedgerPostingService,
    ReportingEngineService,
    FinancialDashboardService,
    PaymentLifecycleService,
    {
      provide: 'APP_GUARD',
      useClass: ThrottlerGuard,
    },
    BankIngestionService,
    ReconciliationService,
    TaxEngineService,
    BudgetingService,
    WorkflowIntegrationService,
    ExpensePolicyService,
    TaxExportService,
    AuditDashboardService,
    ScalingService,
    ConsolidationReportService,
    ProfitLossService,
    BalanceSheetService,
    ProjectionCheckpointService,
    TrialBalanceVerificationService,
    PostingLockManager,
    FiscalPeriodGuard,
    LedgerPostingAdapter,
    FinancialEventRegistryService,
    AccountResolverService,
    DimensionResolverService,
    PostingValidatorService,
    JournalDraftStore,
    ExchangeRateService,
    PostingGatewayService,
    PostingMonitoringService,
    HashingService,
    JournalValidationService,
    DimensionValidationService,
    LedgerInvariantService,
    PostingAuditService,
    JournalReversalService,
    LedgerWorkerService,
    FinancialProjectionWorkerService,
    FinancialSnapshotService,
    SnapshotEngineService,
    LedgerIntegrityService,
    LedgerArchitectureGuard,
    LedgerDlqReplayService,
    LedgerMerkleCheckpointService,
    LedgerEventIngestionWorker,
    LedgerEventLogRetentionService,
    ProjectionRebuildService,
    PeriodClosingService,
    ArCreditMemoService,
    AssetService,
    DepreciationScheduler,
    CostingEngineService,
    InventoryAccountingIntegrationService,
    InventoryMovementListener,
    PrePostingValidator,
    AccountingMappingService,
    {
      provide: 'TAX_STRATEGIES',
      useFactory: () => {
        const strategies = new Map();
        strategies.set('ID', new IndonesiaTaxStrategy());
        return strategies;
      },
    },
    // Hardened Multi-Mode Repositories
    {
      provide: IFinanceRepository,
      useClass: getRepository(FinanceDbRepository, FinanceMockRepository),
    },
    {
      provide: 'IChartOfAccountRepository',
      useClass: getRepository(CoaDbRepository, CoaMockRepository),
    },
    {
      provide: 'IFiscalPeriodRepository',
      useClass: getRepository(FiscalPeriodDbRepository, FiscalMockRepository),
    },
    {
      provide: 'IJournalRepository',
      useClass: getRepository(JournalDbRepository, JournalMockRepository),
    },
    {
      provide: 'IAccountBalanceRepository',
      useClass: getRepository(AccountBalanceDbRepository, AccountBalanceMockRepository),
    },
    {
      provide: 'ILedgerPostingRepository',
      useClass: getRepository(LedgerPostingDbRepository, LedgerPostingMockRepository),
    },
    {
      provide: 'ILedgerEventLogRepository',
      useClass: getRepository(LedgerEventLogDbRepository, LedgerEventLogMockRepository),
    },
    {
      provide: 'IPostingRuleRepository',
      useClass: getRepository(PostingRuleDbRepository, PostingRuleMockRepository),
    },
    {
      provide: 'IUnitOfWork',
      useClass: getRepository(DbUnitOfWork, UowMock),
    },
    {
      provide: 'IJournalReversalRepository',
      useClass: getRepository(JournalReversalDbRepository, JournalReversalMockRepository),
    },
    {
      provide: 'IAssetRepository',
      useClass: getRepository(AssetDbRepository, AssetMockRepository),
    },
    {
      provide: 'IPayrollRepository',
      useClass: PayrollDbRepository, // Hard-bind if no mock needed/available
    },
    {
      provide: 'IArInvoiceRepository',
      useClass: getRepository(ArInvoiceDbRepository, ArInvoiceMockRepository),
    },
    {
      provide: 'IArPaymentRepository',
      useClass: getRepository(ArPaymentDbRepository, ArPaymentMockRepository),
    },
    {
      provide: 'IArCustomerRepository',
      useClass: getRepository(ArCustomerDbRepository, ArCustomerMockRepository),
    },
    {
      provide: 'IArCustomerCreditRepository',
      useClass: getRepository(ArCustomerCreditDbRepository, ArCustomerCreditMockRepository),
    },
    {
      provide: 'IArCreditMemoRepository',
      useClass: getRepository(ArCreditMemoDbRepository, ArCreditMemoMockRepository),
    },
    {
      provide: 'IInventorySubledgerRepository',
      useClass: getRepository(InventorySubledgerDbRepository, InventorySubledgerMockRepository),
    },
    {
      provide: IInventorySubledgerService,
      useClass: InventorySubledgerService,
    },
    // Remaining Mock Fallbacks (Guarded)
    {
      provide: 'IAssetCategoryRepository',
      useClass: getRepository(null, AssetCategoryMockRepository),
    },
    {
      provide: 'ICompanyGroupRepository',
      useClass: getRepository(null, CompanyGroupMockRepository),
    },
    {
      provide: 'IIntercompanyEliminationRepository',
      useClass: getRepository(null, IntercompanyEliminationMockRepository),
    },
    {
      provide: 'IConsolidatedSnapshotRepository',
      useClass: getRepository(null, ConsolidatedSnapshotMockRepository),
    },
    {
      provide: 'IFinancialReportSnapshotRepository',
      useClass: getRepository(null, FinancialReportSnapshotMockRepository),
    },
    {
      provide: 'IFinancialSnapshotRepository',
      useClass: getRepository(null, FinancialSnapshotMockRepository),
    },
    {
      provide: 'ILedgerEventLogArchiveRepository',
      useClass: getRepository(null, LedgerEventLogArchiveMockRepository),
    },
    {
      provide: 'ILedgerHashAnchorRepository',
      useClass: getRepository(null, LedgerHashAnchorMockRepository),
    },
    {
      provide: 'ILedgerMerkleCheckpointRepository',
      useClass: getRepository(null, LedgerMerkleCheckpointMockRepository),
    },
    {
      provide: 'IAccountBalanceSnapshotRepository',
      useClass: getRepository(null, AccountBalanceSnapshotMockRepository),
    },
    {
      provide: 'ITrialBalanceProjectionRepository',
      useClass: getRepository(null, TrialBalanceProjectionMockRepository),
    },
    {
      provide: 'IGeneralLedgerProjectionRepository',
      useClass: getRepository(null, GeneralLedgerProjectionMockRepository),
    },
    {
      provide: 'IAccountStatementProjectionRepository',
      useClass: getRepository(null, AccountStatementProjectionMockRepository),
    },
    {
      provide: 'ILedgerProjectionCheckpointRepository',
      useClass: getRepository(null, LedgerProjectionCheckpointMockRepository),
    },
  ],
  exports: [
    FinanceService,
    CashflowService,
    ChartOfAccountService,
    FiscalPeriodService,
    PostingRuleService,
    LedgerPostingService,
    ReportingEngineService,
    IFinanceRepository,
    IInventorySubledgerService,
  ],
})
export class FinanceModule implements OnModuleInit {
  constructor(
    @Inject('IAccountBalanceRepository') private readonly balanceRepo: any,
    @Inject('IUnitOfWork') private readonly uow: any,
  ) {}

  onModuleInit() {
    // 1. Fail-Fast Safety Check
    assertFinanceExecutionSafety();

    const mode = getFinanceExecutionMode();
    const isProd = process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'staging';

    console.log('============================================================');
    console.log('[FINANCE CORE] STARTUP VERIFICATION');
    console.log(`[FINANCE CORE] Execution Mode: ${mode.toUpperCase()}`);
    console.log(`[FINANCE CORE] Repository: ${this.balanceRepo.constructor.name}`);
    console.log(`[FINANCE CORE] UnitOfWork: ${this.uow.constructor.name}`);
    console.log(`[FINANCE CORE] Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log('============================================================');

    if (isProd && mode === FinanceExecutionMode.MOCK) {
       // Secondary guard in case assertFinanceExecutionSafety was bypassed
       throw new Error(`CRITICAL: Mock repositories detected in ${process.env.NODE_ENV} environment. Shutdown required.`);
    }

    if (mode === FinanceExecutionMode.MOCK) {
      console.warn(`[FINANCE] WARNING: Running with MOCK repositories. This is UNSAFE for production use.`);
    } else {
      console.log(`[FINANCE] SUCCESS: Running with DB-backed repositories.`);
    }
  }
}
