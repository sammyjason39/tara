import { Test, TestingModule } from '@nestjs/testing';
import { ProcurementService } from '../src/core/procurement/procurement.service';
import { IProcurementRepository } from '../src/core/procurement/repositories/procurement.repository.interface';
import { AuditService } from '../src/shared/audit/audit.service';
import { EventBusService } from '../src/shared/events/event-bus.service';
import { PrismaService } from '../src/persistence/prisma.service';

describe('ProcurementService', () => {
  let service: ProcurementService;
  let repository: any;
  let auditService: any;
  let eventBus: any;
  let prisma: any;

  beforeEach(async () => {
    repository = {
      getSuppliers: vi.fn(),
      createSupplier: vi.fn(),
      createAuditEvent: vi.fn(),
      getRequisitions: vi.fn(),
      createRequisition: vi.fn(),
      releasePurchaseOrder: vi.fn(),
    };

    auditService = { log: vi.fn() };
    eventBus = { publish: vi.fn() };
    prisma = {
      procurementFinalPO: { update: vi.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProcurementService,
        { provide: IProcurementRepository, useValue: repository },
        { provide: AuditService, useValue: auditService },
        { provide: EventBusService, useValue: eventBus },
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<ProcurementService>(ProcurementService);
  });

  describe('createSupplier', () => {
    it('should create a supplier and log audits', async () => {
      const dto = { name: 'Test Supplier', taxId: '123', category: 'Testing', branchCode: 'HQ' };
      const created = { id: 'sup-1', ...dto };
      repository.createSupplier.mockResolvedValue(created);

      const result = await service.createSupplier('tenant-1', dto, 'user-1');

      expect(result.id).toBe('sup-1');
      expect(repository.createAuditEvent).toHaveBeenCalledWith(
        'tenant-1', 'user-1', 'supplier.created', 'SUPPLIER', 'sup-1', 'Test Supplier'
      );
      expect(auditService.log).toHaveBeenCalled();
    });
  });

  describe('releasePurchaseOrder', () => {
    it('should release PO and log audit', async () => {
      const dto = { requisitionId: 'req-1', supplierId: 'sup-1', totalAmount: 1000 };
      const po = { id: 'po-1', ...dto };
      repository.releasePurchaseOrder.mockResolvedValue(po);

      const result = await service.releasePurchaseOrder('tenant-1', dto, 'user-1');

      expect(result.id).toBe('po-1');
      expect(auditService.log).toHaveBeenCalledWith(expect.objectContaining({
        action: 'RELEASE',
        entityType: 'PURCHASE_ORDER'
      }));
    });
  });

  describe('processReceipt', () => {
    it('should update PO status and publish PO_RECEIVED event', async () => {
      const data = {
        locationId: 'loc-1',
        items: [{ sku: 'SKU-1', quantity: 10 }],
        receiptType: 'FULL' as const
      };
      
      prisma.procurementFinalPO.update.mockResolvedValue({});

      const result = await service.processReceipt('tenant-1', 'po-1', data, 'user-1');

      expect(result.success).toBe(true);
      expect(prisma.procurementFinalPO.update).toHaveBeenCalledWith({
        where: { id: 'po-1', tenantId: 'tenant-1' },
        data: { status: 'RECEIVED' }
      });
      expect(eventBus.publish).toHaveBeenCalledWith(expect.objectContaining({
        eventType: 'PO_RECEIVED',
        payload: expect.objectContaining({ finalPoId: 'po-1' })
      }));
    });
  });
});
