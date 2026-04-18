import { Injectable } from '@nestjs/common';
import { ICustomerCreditBalance } from '../domain/ar.interfaces';
import { IArCustomerCreditRepository } from './interfaces/ar-customer-credit.repository.interface';
import { v4 as uuid } from 'uuid';
import { Prisma } from '@prisma/client';

@Injectable()
export class ArCustomerCreditMockRepository implements IArCustomerCreditRepository {
  private balances: ICustomerCreditBalance[] = [];

  async updateCreditBalance(tenant_id: string, company_id: string, customer_id: string, amount: Prisma.Decimal): Promise<void> {
    const existing = this.balances.find(b => b.tenant_id === tenant_id && b.company_id === company_id && b.customer_id === customer_id);
    if (existing) {
      existing.balance = existing.balance.plus(amount);
      existing.updated_at = new Date();
    } else {
      this.balances.push({
        id: uuid(),
        tenant_id,
        company_id,
        customer_id,
        balance: new Prisma.Decimal(amount),
        updated_at: new Date(),
      });
    }
  }

  async findByCustomer(tenant_id: string, company_id: string, customer_id: string): Promise<ICustomerCreditBalance | null> {
    return this.balances.find(b => b.tenant_id === tenant_id && b.company_id === company_id && b.customer_id === customer_id) || null;
  }
}
