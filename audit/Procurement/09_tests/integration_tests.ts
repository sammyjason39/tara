import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Procurement (Integration)', () => {
  let app: INestApplication;
  const tenantId = 'tenant-001';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Full PR to PO Workflow', () => {
    let requisitionId: string;
    let draftPoId: string;

    it('Step 1: Create Requisition', async () => {
      const response = await request(app.getHttpServer())
        .post('/procurement/requisitions')
        .set('x-tenant-id', tenantId)
        .send({
          title: 'Emergency Pack Line Repair',
          description: 'Need 12 bearings and 5 belts',
          category: 'MAINTENANCE',
          requesterDept: 'dept-eng-01',
          branchCode: 'JKT',
          amount: 5000000
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      requisitionId = response.body.data.id;
    });

    it('Step 2: Approve by HOD', async () => {
      const response = await request(app.getHttpServer())
        .put(`/procurement/requisitions/${requisitionId}/approve-requester-hod`)
        .set('x-tenant-id', tenantId);

      expect(response.status).toBe(200);
      expect(response.body.data.status).toBe('APPROVED_REQUESTER_HOD');
    });

    it('Step 3: Final Approval', async () => {
      const response = await request(app.getHttpServer())
        .put(`/procurement/requisitions/${requisitionId}/approve-final`)
        .set('x-tenant-id', tenantId)
        .send({ approver: 'FINANCE_HOD' });

      expect(response.status).toBe(200);
      expect(response.body.data.status).toBe('FINAL_APPROVED');
    });

    it('Step 4: Create Draft PO', async () => {
      const response = await request(app.getHttpServer())
        .post('/procurement/draft-pos')
        .set('x-tenant-id', tenantId)
        .send({
          requisitionId: requisitionId,
          supplierId: 'sup-ind-01',
          supplierBranchId: 'br-ind-01',
          contractType: 'SPOT',
          lineItems: [
            { sku: 'BEAR-001', quantity: 12, unitPrice: 200000 },
            { sku: 'BELT-002', quantity: 5, unitPrice: 520000 }
          ]
        });

      expect(response.status).toBe(201);
      draftPoId = response.body.data.id;
    });

    it('Step 5: Release Final PO', async () => {
      const response = await request(app.getHttpServer())
        .post('/procurement/purchase-orders/release')
        .set('x-tenant-id', tenantId)
        .send({
          requisitionId: requisitionId,
          supplierId: 'sup-ind-01',
          totalAmount: 5000000
        });

      expect(response.status).toBe(201);
      expect(response.body.data.status).toBe('released');
    });
  });

  describe('Multi-Tenancy Security', () => {
    it('Should block access to Requisition from another tenant', async () => {
      const response = await request(app.getHttpServer())
        .get('/procurement/requisitions/some-other-tenant-id')
        .set('x-tenant-id', tenantId); // Providing wrong tenant ID for the resource

      expect(response.status).toBe(404);
    });
  });
});
