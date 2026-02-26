import { describe, it, expect, vi, beforeEach } from 'vitest';
import { procurementRepo } from './procurementRepo';
import { prisma } from '@/core/persistence/database/client';

vi.mock('@/core/persistence/database/client', () => ({
  prisma: {
    supplierMaster: {
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    supplierBranch: {
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    supplierProduct: {
      findMany: vi.fn(),
      upsert: vi.fn(),
    },
    procurementRequisition: {
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    procurementDraftPO: {
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    procurementFinalPO: {
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    procurementContract: {
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    procurementReceipt: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
    procurementRatingLog: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
    procurementRiskSignal: {
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    supplierPortalMessage: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
    procurementAuditEvent: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
  },
}));

describe('Procurement Repository', () => {
  const tenantId = 'comp-demo-a';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Supplier Masters', () => {
    it('should list suppliers', async () => {
      const mockItems = [{
        id: 'sup-001',
        tenantId: tenantId,
        name: 'Supplier A',
        taxId: 'TX-001',
        complianceStatus: 'VERIFIED',
        globalRating: 90,
        riskTier: 'LOW',
        categories: ['A'],
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      }];
      (prisma.supplierMaster.findMany as any).mockResolvedValue(mockItems);

      const result = await procurementRepo.listSupplierMasters(tenantId);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('sup-001');
      expect(prisma.supplierMaster.findMany).toHaveBeenCalledWith({
        where: { tenantId: tenantId, deletedAt: null },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should create a supplier', async () => {
      const payload = {
        id: 'sup-002',
        tenantId,
        name: 'Supplier B',
        taxId: 'TX-002',
        complianceStatus: 'PENDING' as any,
        globalRating: 0,
        riskTier: 'MEDIUM' as any,
        categories: ['B'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const mockItem = {
        id: payload.id,
        tenantId: tenantId,
        name: payload.name,
        taxId: payload.taxId,
        complianceStatus: payload.complianceStatus,
        globalRating: payload.globalRating,
        riskTier: payload.riskTier,
        categories: payload.categories,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      (prisma.supplierMaster.create as any).mockResolvedValue(mockItem);

      const result = await procurementRepo.createSupplierMaster(tenantId, payload);
      expect(result.id).toBe('sup-002');
      expect(prisma.supplierMaster.create).toHaveBeenCalled();
    });
  });

  describe('Requisitions', () => {
    it('should list requisitions', async () => {
      const mockItems = [{
        id: 'req-001',
        tenantId: tenantId,
        requesterId: 'emp-001',
        departmentId: 'dept-ops',
        branchCode: 'JKT',
        title: 'Req 1',
        description: 'Desc 1',
        category: 'MRO',
        budgetClass: 'OPEX',
        amount: 5000000,
        currency: 'IDR',
        status: 'DRAFT',
        approvals: {},
        contractRequired: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      }];
      (prisma.procurementRequisition.findMany as any).mockResolvedValue(mockItems);

      const result = await procurementRepo.listRequisitions(tenantId);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('req-001');
    });

    it('should create a requisition', async () => {
      const payload = {
        id: 'req-001',
        tenantId,
        requesterId: 'emp-001',
        requesterDept: 'dept-ops',
        branchCode: 'JKT',
        title: 'Req 1',
        description: 'Desc 1',
        category: 'Machinery',
        budgetClass: 'OPEX' as any,
        amount: 1000,
        currency: 'IDR' as any,
        status: 'DRAFT' as any,
        approvals: {},
        contractRequired: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const mockItem = {
        id: payload.id,
        tenantId: tenantId,
        requesterId: payload.requesterId,
        departmentId: payload.requesterDept,
        branchCode: payload.branchCode,
        title: payload.title,
        description: payload.description,
        category: payload.category,
        budgetClass: payload.budgetClass,
        amount: 1000,
        currency: payload.currency,
        status: payload.status,
        approvals: payload.approvals,
        contractRequired: payload.contractRequired,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (prisma.procurementRequisition.create as any).mockResolvedValue(mockItem);

      const result = await procurementRepo.createRequisition(tenantId, payload);
      expect(result.id).toBe('req-001');
      expect(prisma.procurementRequisition.create).toHaveBeenCalled();
    });
  });

  describe('Purchase Orders', () => {
    it('should create a draft PO', async () => {
      const payload = {
        id: 'dpo-001',
        tenantId,
        requisitionId: 'req-001',
        branchCode: 'JKT',
        supplierId: 'sup-001',
        supplierBranchId: 'branch-001',
        contractType: 'SPOT' as any,
        status: 'DRAFT' as any,
        lineItems: [],
        quotedTotal: 1000,
        createdBy: 'emp-001',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const mockItem = {
        id: payload.id,
        tenantId: tenantId,
        requisitionId: payload.requisitionId,
        branchCode: payload.branchCode,
        supplierId: payload.supplierId,
        supplierBranchId: payload.supplierBranchId,
        contractType: payload.contractType,
        status: payload.status,
        lineItems: [],
        quotedTotal: 1000,
        createdBy: payload.createdBy,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      (prisma.procurementDraftPO.create as any).mockResolvedValue(mockItem);

      const result = await procurementRepo.createDraftPurchaseOrder(tenantId, payload);
      expect(result.id).toBe('dpo-001');
    });

    it('should create a final PO', async () => {
      const payload = {
        id: 'fpo-001',
        tenantId,
        requisitionId: 'req-001',
        draftPoId: 'dpo-001',
        supplierId: 'sup-001',
        supplierBranchId: 'branch-001',
        branchCode: 'JKT',
        status: 'RELEASED' as any,
        totalAmount: 1000,
        issuedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const mockItem = {
        id: payload.id,
        tenantId: tenantId,
        requisitionId: payload.requisitionId,
        draftPoId: payload.draftPoId,
        supplierId: payload.supplierId,
        supplierBranchId: payload.supplierBranchId,
        branchCode: payload.branchCode,
        status: payload.status,
        totalAmount: 1000,
        issuedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      (prisma.procurementFinalPO.create as any).mockResolvedValue(mockItem);

      const result = await procurementRepo.createFinalPurchaseOrder(tenantId, payload);
      expect(result.id).toBe('fpo-001');
    });
  });

  describe('Other Operations', () => {
    it('should create an audit event', async () => {
      const payload = {
        id: 'audit-001',
        tenantId,
        actorId: 'user-001',
        action: 'APPROVE',
        entityType: 'REQUISITION' as any,
        entityId: 'req-001',
        detail: 'Approved by HOD',
        createdAt: new Date().toISOString(),
      };
      const mockItem = {
        id: payload.id,
        tenantId: tenantId,
        actorId: payload.actorId,
        action: payload.action,
        entityType: payload.entityType,
        entityId: payload.entityId,
        detail: payload.detail,
        createdAt: new Date(),
      };
      (prisma.procurementAuditEvent.create as any).mockResolvedValue(mockItem);

      const result = await procurementRepo.createAuditEvent(tenantId, payload);
      expect(result.id).toBe('audit-001');
    });
  });
});
