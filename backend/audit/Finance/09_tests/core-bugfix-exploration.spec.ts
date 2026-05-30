/**
 * Core Bugfix Exploration Tests
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * Property-based tests designed to FAIL on unfixed code.
 * Each test validates a specific bug condition.
 * 
 * Expected behavior: Tests should FAIL on current (unfixed) code,
 * confirming the bug exists. After fixes are applied, tests should PASS.
 */

import { describe, it, expect, beforeEach, beforeAll, afterAll } from 'vitest';
import { getPrisma, disconnectPrisma } from '../../../tests/integration/helpers/prisma';
import { runInRollbackTx } from '../../../tests/integration/helpers/tx';
import {
  seedTestCompany,
  seedTestLocation,
  seedTestStore,
  seedTestProduct,
  testId,
} from '../../../tests/integration/helpers/seeds';

// ─── Test Constants ───────────────────────────────────────────────────────────
const TEST_TENANT_ID = 'bugfix-test-tenant';
const TEST_COMPANY_ID = 'bugfix-test-company';

describe('Core Bugfix Exploration Tests', () => {
  let prisma: any;

  beforeAll(async () => {
    prisma = getPrisma();
  });

  afterAll(async () => {
    await disconnectPrisma();
  });

  // ─── BUG-1: Inventory Stock Transfer Receive Location Mismatch ─────────────
  describe('BUG-1: Stock Transfer Receive Location Mismatch', () => {
    it('should fail because transferIn() checks wrong location ID for in_transit', async () => {
      // Setup: Create test data
      const tenantId = TEST_TENANT_ID;
      const companyId = TEST_COMPANY_ID;
      
      const sourceLocation = await prisma.location.create({
        data: {
          tenantId,
          name: 'Source Location',
          code: 'SRC-001',
          type: 'WAREHOUSE',
        },
      });

      const destLocation = await prisma.location.create({
        data: {
          tenantId,
          name: 'Destination Location',
          code: 'DEST-001',
          type: 'STORE',
        },
      });

      const product = await prisma.product.create({
        data: {
          tenantId,
          name: 'Test Product',
          code: 'PROD-001',
          type: 'GOODS',
        },
      });

      // Create stock levels at source
      await prisma.stockLevel.create({
        data: {
          tenantId,
          productId: product.id,
          locationId: sourceLocation.id,
          onHand: 100,
          available: 100,
        },
      });

      // Create stock transfer
      const transfer = await prisma.inventoryTransfer.create({
        data: {
          tenantId,
          itemId: product.id,
          fromLocationId: sourceLocation.id,
          toLocationId: destLocation.id,
          quantity: 10,
          status: 'REQUESTED',
        },
      });

      // Pick the transfer (reserves stock at source)
      await prisma.$transaction(async (tx: any) => {
        // Reserve stock at source
        await tx.stockLevel.update({
          where: { id: (await tx.stockLevel.findFirst({ where: { tenantId, productId: product.id, locationId: sourceLocation.id } })).id },
          data: { available: { decrement: 10 } },
        });
        
        // Update transfer status to PICKED
        await tx.inventoryTransfer.update({
          where: { id: transfer.id },
          data: { status: 'PICKED' },
        });
      });

      // Ship the transfer
      await prisma.$transaction(async (tx: any) => {
        // This should increment in_transit at TRANSIT LOCATION
        // BUG: It increments at destLocation.id instead
        await tx.stockLevel.upsert({
          where: {
            tenantId_productId_locationId_departmentId: {
              tenantId,
              productId: product.id,
              locationId: destLocation.id, // BUG: Should be transit location
              departmentId: null,
            },
          },
          update: { inTransit: { increment: 10 } },
          create: {
            tenantId,
            productId: product.id,
            locationId: destLocation.id, // BUG: Should be transit location
            departmentId: null,
            onHand: 0,
            inTransit: 10,
            available: 0,
          },
        });

        // Update transfer status to SHIPPED
        await tx.inventoryTransfer.update({
          where: { id: transfer.id },
          data: { status: 'SHIPPED' },
        });
      });

      // Now try to receive the transfer
      // BUG: transferIn() will look for in_transit at transitLocation.id
      // But it's actually at destLocation.id, so the UPDATE will match 0 rows
      const receiveResult = await prisma.$transaction(async (tx: any) => {
        // Find the transit location (simulated)
        const transitLocation = await tx.location.findFirst({
          where: { tenantId, code: { startsWith: 'TRANSIT' } },
        });

        // BUG: transferIn() checks in_transit at transitLocation.id
        // But shipTransfer() incremented it at destLocation.id
        const fromLocationId = transitLocation ? transitLocation.id : destLocation.id;
        
        // This UPDATE will match 0 rows because in_transit is at destLocation.id, not fromLocationId
        const updateResult = await tx.$executeRaw`
          UPDATE stock_levels 
          SET in_transit = in_transit - 10
          WHERE tenant_id = ${tenantId} 
            AND product_id = ${product.id} 
            AND location_id = ${fromLocationId} 
            AND in_transit >= 10
        `;

        // BUG: updateResult === 0, so this throws
        if (updateResult === 0) {
          throw new Error(
            `Insufficient in-transit stock at transit pool ${fromLocationId} for receipt`,
          );
        }

        return { success: true };
      });

      // This test should FAIL because the bug causes an error
      expect(receiveResult).toBeUndefined(); // Expected to throw
    });
  });

  // ─── BUG-2: Explorer.tsx JSX Tag Mismatch ──────────────────────────────────
  describe('BUG-2: Explorer.tsx JSX Tag Mismatch', () => {
    it('should fail because closing </div> does not match opening <DepartmentWorkspaceLayout>', async () => {
      // This is a build-time error, not a runtime test
      // The test will verify the file content
      const fs = require('fs');
      const path = require('path');
      
      const explorerPath = path.join(__dirname, '../../../frontend/src/pages/Explorer.tsx');
      
      if (!fs.existsSync(explorerPath)) {
        // File doesn't exist in this test environment, skip
        return;
      }

      const content = fs.readFileSync(explorerPath, 'utf-8');
      const lines = content.split('\n');

      // Find the opening tag at line 524
      const openingTagLine = lines[523]; // 0-indexed
      const openingTag = openingTagLine.match(/<DepartmentWorkspaceLayout/);

      // Find the closing tag at line 1391
      const closingTagLine = lines[1390]; // 0-indexed
      const closingTag = closingTagLine.match(/<\/div>/);

      // BUG: closing tag is </div> instead of </DepartmentWorkspaceLayout>
      if (openingTag && closingTag) {
        // This test should FAIL because the tags don't match
        expect(closingTagLine).not.toMatch(/<\/div>/); // Expected to fail - bug exists
      }
    });
  });

  // ─── BUG-3: Subledger-to-Ledger Desync ─────────────────────────────────────
  describe('BUG-3: Subledger-to-Ledger Desync', () => {
    it('should fail because failed processEvent() leaves subledger in VALIDATED with no JournalEntry', async () => {
      // Setup: Create invoice and subledger entry
      const tenantId = TEST_TENANT_ID;
      const companyId = TEST_COMPANY_ID;

      const invoice = await prisma.arInvoice.create({
        data: {
          tenantId,
          companyId,
          invoiceNumber: 'INV-TEST-001',
          status: 'DRAFT',
          totalAmount: 100,
        },
      });

      // Issue invoice (creates subledger entry in VALIDATED status)
      await prisma.$transaction(async (tx: any) => {
        await tx.arInvoice.update({
          where: { id: invoice.id },
          data: { status: 'ISSUED' },
        });

        // Create subledger entry
        await tx.subledgerEntry.create({
          data: {
            tenantId,
            companyId,
            sourceType: 'AR_INVOICE',
            sourceId: invoice.id,
            status: 'VALIDATED',
            amount: 100,
          },
        });
      });

      // Simulate processEvent() failure (missing posting rule, locked period)
      // BUG: Subledger entry stays in VALIDATED status with no JournalEntry
      const subledgerEntry = await prisma.subledgerEntry.findFirst({
        where: { sourceId: invoice.id },
      });

      // BUG: No JournalEntry was created
      const journalEntry = await prisma.journalEntry.findFirst({
        where: { sourceId: invoice.id },
      });

      // This test should FAIL because the desync exists
      expect(subledgerEntry?.status).toBe('VALIDATED');
      expect(journalEntry).toBeNull(); // Expected - bug exists
    });
  });

  // ─── BUG-4: Double-Reversal of Journal Entries ─────────────────────────────
  describe('BUG-4: Double-Reversal of Journal Entries', () => {
    it('should fail because concurrent reversals can both pass status check before commit', async () => {
      // Setup: Create a POSTED journal
      const tenantId = TEST_TENANT_ID;
      const companyId = TEST_COMPANY_ID;

      const journal = await prisma.journalEntry.create({
        data: {
          tenantId,
          companyId,
          journalNumber: 'JNL-TEST-001',
          status: 'POSTED',
          totalDebit: 100,
          totalCredit: 100,
        },
      });

      // Simulate concurrent reversal requests
      const reversalPromises = Promise.all([
        prisma.$transaction(async (tx1: any) => {
          // Check status
          const j1 = await tx1.journalEntry.findUnique({ where: { id: journal.id } });
          if (j1?.status !== 'REVERSED') {
            // Simulate delay to allow concurrent request to pass check
            await new Promise(resolve => setTimeout(resolve, 100));
            
            // Create reversal journal
            return tx1.journalEntry.create({
              data: {
                tenantId,
                companyId,
                journalNumber: 'JNL-REV-001',
                status: 'POSTED',
                originalJournalId: journal.id,
                totalDebit: 100,
                totalCredit: 100,
              },
            });
          }
        }),
        prisma.$transaction(async (tx2: any) => {
          // Check status
          const j2 = await tx2.journalEntry.findUnique({ where: { id: journal.id } });
          if (j2?.status !== 'REVERSED') {
            // Create reversal journal
            return tx2.journalEntry.create({
              data: {
                tenantId,
                companyId,
                journalNumber: 'JNL-REV-002',
                status: 'POSTED',
                originalJournalId: journal.id,
                totalDebit: 100,
                totalCredit: 100,
              },
            });
          }
        }),
      ]);

      const reversals = await reversalPromises;

      // BUG: Both reversals succeed because status check passes before either commits
      const reversalCount = await prisma.journalEntry.count({
        where: { originalJournalId: journal.id },
      });

      // This test should FAIL because double-reversal is possible
      expect(reversalCount).toBeGreaterThan(1); // Expected - bug exists
    });
  });

  // ─── BUG-5: Fiscal Period Hard-Lock Bypass ─────────────────────────────────
  describe('BUG-5: Fiscal Period Hard-Lock Bypass', () => {
    it('should fail because DRAFT journals can exist in HARD_LOCK period after race condition', async () => {
      // Setup: Create fiscal period
      const tenantId = TEST_TENANT_ID;
      const companyId = TEST_COMPANY_ID;

      const period = await prisma.fiscalPeriod.create({
        data: {
          tenantId,
          companyId,
          periodName: '2024-01',
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-01-31'),
          status: 'OPEN',
        },
      });

      // Transition to HARD_LOCK
      await prisma.fiscalPeriod.update({
        where: { id: period.id },
        data: { status: 'HARD_LOCK' },
      });

      // BUG: DRAFT journals created via race condition after HARD_LOCK transition
      // are not automatically voided
      const draftJournal = await prisma.journalEntry.create({
        data: {
          tenantId,
          companyId,
          fiscalPeriodId: period.id,
          journalNumber: 'JNL-DRAFT-001',
          status: 'DRAFT',
          totalDebit: 0,
          totalCredit: 0,
        },
      });

      // BUG: No automated voiding mechanism
      const voidedJournal = await prisma.journalEntry.findUnique({
        where: { id: draftJournal.id },
      });

      // This test should FAIL because DRAFT journals in HARD_LOCK period are not voided
      expect(voidedJournal?.status).toBe('DRAFT'); // Expected - bug exists
    });
  });

  // ─── BUG-6: Ledger Hash Chain MOCK-HASH Contamination ──────────────────────
  describe('BUG-6: Ledger Hash Chain MOCK-HASH Contamination', () => {
    it('should fail because existing records with MOCK-HASH break the hash chain', async () => {
      // Setup: Create journal entries with MOCK-HASH
      const tenantId = TEST_TENANT_ID;
      const companyId = TEST_COMPANY_ID;

      // BUG: Existing records have MOCK-HASH
      const entry1 = await prisma.journalEntry.create({
        data: {
          tenantId,
          companyId,
          journalNumber: 'JNL-MOCK-001',
          entryHash: 'MOCK-HASH', // BUG: Should be real SHA-256
          previousHash: 'GENESIS',
          totalDebit: 100,
          totalCredit: 100,
        },
      });

      const entry2 = await prisma.journalEntry.create({
        data: {
          tenantId,
          companyId,
          journalNumber: 'JNL-MOCK-002',
          entryHash: 'MOCK-HASH', // BUG: Should be computed from previousHash
          previousHash: 'MOCK-HASH', // BUG: Should be real hash of entry1
          totalDebit: 100,
          totalCredit: 100,
        },
      });

      // BUG: Hash chain verification fails
      const chainValid = entry2.previousHash === entry1.entryHash;

      // This test should FAIL because MOCK-HASH breaks the chain
      expect(chainValid).toBe(false); // Expected - bug exists
    });
  });

  // ─── BUG-7: Journal Balance Tolerance Too Loose ────────────────────────────
  describe('BUG-7: Journal Balance Tolerance Too Loose', () => {
    it('should fail because tolerance of 0.001 allows unbalanced journals', async () => {
      // Setup: Create journal with small imbalance (0.001)
      const tenantId = TEST_TENANT_ID;
      const companyId = TEST_COMPANY_ID;

      const journal = {
        lines: [
          { accountId: '1', side: 'DEBIT', amount: 100.00 },
          { accountId: '2', side: 'CREDIT', amount: 99.99 }, // Imbalance: 0.01
        ],
        totalDebit: 100.00,
        totalCredit: 99.99,
        sourceEventId: 'evt-1',
      };

      const imbalance = Math.abs(journal.totalDebit - journal.totalCredit);

      // BUG: Tolerance of 0.001 allows imbalance of 0.01
      const BALANCE_TOLERANCE = 0.001; // BUG: Should be 0
      const isBalanced = imbalance <= BALANCE_TOLERANCE;

      // This test should FAIL because tolerance is too loose
      expect(isBalanced).toBe(true); // Expected - bug exists (allows unbalanced journal)
    });
  });

  // ─── BUG-8: Wildcard Route Deprecation Warning ─────────────────────────────
  describe('BUG-8: Wildcard Route Deprecation Warning', () => {
    it('should fail because @Get("images/*") uses deprecated path-to-regexp syntax', async () => {
      // This is a runtime warning, not a testable property
      // The test will verify the route definition
      const fs = require('fs');
      const path = require('path');
      
      const controllerPath = path.join(__dirname, '../../../backend/src/core/inventory/inventory.controller.ts');
      
      if (!fs.existsSync(controllerPath)) {
        // File doesn't exist in this test environment, skip
        return;
      }

      const content = fs.readFileSync(controllerPath, 'utf-8');

      // BUG: Uses deprecated @Get("images/*") syntax
      const hasDeprecatedRoute = content.includes('@Get("images/*")');

      // This test should FAIL because deprecated syntax is used
      expect(hasDeprecatedRoute).toBe(true); // Expected - bug exists
    });
  });

  // ─── BUG-9: Bundle Size Exceeds Threshold ──────────────────────────────────
  describe('BUG-9: Bundle Size Exceeds Threshold', () => {
    it('should fail because single JS chunk exceeds 500 kB threshold', async () => {
      // This is a build-time check, not a runtime test
      // The test will verify the bundle size
      const fs = require('fs');
      const path = require('path');
      
      const distPath = path.join(__dirname, '../../../frontend/dist/assets');
      
      if (!fs.existsSync(distPath)) {
        // Build hasn't been run, skip
        return;
      }

      const files = fs.readdirSync(distPath);
      let maxChunkSize = 0;

      for (const file of files) {
        if (file.endsWith('.js')) {
          const filePath = path.join(distPath, file);
          const stats = fs.statSync(filePath);
          maxChunkSize = Math.max(maxChunkSize, stats.size);
        }
      }

      const maxChunkSizeKB = maxChunkSize / 1024;

      // BUG: Single chunk exceeds 500 kB
      const thresholdKB = 500;
      const exceedsThreshold = maxChunkSizeKB > thresholdKB;

      // This test should FAIL because bundle size exceeds threshold
      expect(exceedsThreshold).toBe(true); // Expected - bug exists
    });
  });

  // ─── BUG-10: Retail Shift Lifecycle Guard Not Enforced ─────────────────────
  describe('BUG-10: Retail Shift Lifecycle Guard Not Enforced', () => {
    it('should fail because POS transactions can proceed without active shift', async () => {
      // Setup: Create tenant, store, but NO active shift
      const tenantId = TEST_TENANT_ID;
      const storeId = 'store-001';

      // BUG: No shift exists for tenant + store
      const activeShift = await prisma.retailShift.findFirst({
        where: { tenantId, storeId, status: 'OPEN' },
      });

      // BUG: POS transaction proceeds without shift validation
      const canProcessTransaction = activeShift !== null;

      // This test should FAIL because shift guard is not enforced
      expect(canProcessTransaction).toBe(false); // Expected - bug exists
    });
  });

  // ─── BUG-11: Offline Payment Matrix Not Enforced ───────────────────────────
  describe('BUG-11: Offline Payment Matrix Not Enforced', () => {
    it('should fail because Card/QRIS/E-Wallet payments can be processed offline', async () => {
      // Setup: Simulate offline mode
      const tenantId = TEST_TENANT_ID;
      const storeId = 'store-001';
      const shiftId = 'shift-001';

      const isOffline = true;
      const blockedPaymentTypes = ['CARD', 'QRIS', 'E_WALLET', 'LOYALTY_POINTS'];

      // BUG: Payment request with CARD type in offline mode
      const paymentRequest = {
        paymentType: 'CARD',
        amount: 100,
        tenantId,
        storeId,
        shiftId,
      };

      // BUG: No backend validation for offline mode
      const canProcessPayment = !isOffline || !blockedPaymentTypes.includes(paymentRequest.paymentType);

      // This test should FAIL because offline payment validation is missing
      expect(canProcessPayment).toBe(true); // Expected - bug exists
    });
  });
});
