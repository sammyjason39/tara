import { IArPayment, IArPaymentAllocation } from '../../domain/ar.interfaces';

export interface IArPaymentRepository {
  findById(tenant_id: string, company_id: string, id: string): Promise<IArPayment | null>;
  findByIdempotencyKey(tenant_id: string, company_id: string, key: string): Promise<IArPayment | null>;
  create(tenant_id: string, company_id: string, data: any): Promise<IArPayment>;
  createAllocation(tenant_id: string, company_id: string, data: any): Promise<IArPaymentAllocation>;
  findAllocationByIdempotencyKey(tenant_id: string, company_id: string, key: string): Promise<IArPaymentAllocation | null>;
  findAllocationsByInvoice(tenant_id: string, company_id: string, invoiceId: string): Promise<IArPaymentAllocation[]>;
  findAllocationsByPayment(tenant_id: string, company_id: string, paymentId: string): Promise<IArPaymentAllocation[]>;
  
  // BUG-3 FIX: Find orphaned entries for reconciliation
  findOrphanedEntries(tenant_id: string, company_id: string): Promise<any[]>;
}
