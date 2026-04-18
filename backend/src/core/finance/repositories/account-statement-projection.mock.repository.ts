import { Injectable } from '@nestjs/common';
import { AccountStatementProjection } from '../domain/finance.interfaces';

@Injectable()
export class AccountStatementProjectionMockRepository {
  private projections: AccountStatementProjection[] = [];

  async save(projection: AccountStatementProjection): Promise<void> {
    this.projections.push(projection);
  }

  async findByAccount(tenant_id: string, company_id: string, accountId: string): Promise<AccountStatementProjection[]> {
    return this.projections.filter(p => p.tenant_id === tenant_id && p.accountId === accountId);
  }
}
