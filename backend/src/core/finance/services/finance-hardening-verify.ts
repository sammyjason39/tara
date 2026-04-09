import { LedgerIntegrityService } from './ledger-integrity.service';
import { ReconciliationService } from './reconciliation.service';
import { PostingMonitoringService } from './posting-monitoring.service';
import { HashingService } from '../utils/hashing.service';
import { AccountBalanceMockRepository } from '../repositories/account-balance.mock.repository';
import { JournalMockRepository } from '../repositories/journal.mock.repository';
import { AccountBalanceSnapshotMockRepository } from '../repositories/account-balance-snapshot.mock.repository';
import { MockUnitOfWork } from '../repositories/uow.mock';
import { Prisma } from '@prisma/client';
import { JournalType } from '../domain/finance.constants';

async function verifyHardening() {
  console.log('--- STARTING FINANCE HARDENING VERIFICATION ---');

  const monitor = new PostingMonitoringService();
  const balanceRepo = new AccountBalanceMockRepository();
  const journalRepo = new JournalMockRepository();
  const snapshotRepo = new AccountBalanceSnapshotMockRepository();
  const uow = new MockUnitOfWork();
  const ledgerRepo = { createPosting: async () => ({ id: 'P1' }), checkIdempotency: async () => false, createIdempotency: async () => {} }; // Partial Mock
  const auditService = { log: async () => {} }; // Partial Mock
  const hashingService = new HashingService();

  const reconService = new ReconciliationService(
    journalRepo as any,
    balanceRepo as any,
    snapshotRepo as any,
    monitor
  );

  const integrityService = new LedgerIntegrityService(
    journalRepo as any,
    balanceRepo as any,
    ledgerRepo as any,
    auditService as any,
    reconService,
    uow as any,
    monitor,
    hashingService
  );

  const tenantId = 'TENANT_1';
  const companyId = 'COMP_1';
  const accountId = 'ACC_CASH';
  const currency = 'USD';
  const fiscalPeriodId = 'PER_2024_01';

  console.log('1. Verifying Multi-Currency Isolation...');
  await balanceRepo.incrementBalance(tenantId, companyId, {
    accountId,
    currency,
    fiscalPeriodId,
    branchId: 'BR1',
    locationId: 'LOC1'
  }, { net: new Prisma.Decimal(100) });

  const usdBalance = await balanceRepo.findBalance({
    tenantId,
    companyId,
    fiscalPeriodId,
    accountId,
    currency,
    branchId: 'BR1',
    locationId: 'LOC1'
  });

  const eurBalance = await balanceRepo.findBalance({
    tenantId,
    companyId,
    fiscalPeriodId,
    accountId,
    currency: 'EUR',
    branchId: 'BR1',
    locationId: 'LOC1'
  });
  
  if (usdBalance?.netBalance.equals(100) && !eurBalance) {
    console.log('✅ Multi-currency isolation verified.');
  } else {
    console.error(`❌ Multi-currency isolation FAILED. USD: ${usdBalance?.netBalance}, EUR: ${eurBalance}`);
  }

  console.log('2. Verifying Auditable Self-Healing...');
  await integrityService.autoRepairBalance(tenantId, companyId, fiscalPeriodId, accountId, currency, {
    branchId: 'BR1',
    locationId: 'LOC1'
  });
  
  const journals = await journalRepo.findAllOrderedByDate(tenantId, companyId);
  const adjJournal = journals.find(j => j.journalType === JournalType.SYSTEM_ADJUSTMENT);
  
  if (adjJournal && adjJournal.description?.includes('Original: 100, Corrected: 0')) {
    console.log('✅ Auditable self-healing (SYSTEM_ADJUSTMENT) verified.');
    console.log(`   Description: ${adjJournal.description}`);
  } else {
    console.error('❌ Auditable self-healing FAILED.');
    console.log(`Journals found: ${journals.length}`);
  }

  console.log('3. Verifying Observability Metrics...');
  const dashboard = await monitor.getDashboardSummary();
  if (dashboard.selfHealingRepairs >= 1) {
    console.log('✅ Observability metrics (selfHealingRepairs) verified.');
  } else {
    console.error('❌ Observability metrics FAILED.');
  }

  console.log('--- VERIFICATION COMPLETE ---');
}

verifyHardening().catch(console.error);
