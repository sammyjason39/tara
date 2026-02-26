
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { financeRepo } from './financeRepo';
import { prisma } from '@/core/persistence/database/client';

// Mock Prisma
vi.mock('@/core/persistence/database/client', () => ({
  prisma: {
    fixedAsset: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
    journalEntry: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
    payable: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
    receivable: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
    moneySource: {
      findMany: vi.fn(),
    },
    treasuryTransfer: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
    settlementRecord: {
      create: vi.fn(),
    },
  },
}));

describe('financeRepo', () => {
  const tenantId = 'test-tenant';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('listAssets', () => {
    it('should list assets for a tenant', async () => {
      const mockAssets = [{ 
          id: 'asset-1', 
          description: 'Laptop',
          acquisitionDate: new Date(),
          acquisitionCost: { toNumber: () => 1000 },
          residualValue: { toNumber: () => 100 },
          accumulatedDepreciation: { toNumber: () => 0 },
          carryingValue: { toNumber: () => 1000 },
          revaluationReserve: { toNumber: () => 0 },
          createdAt: new Date(),
          updatedAt: new Date(),
      }];
      (prisma.fixedAsset.findMany as any).mockResolvedValue(mockAssets);

      const result = await financeRepo.listAssets(tenantId);
      expect(result).toHaveLength(1);
      expect(result[0].description).toBe('Laptop');
      expect(prisma.fixedAsset.findMany).toHaveBeenCalledWith({
        where: { tenantId: tenantId },
      });
    });
  });

  describe('createAsset', () => {
    it('should create an asset', async () => {
      const payload = { 
          description: 'Laptop', 
          tenantId: tenantId,
          acquisitionDate: '2024-01-01',
          acquisitionCost: 1000,
          residualValue: 100,
          usefulLifeYears: 5,
          depreciationMethod: 'STRAIGHT_LINE',
          status: 'ACTIVE',
      } as any;
      
      const mockCreated = {
          ...payload,
          id: 'asset-1',
          acquisitionDate: new Date(payload.acquisitionDate),
          createdAt: new Date(),
          updatedAt: new Date(),
      };

      (prisma.fixedAsset.create as any).mockResolvedValue(mockCreated);

      const result = await financeRepo.createAsset(tenantId, payload);
      expect(result.id).toBe('asset-1');
      expect(prisma.fixedAsset.create).toHaveBeenCalled();
    });
  });
  
  describe('listJournals', () => {
    it('should list journals', async () => {
        const mockJournals = [{ 
            id: 'jnl-1', 
            description: 'Opening Balance',
            createdAt: new Date(),
            updatedAt: new Date(),
            lines: [] 
        }];
        (prisma.journalEntry.findMany as any).mockResolvedValue(mockJournals);

        const result = await financeRepo.listJournalEntries(tenantId);
        expect(result).toHaveLength(1);
        expect(prisma.journalEntry.findMany).toHaveBeenCalled();
    });
  });

  describe('createTransfer', () => {
      it('should create a treasurty transfer', async () => {
          const payload = { fromSourceId: 'src-1', toSourceId: 'src-2', amount: 1000, currency: 'IDR', status: 'PENDING', requestedBy: 'user-1' };
          const mockTransfer = { 
              ...payload, 
              id: 'trf-1', 
              createdAt: new Date(),
              updatedAt: new Date()
          };
          (prisma.treasuryTransfer.create as any).mockResolvedValue(mockTransfer);

          const result = await financeRepo.createTransfer(tenantId, payload as any);
          expect(result.id).toBe('trf-1');
          expect(prisma.treasuryTransfer.create).toHaveBeenCalled();
      });
  });

});
