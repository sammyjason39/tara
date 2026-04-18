import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../../../persistence/prisma.service';
import { IArCustomerCreditRepository } from './interfaces/ar-customer-credit.repository.interface';
import { ICustomerCreditBalance } from '../domain/ar.interfaces';

@Injectable()
export class ArCustomerCreditDbRepository implements IArCustomerCreditRepository {
  constructor(private readonly prisma: PrismaService | Prisma.TransactionClient) {}

  private get db(): Prisma.TransactionClient {
    return this.prisma as Prisma.TransactionClient;
  }

  async findByCustomer(tenant_id: string, company_id: string, customer_id: string): Promise<ICustomerCreditBalance | null> {
    const res = await this.db.finance_ar_customer_credit_balances.findUnique({
      where: { 
        tenant_id_customer_id: { tenant_id: tenant_id, customer_id: customer_id }
      }
    });
    return res as unknown as ICustomerCreditBalance;
  }

  async updateCreditBalance(tenant_id: string, company_id: string, customer_id: string, amount: Prisma.Decimal): Promise<void> {
    await this.db.finance_ar_customer_credit_balances.upsert({
      where: { 
        tenant_id_customer_id: { tenant_id: tenant_id, customer_id: customer_id }
      },
      update: {
        balance: { increment: amount },
        updated_at: new Date(),
      },
      create: {
        id: randomUUID(),
        tenant_id: tenant_id,
        customer_id: customer_id,
        balance: amount,
        updated_at: new Date(),
      }
    });
  }

  async reset(tenant_id: string, company_id: string): Promise<void> {
    await this.db.finance_ar_customer_credit_balances.deleteMany({
      where: { tenant_id: tenant_id }
    });
  }
}
