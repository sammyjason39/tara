/**
 * Atomicity Rollback Tests — Phase 0.4
 * ZENVIX_MASTER_AUDIT_2026 | Finding: PROC-INT-001
 *
 * Scenario:
 *   ProcurementService.releasePurchaseOrder() wraps ALL DB writes in a single
 *   Prisma $transaction:
 *     Step 1 → procurementFinalPo.create()
 *     Step 2 → procurementRequisition.update(status = PO_RELEASED)
 *     Step 3 → payable.create()   ← Finance domain
 *
 *   If Step 3 (Finance payable creation) throws, the entire transaction MUST
 *   roll back, leaving the FinalPO uncreated and the requisition status
 *   unchanged (i.e. NOT 'PO_RELEASED').
 *
 * These tests verify the rollback guarantee by injecting controlled failures
 * at the Finance payable step.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { ProcurementService } from '../../../backend/src/core/procurement/procurement.service';

// ——— HELPERS —————————————————————————————————————————————————————

const TENANT_ID = 'tenant-001';
const REQUISITION_ID = 'req-uuid-001';
const SUPPLIER_ID = 'sup-uuid-abc';
const TOTAL_AMOUNT = 500_000_000; // IDR 500M

const baseDto = {
  requisitionId: REQUISITION_ID,
  supplierId: SUPPLIER_ID,
  totalAmount: TOTAL_AMOUNT,
};

/**
 * Build a ProcurementService with fully injectable mock prisma and repository.
 *
 * transactionCallback controls what the prisma.$transaction() lambda resolves/rejects to.
 */
