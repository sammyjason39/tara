import { Injectable } from '@nestjs/common';
import { IArCreditMemoRepository } from './interfaces/ar-credit-memo.repository.interface';
import { IArCreditMemo } from '../domain/ar.interfaces';
import { v4 as uuid } from 'uuid';

@Injectable()
export class ArCreditMemoMockRepository implements IArCreditMemoRepository {
  private creditMemos: IArCreditMemo[] = [];

  async create(tenant_id: string, company_id: string, data: any): Promise<IArCreditMemo> {
    const creditMemo: IArCreditMemo = {
      id: uuid(),
      tenant_id,
      company_id,
      customer_id: data.customer_id,
      creditAmount: data.creditAmount,
      reason: data.reason,
      created_at: new Date(),
      updated_at: new Date(),
    };
    this.creditMemos.push(creditMemo);
    return creditMemo;
  }

  async findAll(tenant_id: string, company_id: string, customer_id?: string): Promise<IArCreditMemo[]> {
    return this.creditMemos.filter((c: any) => c.tenant_id === tenant_id && c.company_id === company_id && (!customer_id || c.customer_id === customer_id));
  }
}
