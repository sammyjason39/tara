import { ICustomerCreditBalance } from '../../domain/ar.interfaces';
import { Prisma } from '@prisma/client';

export interface IArCustomerCreditRepository {
  updateCreditBalance(tenant_id: string, company_id: string, customer_id: string, amount: Prisma.Decimal): Promise<void>;
  findByCustomer(tenant_id: string, company_id: string, customer_id: string): Promise<ICustomerCreditBalance | null>;
}