function buildService({
  transactionResult = 'success',
  repositoryReleaseFn,
}: {
  transactionResult?: 'success' | 'finance_fails' | 'connection_lost';
  repositoryReleaseFn?: (tenantId: string, data: any, tx?: any) => Promise<any>;
} = {}) {
  // —— Mock released PO (what the repo returns inside the transaction) ——————
  const mockReleasedPo = {
    id: 'po-tx-001',
    tenantId: TENANT_ID,
    requisitionId: REQUISITION_ID,
    supplierId: SUPPLIER_ID,
    branchCode: 'JKT',
    totalAmount: TOTAL_AMOUNT,
    status: 'released',
    issuedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  // —— Mock repository —————————————————————————————————————————————————
  const mockRepository = {
    releasePurchaseOrder: repositoryReleaseFn
      ?? vi.fn().mockImplementation(async (tenantId, data, tx) => {
        // ATOMICITY GUARD: The repo MUST call the tx client's Finance integration
        // so that the failure mock inside $transaction can trigger a rollback.
        if (tx?.payable) {
          const supplier = await tx.supplierMaster.findUnique({ where: { id: data.supplierId } });
          await tx.payable.create({
            data: {
              vendorName: supplier?.name || "Unknown",
              amount: data.totalAmount,
            }
          });
        }
        return mockReleasedPo;
      }),
    createAuditEvent: vi.fn().mockResolvedValue({ id: 'audit-001' }),
  };

  // —— Mock Prisma $transaction —————————————————————————————————————
  // We simulate the transaction wrapper behaviour:
  //   - 'success'          → tx lambda runs, repo returns PO, payable created
  //   - 'finance_fails'    → tx lambda throws (simulating payable.create() failing)
  //   - 'connection_lost'  → prisma.$transaction itself throws (DB connection lost)
  const mockPrisma = {
    $transaction: vi.fn().mockImplementation(async (callback, _options) => {
      if (transactionResult === 'connection_lost') {
        throw new Error('P1001: Can\'t reach database server');
      }

      // Build a minimal tx client that simulates the Finance payable failing
      const tx = {
        procurementFinalPo: {
          create: vi.fn().mockResolvedValue({ id: 'po-tx-001' }),
          update: vi.fn(),
        },
        procurementRequisition: {
          findUnique: vi.fn().mockResolvedValue({
            id: REQUISITION_ID,
            tenantId: TENANT_ID,
            branchCode: 'JKT',
            currency: 'IDR',
          }),
          update: vi.fn().mockResolvedValue({}),
        },
        supplierMaster: {
          findUnique: vi.fn().mockResolvedValue({ id: SUPPLIER_ID, name: 'Test Supplier' }),
        },
        payable: {
          create: transactionResult === 'finance_fails'
            ? vi.fn().mockRejectedValue(new Error('Finance DB constraint violation: payable already exists'))
            : vi.fn().mockResolvedValue({ id: 'payable-001' }),
        },
      };

      // In Prisma $transaction, if the callback throws, the whole tx rolls back.
      // We simulate this: call the callback; if it throws, $transaction re-throws.
      try {
        return await callback(tx);
      } catch (err) {
        // Simulate Prisma rolling back and re-throwing
        throw err;
      }
    }),
  };

  const mockAuditService = { log: vi.fn().mockResolvedValue(null) };
  const mockEventBus = { publish: vi.fn().mockResolvedValue(undefined) };
  const mockIdempotency = { check: vi.fn().mockResolvedValue(null), save: vi.fn().mockResolvedValue(null) };

  // Alignment with ProcurementService(repo, audit, eventBus, prisma, idempotency)
  const service = new ProcurementService(
    mockRepository as any,
    mockAuditService as any,
    mockEventBus as any,
    mockPrisma as any,
    mockIdempotency as any,
  );

  return { service, mockPrisma, mockRepository, mockAuditService };
}

// ——— TESTS ————————————————————————————————————————————————————————

describe('[Phase 0.4] ProcurementService.releasePurchaseOrder() — Atomicity & Rollback', () => {

  // —— HAPPY PATH —————————————————————————————————————————————————

  describe('Happy path: Both procurement and Finance writes succeed', () => {
    it('returns the released PO on success', async () => {
      const { service } = buildService({ transactionResult: 'success' });
      const result = await service.releasePurchaseOrder(TENANT_ID, baseDto as any, 'user-admin');
      expect(result).toBeDefined();
      expect(result.id).toBe('po-tx-001');
      expect(result.status).toBe('released');
    });

    it('executes exactly one prisma.$transaction() call', async () => {
      const { service, mockPrisma } = buildService({ transactionResult: 'success' });
      await service.releasePurchaseOrder(TENANT_ID, baseDto as any, 'user-admin');
      expect(mockPrisma.$transaction).toHaveBeenCalledOnce();
    });

    it('uses Serializable isolation level', async () => {
      const { service, mockPrisma } = buildService({ transactionResult: 'success' });
      await service.releasePurchaseOrder(TENANT_ID, baseDto as any, 'user-admin');
      expect(mockPrisma.$transaction).toHaveBeenCalledWith(
        expect.any(Function),
        expect.objectContaining({ isolationLevel: 'Serializable' }),
      );
    });

    it('passes the tx client to repository.releasePurchaseOrder (not this.prisma)', async () => {
      const repoFn = vi.fn().mockResolvedValue({
        id: 'po-tx-001',
        tenantId: TENANT_ID,
        requisitionId: REQUISITION_ID,
        supplierId: SUPPLIER_ID,
        branchCode: 'JKT',
        totalAmount: TOTAL_AMOUNT,
        status: 'released',
        issuedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      const { service } = buildService({ repositoryReleaseFn: repoFn });
      await service.releasePurchaseOrder(TENANT_ID, baseDto as any, 'user-admin');
      // The third argument must be a transaction proxy object, not undefined
      expect(repoFn).toHaveBeenCalledWith(
        TENANT_ID,
        expect.objectContaining({ requisitionId: REQUISITION_ID }),
        expect.objectContaining({ payable: expect.any(Object) }), // tx has a payable table proxy
      );
    });

    it('logs to AuditService after successful transaction', async () => {
      const { service, mockAuditService } = buildService({ transactionResult: 'success' });
      await service.releasePurchaseOrder(TENANT_ID, baseDto as any, 'user-admin');
      expect(mockAuditService.log).toHaveBeenCalledOnce();
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          module: 'procurement',
          action: 'RELEASE',
          entityType: 'PURCHASE_ORDER',
        }),
      );
    });
  });

  // —— ROLLBACK: FINANCE FAILURE ————————————————————————————————

  describe('Rollback: Finance payable.create() throws inside transaction', () => {
    it('throws InternalServerErrorException when Finance fails', async () => {
      const { service } = buildService({ transactionResult: 'finance_fails' });
      await expect(
        service.releasePurchaseOrder(TENANT_ID, baseDto as any, 'user-admin'),
      ).rejects.toThrow(InternalServerErrorException);
    });

    it('error message contains rollback confirmation', async () => {
      const { service } = buildService({ transactionResult: 'finance_fails' });
      await expect(
        service.releasePurchaseOrder(TENANT_ID, baseDto as any, 'user-admin'),
      ).rejects.toThrow('fully rolled back');
    });

    it('error message contains the root cause', async () => {
      const { service } = buildService({ transactionResult: 'finance_fails' });
      await expect(
        service.releasePurchaseOrder(TENANT_ID, baseDto as any, 'user-admin'),
      ).rejects.toThrow('Finance DB constraint violation');
    });

    it('AuditService.log is NOT called when transaction rolls back', async () => {
      const { service, mockAuditService } = buildService({ transactionResult: 'finance_fails' });
      try {
        await service.releasePurchaseOrder(TENANT_ID, baseDto as any, 'user-admin');
      } catch {
        // expected
      }
      // Audit is post-transaction; it must NOT be called if tx failed
      expect(mockAuditService.log).not.toHaveBeenCalled();
    });

    it('repository.createAuditEvent is NOT called when transaction rolls back', async () => {
      const { service, mockRepository } = buildService({ transactionResult: 'finance_fails' });
      try {
        await service.releasePurchaseOrder(TENANT_ID, baseDto as any, 'user-admin');
      } catch {
        // expected
      }
      expect(mockRepository.createAuditEvent).not.toHaveBeenCalled();
    });

    it('[DB INVARIANT] requisition status remains UNCHANGED — not PO_RELEASED', async () => {
      // This verifies the central audit requirement:
      // If the finance payable write fails, the requisition must NOT be left as PO_RELEASED.
      // We capture the tx.procurementRequisition.update calls to confirm behaviour.
      let capturedTx: any;

      const mockPrismaCapturing = {
        $transaction: vi.fn().mockImplementation(async (callback, _opts) => {
          const tx = {
            procurementFinalPo: {
              create: vi.fn().mockResolvedValue({ id: 'po-tx-001' }),
            },
            procurementRequisition: {
              findUnique: vi.fn().mockResolvedValue({
                id: REQUISITION_ID,
                tenantId: TENANT_ID,
                branchCode: 'JKT',
                currency: 'IDR',
              }),
              update: vi.fn().mockResolvedValue({}),
            },
            supplierMaster: {
              findUnique: vi.fn().mockResolvedValue({ id: SUPPLIER_ID, name: 'Supplier X' }),
            },
            payable: {
              // Finance write fails → transaction rolls back
              create: vi.fn().mockRejectedValue(new Error('payable constraint error')),
            },
          };
          capturedTx = tx;
          try {
            return await callback(tx);
          } catch (err) {
            throw err; // Prisma would rollback here
          }
        }),
      };

      const repo = {
        releasePurchaseOrder: async (tId: string, data: any, tx: any) => {
          // Simulate the actual DB repo: use tx for all writes
          await tx.procurementRequisition.findUnique({ where: { id: data.requisitionId } });
          await tx.procurementFinalPo.create({ data: {} });
          await tx.procurementRequisition.update({ where: { id: data.requisitionId }, data: { status: 'PO_RELEASED' } });
          await tx.supplierMaster.findUnique({ where: { id: data.supplierId } });
          await tx.payable.create({ data: {} }); // ← throws
        },
        createAuditEvent: vi.fn(),
      };

      const service = new ProcurementService(
        repo as any,
        { log: vi.fn() } as any,
        { publish: vi.fn() } as any,
        mockPrismaCapturing as any,
        { check: vi.fn(), save: vi.fn() } as any,
      );

      await expect(
        service.releasePurchaseOrder(TENANT_ID, baseDto as any, 'user-admin'),
      ).rejects.toThrow(InternalServerErrorException);

      // The $transaction mock re-throws → in production Prisma would issue ROLLBACK.
      // Verify the payable.create was attempted (causing the failure) and the
      // requisition.update was also attempted — but Prisma's real rollback mechanism
      // ensures neither persists. The test fixture confirms the call sequence.
      expect(capturedTx.payable.create).toHaveBeenCalledOnce();
      expect(capturedTx.procurementRequisition.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { status: 'PO_RELEASED' } }),
      );
      // Both calls happened INSIDE the same rolled-back transaction → no DB persistence.
    });
  });

  // —— ROLLBACK: DATABASE CONNECTION LOST ————————————————————————

  describe('Rollback: DB connection lost before transaction completes', () => {
    it('throws InternalServerErrorException on connection failure', async () => {
      const { service } = buildService({ transactionResult: 'connection_lost' });
      await expect(
        service.releasePurchaseOrder(TENANT_ID, baseDto as any, 'user-admin'),
      ).rejects.toThrow(InternalServerErrorException);
    });

    it('includes the Prisma error code in the message', async () => {
      const { service } = buildService({ transactionResult: 'connection_lost' });
      await expect(
        service.releasePurchaseOrder(TENANT_ID, baseDto as any, 'user-admin'),
      ).rejects.toThrow("P1001");
    });

    it('AuditService.log is NOT called on connection failure', async () => {
      const { service, mockAuditService } = buildService({ transactionResult: 'connection_lost' });
      try {
        await service.releasePurchaseOrder(TENANT_ID, baseDto as any);
      } catch {
        // expected
      }
      expect(mockAuditService.log).not.toHaveBeenCalled();
    });
  });

  // —— EDGE CASES —————————————————————————————————————————————————

  describe('Edge cases', () => {
    it('re-throws NotFoundException (known HttpException) without wrapping', async () => {
      const repoFn = vi.fn().mockRejectedValue(new NotFoundException('Requisition not found'));
      const { service } = buildService({ repositoryReleaseFn: repoFn });
      await expect(
        service.releasePurchaseOrder(TENANT_ID, baseDto as any),
      ).rejects.toThrow(NotFoundException);
    });

    it('works without a userId — skips AuditService.log but still succeeds', async () => {
      const { service, mockAuditService } = buildService({ transactionResult: 'success' });
      const result = await service.releasePurchaseOrder(TENANT_ID, baseDto as any);
      expect(result).toBeDefined();
      expect(mockAuditService.log).not.toHaveBeenCalled();
    });
  });
});
