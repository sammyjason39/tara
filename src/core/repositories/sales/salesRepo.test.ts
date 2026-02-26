import { describe, it, expect, vi, beforeEach } from 'vitest';
import { salesRepo } from './salesRepo';
import { prisma } from '@/core/persistence/database/client';

vi.mock('@/core/persistence/database/client', () => ({
  prisma: {
    salesLead: {
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    salesOpportunity: {
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    salesQuote: {
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    salesTimelineEvent: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
    salesTask: {
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    salesAlert: {
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    salesOrder: {
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    salesAuditEvent: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
  },
}));

describe('Sales Repository', () => {
  const tenantId = 'comp-demo-a';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Leads', () => {
    it('should list leads', async () => {
      const mockItems = [{
        id: 'lead-001',
        tenantId: tenantId,
        companyName: 'Nusantara Tech',
        contactName: 'Andi',
        source: 'MARKETING',
        ownerId: 'emp-003',
        ownerName: 'Bob',
        score: 80,
        potentialValue: 1000000,
        currency: 'IDR',
        priority: 'HIGH',
        status: 'NEW',
        slaDueAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      }];
      (prisma.salesLead.findMany as any).mockResolvedValue(mockItems);

      const result = await salesRepo.listLeads(tenantId);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('lead-001');
    });

    it('should create a lead', async () => {
      const payload = {
        id: 'lead-002',
        tenantId,
        companyName: 'Tech Indo',
        contactName: 'Budi',
        source: 'REFERRAL' as any,
        ownerId: 'emp-003',
        ownerName: 'Bob',
        score: 50,
        potentialValue: 500000,
        currency: 'IDR' as any,
        priority: 'MEDIUM' as any,
        status: 'NEW' as any,
        slaDueAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const mockItem = {
        ...payload,
        tenantId: tenantId,
        potentialValue: 500000,
        slaDueAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      (prisma.salesLead.create as any).mockResolvedValue(mockItem);

      const result = await salesRepo.createLead(tenantId, payload);
      expect(result.id).toBe('lead-002');
    });
  });

  describe('Opportunities', () => {
    it('should create an opportunity', async () => {
      const payload = {
        id: 'opp-001',
        tenantId,
        leadId: 'lead-001',
        accountName: 'Nusantara Tech',
        ownerId: 'emp-003',
        ownerName: 'Bob',
        stage: 'QUALIFIED' as any,
        probability: 50,
        amount: 1000000,
        currency: 'IDR' as any,
        expectedCloseDate: new Date().toISOString(),
        health: 'LOW_RISK' as any,
        nextAction: 'Call back',
        lastActivityAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const mockItem = {
        ...payload,
        tenantId: tenantId,
        expectedCloseDate: new Date(),
        lastActivityAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      (prisma.salesOpportunity.create as any).mockResolvedValue(mockItem);

      const result = await salesRepo.createOpportunity(tenantId, payload);
      expect(result.id).toBe('opp-001');
    });
  });

  describe('Quotes', () => {
    it('should create a quote', async () => {
      const payload = {
        id: 'quote-001',
        tenantId,
        opportunityId: 'opp-001',
        accountName: 'Nusantara Tech',
        version: 1,
        amount: 1000000,
        discountPercent: 0,
        netAmount: 1000000,
        currency: 'IDR' as any,
        status: 'DRAFT' as any,
        validUntil: new Date().toISOString(),
        createdBy: 'emp-003',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const mockItem = {
        ...payload,
        tenantId: tenantId,
        validUntil: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      (prisma.salesQuote.create as any).mockResolvedValue(mockItem);

      const result = await salesRepo.createQuote(tenantId, payload);
      expect(result.id).toBe('quote-001');
    });
  });
});
