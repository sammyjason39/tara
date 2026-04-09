import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../persistence/prisma.service';
import { IArCreditMemoRepository } from './interfaces/ar-credit-memo.repository.interface';
import { IArCreditMemo } from '../domain/ar.interfaces';

@Injectable()
export class ArCreditMemoDbRepository implements IArCreditMemoRepository {
  constructor(private readonly prisma: PrismaService | Prisma.TransactionClient) {}

  private get db(): Prisma.TransactionClient {
    return this.prisma as Prisma.TransactionClient;
  }

  async findById(tenantId: string, companyId: string, id: string): Promise<IArCreditMemo | null> {
    const res = await this.db.arCreditMemo.findUnique({
      where: { id }
    });
    return res as unknown as IArCreditMemo;
  }

  async findAll(tenantId: string, companyId: string, customerId?: string): Promise<IArCreditMemo[]> {
    const list = await this.db.arCreditMemo.findMany({
      where: { tenantId, customerId }
    });
    return list as unknown as IArCreditMemo[];
  }

  async create(tenantId: string, companyId: string, data: any): Promise<IArCreditMemo> {
    const created = await this.db.arCreditMemo.create({
      data: {
        
        updatedAt: new Date(),
        tenantId,
        customerId: data.customerId,
        creditAmount: new Prisma.Decimal(data.creditAmount || data.amount),
        reason: data.reason || 'Manual Credit Memo',
      }
    });
    return created as unknown as IArCreditMemo;
  }
}
