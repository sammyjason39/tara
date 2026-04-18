import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../../../persistence/prisma.service';
import { IArCreditMemoRepository } from './interfaces/ar-credit-memo.repository.interface';
import { IArCreditMemo } from '../domain/ar.interfaces';

@Injectable()
export class ArCreditMemoDbRepository implements IArCreditMemoRepository {
  constructor(private readonly prisma: PrismaService | Prisma.TransactionClient) {}

  private get db(): Prisma.TransactionClient {
    return this.prisma as Prisma.TransactionClient;
  }

  async findById(tenant_id: string, company_id: string, id: string): Promise<IArCreditMemo | null> {
    const res = await this.db.finance_ar_credit_memos.findUnique({
      where: { id }
    });
    return res as unknown as IArCreditMemo;
  }

  async findAll(tenant_id: string, company_id: string, customer_id?: string): Promise<IArCreditMemo[]> {
    const list = await this.db.finance_ar_credit_memos.findMany({
      where: { tenant_id: tenant_id, customer_id: customer_id }
    });
    return list as unknown as IArCreditMemo[];
  }

  async create(tenant_id: string, company_id: string, data: any): Promise<IArCreditMemo> {
    const created = await this.db.finance_ar_credit_memos.create({
      data: {
        id: data.id || randomUUID(),
        tenant_id: tenant_id,
        customer_id: data.customer_id,
        credit_amount: new Prisma.Decimal(data.creditAmount || data.amount),
        reason: data.reason || 'Manual Credit Memo',
        created_at: new Date(),
        updated_at: new Date(),
      }
    });
    return created as unknown as IArCreditMemo;
  }
}
